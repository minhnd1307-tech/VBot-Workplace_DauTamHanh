# Kịch bản thuyết trình của Thành viên 1 (Lead / Platform)

TV1 nói 2 đoạn, tổng 2 phút 15 giây: mở đầu từ 00:00 đến 01:15 và kết luận từ 06:00 đến 07:00. Sau đó là phần hỏi đáp cả nhóm.

Mọi con số ở đây khớp với `G03_baogia.xlsx` (validator ĐẠT) và bảng sizing của TV2.

---

## Đoạn 1 [00:00 – 01:15]: mở đầu, Slide 2 và Slide 3

### [00:00 – 00:15] Giới thiệu bài toán (15 giây)
> "Kính chào Hội đồng. Nhóm G03 thiết kế VBot Workplace, trợ lý AI cho 2.000 nhân viên văn phòng dùng mỗi ngày. VBot làm chat, email, tài liệu, chạy agent dự án và sinh ảnh, kết nối Google Workspace, Microsoft 365, Notion, Jira, Confluence. Toàn bộ chạy trên **một cloud là Google Cloud, region Singapore**, vì đây là region gần Việt Nam nhất có đủ 3 zone và có Gemini ngay trong region."

### [00:15 – 00:50] Slide 2: Kiến trúc tổng thể (35 giây)
> "Người dùng đăng nhập SSO của tập đoàn, có MFA. Request đi qua **Cloud Armor WAF** rồi **Global Load Balancer**, vào một cụm **GKE private trải 3 zone**. Trong cụm có Web/API, Orchestrator, Policy & ACL, LLM Gateway, Guardrail cùng DLP, connector worker, và một **node pool sandbox gVisor tách riêng**.
> Dữ liệu nằm ở **Cloud SQL HA có pgvector**, **Redis HA** và Cloud Storage chia workspace theo từng user, tất cả chỉ có IP private. Gateway gọi **Vertex AI qua Private Google Access**, không đi ra Internet. Đường duy nhất ra ngoài là **Cloud NAT**, để connector gọi SaaS.
> LB, gateway và database đều chạy qua nhiều zone, nên **không có điểm lỗi đơn**."

### [00:50 – 01:15] Slide 3: Luồng một request, và Terraform (25 giây)
> "Một request đi qua 12 bước như trên hình. Ba điểm quan trọng: **RAG lọc theo ACL gốc của tài liệu**, connector dùng **OAuth token của chính user** lấy từ Secret Manager, và **mọi hành động ghi ra ngoài phải được người dùng xác nhận**.
> Toàn bộ hạ tầng này có thật trong **mã Terraform gồm 5 module** và chạy `terraform validate` hợp lệ. Mời TV2 trình bày sizing và chiến lược model."

---

## Đoạn 2 [06:00 – 07:00]: Slide 11, chi phí và kết luận

### [06:00 – 06:35] Slide 11: Tổng chi phí (35 giây)
> "Tổng chi phí là **11.260,64 USD mỗi tháng, tức 5,63 USD cho mỗi người dùng**. Con số này khớp dòng TOTAL trong file báo giá và đã qua công cụ kiểm tra.
> Các khoản lớn nhất là nhân sự vận hành 3.500 USD, token LLM 3.369 USD, SSO kèm MFA 2.000 USD, và cơ sở dữ liệu 546 USD. Riêng phần hạ tầng compute, mạng và LB chỉ khoảng **420 USD**.
> Đòn bẩy tiết kiệm: routing 85% tác vụ sang Gemini Flash và Context Caching giảm khoảng **3.150 USD**. Phía hạ tầng, autoscale theo giờ hành chính, cam kết 1 năm cho node nền và staging chạy Spot trên chung cluster giảm thêm **469 USD**. Tầng dữ liệu tối ưu lifecycle Nearline và pgvector tiết kiệm thêm **323 USD**. Tổng cộng tiết kiệm khoảng **3.940 USD mỗi tháng**."

