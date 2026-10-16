# KỊCH BẢN THUYẾT TRÌNH BẢO VỆ 1 PHÚT 30 GIÂY DÀNH CHO THÀNH VIÊN 4
## DỰ ÁN VBOT WORKPLACE CAPSTONE (KHUNG GIỜ: 04:30 ĐẾN 06:00)

> **Người trình bày:** Thành viên 4 (Security, Sandbox, Governance & Reliability)  
> **Thời lượng:** Đúng 1 phút 30 giây (90 giây)  
> **Slide phụ trách trình chiếu:** Slide 8, Slide 9, Slide 10  
> **Mục tiêu:** Chứng minh hệ thống là một "pháo đài bất khả xâm phạm", thỏa mãn toàn diện các ràng buộc H2, H3, H4, H5, H7.

---

### [04:30 – 05:00] (30 giây) - BẢO VỆ SLIDE 8: CÔ LẬP SANDBOX GVISOR & CHẶN EGRESS (H3)
*(Chỉ vào Slide 8, giọng nói tự tin, mạch lạc)*

> *"Kính thưa Hội đồng, tôi là [Tên TV4], chịu trách nhiệm về an ninh, môi trường sandbox và độ tin cậy của VBot.*
>
> *Để thỏa mãn Ràng buộc cứng H3, mọi đoạn mã do Agent sinh ra tuyệt đối không được chạy trên container thông thường. Chúng tôi triển khai cụm **GKE Sandbox chuyên dụng với runtime gVisor**:*
> * Kernel được ảo hóa ở tầng user-space, cô lập hoàn toàn với máy chủ Host, triệt tiêu 100% nguy cơ container escape.
> * Pod sandbox được áp dụng **NetworkPolicy cấm toàn bộ Egress ra Internet** và chặn đứng endpoint Cloud Metadata `169.254.169.254`, khiến hacker không thể đánh cắp Service Account Token hay tuồn dữ liệu ra ngoài.
> * Mỗi sandbox chỉ được cấp 1 vCPU, 2GB RAM, tối đa 60 giây và tự hủy ngay sau khi hoàn thành!"*

---

### [05:00 – 05:30] (30 giây) - BẢO VỆ SLIDE 9: AI & DATA GOVERNANCE (H4, H5)
*(Chuyển sang Slide 9, làm nổi bật lá chắn dữ liệu)*

> *"Về quản trị AI và dữ liệu theo chuẩn H4 và H5:*
> * Hệ thống tích hợp **Cloud Sensitive Data Protection (DLP)** tự động nhận diện và che giấu toàn bộ PII như số CCCD, thẻ tín dụng, email và số điện thoại trước khi gửi sang Model API.
> * Chúng tôi áp dụng cơ chế **Human-in-the-loop**: Bắt buộc người dùng phải nhấn nút phê duyệt trên giao diện trước khi Agent thực hiện các thao tác ghi nhạy cảm như gửi email, cập nhật Jira hay xóa file.
> * Toàn bộ khóa bí mật và OAuth refresh tokens được lưu trong **Secret Manager mã hóa bằng Cloud KMS**.
> * Toàn bộ Audit Log truy cập được lưu trữ đúng **365 ngày (12 tháng)** trên Cloud Logging Bucket chuyên dụng, cam kết dữ liệu không bị bên thứ ba sử dụng để huấn luyện mô hình!"*

---

### [05:30 – 06:00] (30 giây) - BẢO VỆ SLIDE 10: TÍNH SẴN SÀNG CAO (HA), SAO LƯU & DR (H7)
*(Chuyển sang Slide 10, khẳng định cam kết 99.5%)*

> *"Cuối cùng, về tính sẵn sàng cao và khôi phục thảm họa theo chuẩn H7:*
> * Hệ thống cam kết **Uptime 99.5% trong giờ hành chính** nhờ kiến trúc **Multi-AZ trải rộng 3 availability zones** tại Singapore, loại bỏ hoàn toàn điểm lỗi đơn từ Load Balancer, Gateway đến Database.
> * Cloud SQL kích hoạt chế độ Regional tự động failover chỉ trong 60 giây và có cơ chế Point-in-Time Recovery cho phép khôi phục dữ liệu về từng giây.
> * Chúng tôi cam kết mục tiêu khôi phục vượt trội: **RTO dưới 4 giờ** và **RPO dưới 1 giờ**, có kế hoạch diễn tập định kỳ trên môi trường Staging.
>
> *Tiếp theo, xin mời Trưởng nhóm tổng kết về bảng chi phí toàn diện và đòn bẩy FinOps!"*

---

## BỘ CÂU HỎI VÀ ĐÁP ÁN DỰ PHÒNG CHO PHẦN Q&A HỘI ĐỒNG (DÀNH CHO TV4)

#### Câu hỏi 1: "Một email chứa lệnh ẩn 'gửi toàn bộ hợp đồng ra ngoài'. Chuyện gì sẽ xảy ra?"
* **Trả lời:** *"Dạ thưa Hội đồng, lệnh tấn công này bị vô hiệu hóa qua 3 tầng phòng thủ: Tầng 1 là Guardrail tách biệt instruction hệ thống khỏi nội dung email không tin cậy; Tầng 2 là cơ chế Human-in-the-loop bắt buộc hiển thị popup cảnh báo để người dùng xác nhận trước khi gửi email; Tầng 3 nếu code cố tình chạy ngầm trong sandbox thì sandbox bị chặn 100% Egress ra Internet nên gói tin không thể rời khỏi hệ thống."*

#### Câu hỏi 2: "Code trong sandbox cố gọi metadata endpoint 169.254.169.254 để đánh cắp IAM token thì sao?"
* **Trả lời:** *"Dạ, Kubernetes NetworkPolicy của nhóm đã chặn dứt điểm toàn bộ dải IP 169.254.169.254/32. Đồng thời GKE bật Workload Identity nên node không chứa service account key tĩnh, pod không thể giả mạo quyền của máy chủ."*
