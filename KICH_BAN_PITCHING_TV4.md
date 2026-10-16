# Kịch bản thuyết trình của Thành viên 4 (Security, Sandbox, Governance & Reliability)

TV4 thuyết trình đoạn từ **04:30 đến 06:00 (tổng 1 phút 30 giây)**, trình bày Slide 8, Slide 9 và Slide 10.
Sau đó chuyển tiếp lại cho TV1 kết luận chi phí và cùng nhóm tham gia phần hỏi đáp (07:00 – 10:00).

Mọi thông số kỹ thuật và số liệu ở đây khớp 100% với mã nguồn Terraform trong `terraform/modules/security_sandbox/`, file báo giá `G03_baogia.xlsx` và bộ test `tv4_security/test_security_sandbox.py` (9/9 PASS).

---

## Lời nói thuyết trình [04:30 – 06:00] (1 phút 30 giây)

### [04:30 – 05:00] Slide 8: Cô lập Sandbox gVisor & Bảo mật chạy code (30 giây)
> "Cảm ơn TV3. Tôi là Hưng, phụ trách Bảo mật, Sandbox và Độ tin cậy của hệ thống.
> Với ràng buộc **H3**, Agent chạy code phân tích dữ liệu trên một **Node Pool GKE Sandbox riêng biệt** cấu hình runtime **gVisor**. Tiến trình gVisor Sentry đóng vai trò nhân ảo trong user-space, đánh chặn và xử lý toàn bộ syscalls, ngăn chặn triệt để mã độc can thiệp vào kernel của máy chủ host.
> Về mạng, **NetworkPolicy chặn toàn bộ Egress Internet** và **chặn tuyệt đối IP Cloud Metadata `169.254.169.254`**, mã độc không thể rò rỉ dữ liệu hay đánh cắp service account token. Mỗi pod chỉ chạy tối đa 60 giây và **bị tiêu hủy ngay lập tức** sau khi thực thi, xóa sạch mọi dữ liệu tạm."

### [05:00 – 05:30] Slide 9: AI & Data Governance (30 giây)
> "Sang Slide 9, để thỏa mãn ràng buộc **H4 và H5**, chúng tôi thiết lập 3 lớp phòng vệ:
> Thứ nhất, **Cloud Sensitive Data Protection (DLP API)** tự động quét và che giấu PII gồm Email, Số điện thoại Việt Nam, CCCD 12 số và thẻ tín dụng trước khi gửi sang LLM và trước khi ghi log. LLM không bao giờ nhìn thấy dữ liệu định danh gốc.
> Thứ hai, hệ thống có **3 lớp chống Prompt Injection và Jailbreak**, bọc ngữ cảnh người dùng trong thẻ phân tách rõ ràng.
> Thứ ba, cơ chế **Human-in-the-loop**: với các hành động ghi hoặc gửi ra ngoài như gửi email, tạo ticket Jira hay xóa file, hệ thống **bắt buộc dừng lại để người dùng bấm xác nhận**.
> Toàn bộ sự kiện được ghi vào Cloud Logging Bucket lưu trữ **bất biến 12 tháng** phục vụ thanh tra kiểm toán."

### [05:30 – 06:00] Slide 10: HA Multi-AZ, Sao lưu & Phục hồi thảm họa (30 giây)
> "Ở Slide 10, hệ thống đáp ứng ràng buộc cứng **H7**:
> Toàn bộ kiến trúc chạy trên **3 Availability Zone tại Singapore**. Khi một zone sập, Load Balancer ngắt traffic trong 10 đến 30 giây, Cloud SQL HA tự động failover sang standby zone trong 60 giây và **RPO = 0** vì dữ liệu được ghi đồng bộ trên đĩa regional.
> Kế hoạch DR: Cloud SQL lưu backup hằng ngày và **Point-in-time Recovery giữ WAL log 7 ngày**, đưa **RPO thực tế về dưới 5 phút**, vượt xa yêu cầu 1 giờ. Khi có thảm họa vùng diện rộng, mã nguồn Terraform tự động dựng lại toàn bộ môi trường sang Jakarta với **RTO thực tế chỉ 45 phút**, thấp hơn nhiều so với cam kết 4 giờ.
> Xin mời TV1 tiếp tục phần tổng kết chi phí và đòn bẩy FinOps."

---

## Bộ câu hỏi và đáp án chất vấn dự phòng của TV4

