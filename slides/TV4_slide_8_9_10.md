# Nội dung Slide 8, 9, 10 (Thành viên 4 - SecOps, Sandbox & Governance)

Tỷ lệ chuẩn 16:9. Kịch bản thuyết trình chi tiết tương ứng nằm ở [../KICH_BAN_PITCHING_TV4.md](../KICH_BAN_PITCHING_TV4.md).

---

## Slide 8: Cơ chế Cô lập Sandbox gVisor & Môi trường Chạy Code (Ràng buộc H3)

**Tiêu đề:** Sandbox cho Agent: Cô Lập Kernel Tuyệt Đối Bằng gVisor & Chặn Egress

### 3 Điểm nhấn bảo mật:

#### 1. GKE Sandbox với Runtime gVisor (H3):
* Container chạy code của Agent được cô lập ở tầng user-space kernel riêng biệt thông qua gVisor (Sentry).
* Tách biệt hoàn toàn với Host OS của node máy chủ, triệt tiêu nguy cơ container-escape và tấn công hạt nhân Linux.
* Khai báo IaC: `sandbox_config { sandbox_type = "gvisor" }` trên Node Pool riêng biệt `c2-standard-4`.

#### 2. NetworkPolicy Chặn Tuyệt Đối Egress:
* Pod sandbox mặc định **bị chặn 100% Egress ra Internet**.
* Chặn endpoint nhạy cảm Cloud Metadata (`169.254.169.254`) ngăn chặn đánh cắp Service Account Token.
* Chỉ cho phép giao tiếp nội bộ một chiều với điều phối viên (Agent Orchestrator) qua port nội bộ xác định.

#### 3. Vòng đời & Giới hạn Tài nguyên Ngặt nghèo:
* Giới hạn tài nguyên nghiêm ngặt: 1 vCPU, 2 GB RAM, tối đa 60 giây thời gian thực thi cho mỗi script.
* Sandbox tự động hủy (ephemeral destroy) ngay sau khi thực thi xong tác vụ.

---

## Slide 9: AI & Data Governance (Ràng buộc H4, H5)

**Tiêu đề:** Quản Trị AI & Dữ Liệu: Che Giấu PII, Chống Prompt Injection & Audit 12 Tháng

### 3 Trụ cột quản trị:

#### 1. Bảo vệ Dữ liệu & Che PII qua Cloud DLP (H5):
* Tích hợp Cloud Sensitive Data Protection (DLP API) tự động quét và che giấu PII (Số CCCD, Email, Số điện thoại, Thẻ tín dụng) trước khi payload rời khỏi mạng nội bộ.
* Mã hóa kép dữ liệu at-rest bằng Google Cloud KMS kết hợp Secret Manager lưu trữ an toàn OAuth Refresh Tokens.

#### 2. AI Guardrails & Human-in-the-loop (H4):
* Tách bạch chỉ dẫn hệ thống (System Prompt) và nội dung không tin cậy lấy từ connector (Email, Web, Tài liệu) để vô hiệu hóa tấn công **Indirect Prompt Injection**.
* Bắt buộc có bước xác nhận của người dùng (**Human-in-the-loop confirmation**) trước các hành động nhạy cảm: gửi email ra ngoài, tạo/sửa ticket Jira, xóa tài liệu.

#### 3. Cổng Đánh Giá Eval Gate & Audit Log 12 Tháng (H5):
* Lưu trữ toàn bộ Audit Log truy cập và lịch sử tương tác của Agent trong đúng **365 ngày** (12 tháng) trên Cloud Logging Bucket chuyên dụng (`retention_days = 365`).
* Cam kết nhà cung cấp Cloud (Google Vertex AI) không sử dụng dữ liệu doanh nghiệp để huấn luyện mô hình.

---

## Slide 10: Tính Sẵn Sàng Cao (HA), Kế Hoạch Sao Lưu & DR (Ràng buộc H7)

**Tiêu đề:** Độ Sẵn Sàng 99.5% & Khôi Phục Thảm Họa: RTO $\le$ 4 Giờ, RPO $\le$ 1 Giờ

### 3 Trụ cột độ tin cậy:

#### 1. Kiến trúc Đa Vùng Khả Dụng (Multi-AZ 3 Zones):
* Không có điểm lỗi đơn (No SPOF): Toàn bộ hạ tầng trải dài trên 3 Zone (`a`, `b`, `c`) của region `asia-southeast1`.
* Cloud SQL Regional tự động failover sang standby node khác zone trong vòng 60 giây.
* Memorystore Redis chế độ `STANDARD_HA` với bản sao đồng bộ đa vùng.

#### 2. Chiến lược Backup Tự động & PITR:
* Sao lưu tự động hàng ngày (Automated Daily Backup) cho Cloud SQL, kích hoạt Point-in-Time Recovery (PITR) cho phép khôi phục về từng giây trong vòng 7 ngày gần nhất.
* Cross-region snapshot tự động sao lưu dữ liệu sang region dự phòng `asia-southeast2` (Jakarta).

#### 3. Cam kết Mục tiêu RTO / RPO & Diễn tập Khôi phục:
* **RTO (Recovery Time Objective):** $\le$ **4 giờ** (thực tế tự động phục hồi trong < 30 phút).
* **RPO (Recovery Point Objective):** $\le$ **1 giờ** (thực tế dữ liệu PITR mất mát tối đa < 5 phút).
* Quy trình diễn tập khôi phục thảm họa định kỳ 6 tháng/lần trên môi trường Staging.
