# Nội dung Slide 8, 9, 10 (Thành viên 4)

Ảnh sơ đồ 16:9 được sinh trực tiếp bằng `slides/gen_tv4_diagrams.js` (dùng thư viện `@resvg/resvg-js`).

| Slide | Tên slide | File hình ảnh | Component liên quan |
|---|---|---|---|
| **Slide 8** | Cơ chế Cô lập Sandbox (gVisor) & Môi trường Chạy Code | `slide08_sandbox_gvisor.png` | `sandbox`, `compute` |
| **Slide 9** | AI & Data Governance (Cloud DLP, Prompt Injection, HITL) | `slide09_governance_dlp.png` | `governance`, `monitoring` |
| **Slide 10**| Tính sẵn sàng cao (HA Multi-AZ), Backup & DR (RTO/RPO) | `slide10_ha_backup_dr.png` | `backup_dr`, `database` |

Lời nói pitching chi tiết khớp khung giờ **04:30 – 06:00** nằm ở [../KICH_BAN_PITCHING_TV4.md](../KICH_BAN_PITCHING_TV4.md).

---

## Slide 8: Cơ chế Cô lập Sandbox (gVisor) & Bảo mật Môi trường Chạy Code

### 1. Thông tin trình chiếu
* **Tiêu đề:** Cô lập Sandbox chạy Code bằng gVisor (H3) & NetworkPolicy chặn Egress
* **Mục tiêu đáp ứng:** Ràng buộc cứng **H3** (MicroVM/gVisor, không có quyền mạng bên ngoài, tự động tiêu hủy sau phiên thực thi).
* **Hình minh họa:** `slide08_sandbox_gvisor.png`

### 2. Các điểm kỹ thuật cốt lõi
1. **Kiến trúc gVisor runsc (Kernel Barrier):**
   * Code Python do Agent sinh ra chạy trong pod chuyên dụng trên Node Pool `vbot-prod-sandbox-pool` (c2-standard-4).
   * Gán taint `sandbox.gke.io/runtime=gvisor:NoSchedule` ngăn các pod thông thường chạy nhầm.
   * Tiến trình **gVisor Sentry** (viết bằng Go) đóng vai trò nhân Linux ảo trong user-space, đánh chặn và xử lý trực tiếp toàn bộ syscalls (chặn `ptrace`, `raw socket`, `setns`, `chroot` breakout, `init_module`). Host kernel không bao giờ bị phơi bày trực tiếp.
2. **NetworkPolicy cách ly mạng tuyệt đối:**
   * **Chặn toàn bộ Egress Internet (`0.0.0.0/0`):** Sandbox pod hoàn toàn không có đường ra ngoài Internet, ngăn ngừa 100% nguy cơ rò rỉ dữ liệu (Exfiltration).
   * **Chặn Endpoint GCP Metadata (`169.254.169.254/32`):** Mã độc không thể leo thang đặc quyền để lấy Access Token của Node Service Account.
   * Chỉ mở Ingress port 8080 từ namespace `vbot-core` (Agent Coordinator) và Egress port 53 tới `kube-dns`.
3. **Vòng đời Ephemeral & Giới hạn tài nguyên:**
   * Timeout tối đa 60 giây cho mỗi lượt chạy; CPU 1 vCPU, RAM 2 GB.
   * Sử dụng đĩa tạm `emptyDir { medium: "Memory" }` (tối đa 500 MB).
   * Pod bị tiêu hủy (`FORCE DESTROY`) ngay sau khi chạy xong hoặc chạm timeout, xóa sạch 100% dữ liệu tạm, không lưu vết trên đĩa.

---

## Slide 9: AI & Data Governance (Cloud DLP, Chống Prompt Injection & HITL)

### 1. Thông tin trình chiếu
* **Tiêu đề:** AI & Data Governance (H4, H5) · Cloud DLP, Chống Prompt Injection & Human-in-the-Loop
* **Mục tiêu đáp ứng:** Ràng buộc cứng **H4** (AI Governance, chống Prompt Injection, xác nhận người dùng) và **H5** (Data Governance, DLP che PII, Audit Log 12 tháng).
* **Hình minh họa:** `slide09_governance_dlp.png`