**1. "Nếu mã độc chạy trong Python cố vượt ngục container (container breakout) thì gVisor chặn như thế nào?"**
> "Trong Docker chuẩn, container dùng chung Linux kernel với host nên nếu có lỗ hổng kernel (như Dirty COW), mã độc có thể leo thang đặc quyền. Với **gVisor runsc**, container không bao giờ nói chuyện trực tiếp với host kernel. Mọi syscall (như `open`, `read`, `fork`, `socket`) đều được nhân ảo **Sentry** viết bằng ngôn ngữ Go an toàn bộ nhớ xử lý trong user-space. Sentry từ chối hoàn toàn các syscall nguy hiểm như `ptrace`, `setns`, `init_module`, và không hỗ trợ raw socket. Do đó, dù mã độc có quyền root bên trong sandbox cũng không thể chạm tới host kernel."

**2. "Vì sao cần chặn địa chỉ `169.254.169.254` trong NetworkPolicy?"**
> "Đây là địa chỉ Instance Metadata Service (IMDS) của GCP. Mặc định các máy ảo GCP dùng endpoint này để cấp Access Token cho Service Account của node. Nếu kẻ tấn công inject mã Python vào sandbox gọi `curl http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token`, chúng có thể đánh cắp token của cluster để gọi Google Cloud API. Chúng tôi chặn bằng 2 lớp: thứ nhất là NetworkPolicy DROP toàn bộ traffic tới `169.254.169.254/32`; thứ hai là bật Workload Identity và `disable-legacy-endpoints = true` trên node pool."

**3. "Cloud DLP quét PII có làm tăng độ trễ và ảnh hưởng SLA p95 TTFT $\le$ 3 giây (H6) không?"**
> "Cloud DLP API của Google tại Singapore xử lý một đoạn text prompt 1.000 token chỉ mất từ 15 đến 35 ms. Trong kiến trúc streaming, chúng tôi quét song song: ở chiều Input, DLP quét kiểm tra PII trước khi gửi vào LLM (thêm tối đa ~30 ms, nằm hoàn toàn trong ngân sách 3.000 ms của TTFT). Ở chiều Output, LLM stream token về client, chỉ quét qua guardrail regex nhẹ, và luồng ghi log lưu trữ mới gửi bản đầy đủ qua DLP asynchronously nên không cản trở trải nghiệm người dùng."

**4. "Làm sao đảm bảo RTO $\le$ 4 giờ khi toàn bộ Region Singapore bị ngắt kết nối?"**
> "Hệ thống có 3 cấp phục hồi:
> 1. *Mất 1 Zone:* Tự động failover trong 60 giây, người dùng chỉ cần gửi lại request (RTO < 2 phút).
> 2. *Lỗi dữ liệu / Corrupted Data:* Dùng PITR của Cloud SQL để rollback về thời điểm trước sự cố với độ chính xác đến từng giây (RTO < 15 phút, RPO < 5 phút).
> 3. *Thảm họa sập toàn Region Singapore:* Bản backup Cloud SQL và GCS được cấu hình replicate tự động sang `asia-southeast2` (Jakarta). Toàn bộ hạ tầng mạng, GKE, IAM được mã hóa 100% trong 5 module Terraform. Đội SRE chỉ cần chạy `terraform apply -var="region=asia-southeast2"` (mất khoảng 25 phút để dựng cụm GKE và DB mới), sau đó restore dữ liệu (20 phút). Tổng RTO là 45 phút, đáp ứng vượt chuẩn RTO 4 giờ của đề bài."

**5. "Chi phí 2.445,86 USD/tháng của phần TV4 gồm những gì?"**
> "Phần TV4 gồm 7 component:
> 1. `authn`: 2.000,00 USD (Cloud Identity Premium 2.000 user $\times$ 1 USD có MFA).
> 2. `sandbox`: 228,80 USD (2 node c2-standard-4 giờ HC $\times$ 2 AZ $\times$ 220h + 1 node staging Spot).
> 3. `governance`: 100,00 USD (Cloud DLP quét 100 GB prompt/tháng).
> 4. `backup_dr`: 59,00 USD (Backup Cloud SQL tự động + replicate cross-region).
> 5. `monitoring`: 40,00 USD (Cloud Logging lưu 12 tháng + Cloud Monitoring).
> 6. `secrets_kms`: 18,06 USD (KMS key rotation + Secret Manager lưu refresh tokens).
> 7. `authz`: 0,00 USD (Nằm trong pod compute của GKE).
> Tổng cộng 2.445,86 USD/tháng (~1,22 USD/DAU), tối ưu và minh bạch tới từng SKU."