### [06:35 – 07:00] Mở rộng và kết luận (25 giây)
> "Khi DAU tăng gấp đôi, phần cố định gồm GKE, LB, WAF và nhân sự giữ nguyên. Node app lúc cao điểm tăng từ 4 lên khoảng 7, phần hạ tầng tăng khoảng **210 USD**. Khoản tăng lớn nhất là token, tăng tuyến tính, và được chặn bằng quota theo user cùng cảnh báo ngân sách.
> VBot Workplace đạt cả 8 ràng buộc H1 đến H8, chi phí minh bạch tới từng SKU, và có thể triển khai ngay từ mã Terraform. Xin cảm ơn Hội đồng, nhóm sẵn sàng trả lời câu hỏi."

---

## Bộ câu hỏi và đáp án dự phòng của TV1

**1. "Một AZ mất điện lúc 10 giờ sáng. Người dùng thấy gì?"**
> Giờ hành chính có 4 node app trải đủ 3 zone. Khi zone a sập, LB phát hiện qua health check và ngừng gửi traffic vào pod ở zone a trong khoảng 10–30 giây. Pod ở zone b và c tiếp tục phục vụ, autoscaler bật bù node trong 2–4 phút. Cloud SQL HA chuyển sang standby ở zone khác trong khoảng 60 giây, và vì dữ liệu được ghi đồng bộ trên regional disk nên **không mất dữ liệu đã commit**. Redis STANDARD_HA cũng tự failover, nhưng có thể mất vài giây dữ liệu cache gần nhất, không ảnh hưởng gì vì cache không phải nguồn dữ liệu gốc. Người dùng có thể thấy câu trả lời đang stream bị ngắt, bấm gửi lại là được. Thời gian gián đoạn tính bằng phút, thấp hơn rất nhiều so với RTO 4 giờ và RPO 1 giờ.

**2. "Ngoài giờ hành chính hệ thống scale xuống tới đâu?"**
> Node pool app co về **1 node** (cấu hình `total_min_node_count = 1`). CronJob `k8s/app-office-hours-scaler.yaml` hạ replica lúc 18:15 và nâng lại lúc 07:45 trước giờ làm, nên lúc 8 giờ đã có đủ 4 node ở 3 zone. Staging Spot scale về 0. SLA 99,5% chỉ áp trong giờ hành chính nên ban đêm chạy 1 zone là chấp nhận được.

**3. "Egress, NAT, private endpoint và WAF tốn bao nhiêu?"**
> Egress tới người dùng 500 GB × 0,12 = 60 USD. Cloud NAT tổng khoảng 21 USD (theo VM-giờ, IP, và 300 GB dữ liệu). Private Google Access tới Vertex AI không mất phí và không đi qua NAT. Cloud Armor 20,25 USD. Toàn bộ phần network là 103,19 USD.

**4. "Sao không dùng 2 Cloud NAT gateway cho HA?"**
> Cloud NAT là dịch vụ managed của GCP, chạy phân tán trên mặt phẳng điều khiển của region, không phải một máy ảo. Bản thân nó đã HA qua các zone, nên **1 gateway là đủ** và không có điểm lỗi đơn.

**5. "Vì sao chọn GKE mà không phải Cloud Run?"**
> Có 3 lý do. Sandbox cần node pool gVisor riêng có NetworkPolicy chặn egress, và việc này dễ kiểm soát trên GKE. Agent chạy nền tới 10 phút. Ở 3,5 RPS lúc cao điểm, 4 node e2-standard-4 cho chi phí ổn định, có thể mua cam kết 1 năm. Cloud Run hợp cho tải thất thường, còn tải giờ hành chính ở đây đều và đoán trước được.

**6. "Vì sao chỉ 1 FTE vận hành, và chọn Standard Support?"**
> Hạ tầng hầu hết là dịch vụ managed (GKE, Cloud SQL, Redis, LB) và được dựng hoàn toàn bằng Terraform, nên 1 SRE/MLOps làm việc giờ hành chính kiêm on-call là đủ. Standard Support tính 3% chi phí cloud, tức 216,19 USD. Lên Enhanced Support (10%) sẽ thêm khoảng 500 USD mà không cải thiện RTO 4 giờ, vì failover đã tự động.

**7. "Giá trong báo giá lấy ở đâu?"**
> Từ Cloud Billing Catalog API của Google, giá niêm yết công khai ngày 2026-10-16, region asia-southeast1. Mỗi dòng ghi SKU ID, và sheet BangChung có link tới trang giá chính thức. Không dùng free tier hay credit nào.