### 2. Các điểm kỹ thuật cốt lõi
1. **Ba lớp phòng vệ Prompt Injection (H4):**
   * **Lớp 1 (Guardrail & Classifier):** Nhận diện mẫu tấn công jailbreak ("Ignore previous instructions", "DAN", Roleplay bypass, Delimiter collision). Tự động chặn và ghi cảnh báo.
   * **Lớp 2 (Prompt Hardening):** Đóng gói ngữ cảnh người dùng trong thẻ XML phân tách (`<user_input>`), system prompt bất biến nghiêm cấm rò rỉ chỉ dẫn hệ thống.
   * **Lớp 3 (Output Guardrail):** Quét response trước khi stream trả về client để ngăn chặn rò rỉ secret key hoặc system prompt exfiltration.
2. **Cloud Sensitive Data Protection (Cloud DLP API - H5):**
   * Tự động quét và ẩn (masking) thông tin PII trước khi gửi prompt sang LLM và trước khi lưu log.
   * Cấu hình Inspect Template trong Terraform: Email cá nhân, Số điện thoại Việt Nam (03, 05, 07, 08, 09), Căn cước công dân (12 chữ số) và Số thẻ tín dụng (Visa/Mastercard).
   * LLM chỉ nhận dữ liệu đã che `[MASKED_PII]`; token mapping được hoàn trả an toàn ở tầng API Gateway.
3. **Cơ chế Human-in-the-Loop (HITL - H4):**
   * Tác vụ **ĐỌC** (RAG, tra cứu Jira, Notion): Tự động thực thi.
   * Tác vụ **GHI/GỬI RA NGOÀI** (Gửi email Outlook, tạo Issue Jira, xóa tài liệu Workspace): Bắt buộc hiển thị popup tóm tắt hành động và yêu cầu người dùng xác nhận trực tiếp trước khi gửi API.
4. **Audit Logging 12 tháng (H5):**
   * Toàn bộ sự kiện xác thực, phân quyền, câu lệnh, kết quả guardrail lưu tại Cloud Logging Bucket trong **365 ngày**.
   * Bật khóa bất biến (Immutable Bucket Retention / WORM) chống sửa/xóa log.

---

## Slide 10: Tính sẵn sàng cao (HA Multi-AZ), Backup & DR (RTO/RPO)

### 1. Thông tin trình chiếu
* **Tiêu đề:** Tính sẵn sàng cao (HA Multi-AZ) & Kế hoạch Phục hồi Thảm họa (RTO ≤ 4h, RPO ≤ 1h)
* **Mục tiêu đáp ứng:** Ràng buộc cứng **H7** (Multi-AZ, Uptime 99.5%, Backup/DR: RTO $\le$ 4 giờ, RPO $\le$ 1 giờ).
* **Hình minh họa:** `slide10_ha_backup_dr.png`

### 2. Các điểm kỹ thuật cốt lõi
1. **Kiến trúc Multi-AZ không điểm lỗi đơn (No SPOF):**
   * Triển khai trải rộng 3 Availability Zones (`asia-southeast1-a/b/c`).
   * **Global Application Load Balancer:** Anycast IP, tự động ngắt traffic vào node lỗi sau 10–30 giây.
   * **GKE Regional Cluster:** 4 node app trải 3 AZ; khi 1 AZ sập, pod ở 2 AZ còn lại gánh tải, Autoscaler bù node trong 2–4 phút.
   * **Cloud SQL Regional HA:** Sao chép đồng bộ mức block sang standby zone khác. Tự động failover trong 60 giây, **RPO = 0** đối với transaction đã commit.
   * **Redis Standard HA:** Tự động failover sang replica trong vòng 30 giây.
2. **Chiến lược Sao lưu & Phục hồi thảm họa (Backup & DR):**
   * **Automated Daily Backup:** Thực hiện lúc 02:00 sáng, lưu trữ 14 bản sao lưu gần nhất.
   * **Point-In-Time Recovery (PITR):** Lưu giữ Transaction WAL log liên tục 7 ngày, cho phép khôi phục trạng thái database về bất kỳ giây nào trong 7 ngày qua $\to$ **RPO thực tế $\le$ 5 phút** (vượt xa chuẩn đề bài $\le$ 1 giờ).
   * **Kịch bản Thảm họa Vùng (Regional Disaster):** Sao lưu cross-region sang `asia-southeast2` (Jakarta). Toàn bộ hạ tầng được tự động hóa 100% bằng Terraform IaC, dựng lại toàn cụm trong 25 phút + khôi phục DB 20 phút $\to$ **RTO thực tế = 45 phút** (vượt xa chuẩn đề bài $\le$ 4 giờ).
