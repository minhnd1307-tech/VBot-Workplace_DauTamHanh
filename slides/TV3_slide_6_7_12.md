# Nội dung Slide 6, 7, 12 (phần dữ liệu) – Thành viên 3

Ảnh sơ đồ chèn thẳng vào slide 16:9:

- Slide 6: `slide06_connectors_oauth.png` (hoặc `.svg`)
- Slide 7: `slide07_workspace_du_lieu.png` (hoặc `.svg`)

Muốn sửa chữ hoặc hộp thì sửa `gen_tv3_diagrams.js` rồi chạy `npm install && node gen_tv3_diagrams.js`.

---

## Slide 6: Connectors SaaS và OAuth ủy nhiệm

**Tiêu đề:** Connectors SaaS: agent hành động bằng quyền của chính người dùng

**Hình:** `slide06_connectors_oauth.png`, chiếm gần hết slide.

**3 ý chính:**
1. Không có service account đọc toàn tập đoàn. Mỗi người tự bấm "Kết nối", đồng ý từng scope. Refresh token mã hóa CMEK trong Secret Manager. Chỉ `connector-gateway` giải mã được, và chỉ trả token cho đúng chủ sở hữu theo `user_id` của phiên SSO (H2).
2. Hai chế độ. Tài liệu (Drive, SharePoint, Confluence, Notion) được **đồng bộ trước vào index** kèm ACL gốc, cập nhật theo webhook + delta sync 15 phút. Email, lịch, Jira được **gọi trực tiếp** khi cần để luôn có dữ liệu mới. Mọi hành động ghi đều chờ người dùng xác nhận (H4).
3. Scope tối thiểu theo từng SaaS, rate limit theo user, Cloud Tasks backoff khi gặp HTTP 429. Chi phí connectors chỉ **1,75 USD/tháng** vì phí API đã nằm trong license SaaS, còn worker và egress đã tính trong compute và network.

**Lời nói (khoảng 40 giây):**
> Agent của VBot không có quyền gì riêng. Nó chỉ mượn quyền của người đang chat. Lần đầu dùng, người dùng bấm kết nối Google hay Microsoft và tự đồng ý từng scope. Ví dụ với Gmail chúng em chỉ xin quyền đọc và soạn nháp. Gửi thư là hành động ghi, nên phải chờ người dùng bấm xác nhận. Refresh token được mã hóa bằng KMS và cất trong Secret Manager. Token được tra theo user ID của phiên SSO, không theo tham số do LLM sinh ra, nên prompt injection không thể bảo agent "lấy token của sếp". Với tài liệu, chúng em đồng bộ trước vào index và mang theo danh sách quyền gốc. Khi quyền bị thu hồi ở SharePoint, webhook cập nhật ACL và tài liệu biến mất khỏi kết quả ngay. Với email và Jira, chúng em gọi API trực tiếp để dữ liệu luôn mới.

---

## Slide 7: Workspace riêng và kiến trúc dữ liệu

**Tiêu đề:** Workspace riêng từng người: cô lập ở cả 3 tầng lưu trữ

**Hình:** `slide07_workspace_du_lieu.png`

**3 ý chính:**
1. **Cloud SQL PostgreSQL 16 Regional HA + pgvector.** Một engine lo cả dữ liệu quan hệ lẫn vector. Row-Level Security lọc theo `user_id` và ACL **ngay trong truy vấn ANN**, nên kết quả không bị rò qua top-k hay qua cache.
2. **Cloud Storage** dùng 1 bucket, mỗi user một prefix `user-workspaces/{uid}/`, bật UBLA và CMEK. Chỉ `workspace-svc` có IAM trên bucket. Sandbox chỉ nhận token downscoped cho đúng prefix của user, hết hạn sau 15 phút. Lifecycle chuyển Standard → Nearline (90 ngày) → Coldline (365 ngày).
3. **Đã chứng minh bằng kiểm thử chạy thật** (PostgreSQL 16 + pgvector 0.8): 7/7 PASS. Bob dùng đúng vector tài liệu riêng của Alice vẫn nhận 0 kết quả.

**Lời nói (khoảng 40 giây):**
> Câu hội đồng hay hỏi nhất là agent của A có đọc được file của B không. Chúng em chặn ở cả ba tầng. Ở database, mỗi request đặt user ID và nhóm của người gọi vào transaction. Row-Level Security của PostgreSQL lọc lịch sử chat, bộ nhớ, và cả kết quả tìm kiếm vector theo quyền gốc của tài liệu. Ở Cloud Storage, chỉ một service có quyền trên bucket. Sandbox chỉ nhận token rút gọn, chỉ đọc được thư mục của đúng người đó trong 15 phút. Chúng em đã viết kiểm thử chạy trên PostgreSQL với pgvector thật. Bob cố dùng đúng vector của tài liệu riêng của Alice vẫn nhận 0 kết quả. Ghi trộm vào dữ liệu của Alice bị chặn, và vượt quota 10 GB cũng bị chặn.

---

## Slide 12 (phần dữ liệu): Khi DAU tăng gấp đôi (2.000 → 4.000)

**Bảng chèn vào slide:**

| Thành phần | 2.000 DAU | 4.000 DAU | Cách mở rộng |
|---|---:|---:|---|
| Cloud SQL HA | 4 vCPU / 16 GB, 200 GB | 8 vCPU / 32 GB, 400 GB | Nâng tier trong cửa sổ bảo trì (failover < 1 phút), ổ tự tăng |
| Vector (pgvector) | 800k chunk + 400k memory | 800k chunk + 800k memory | Knowledge base tăng theo **số tài liệu**, không theo số user; chỉ memory tăng |
| GCS workspace | 4,2 TB | 8,4 TB | Không cần làm gì, lifecycle giữ ~75% ở Nearline |
| Redis Standard HA | 5 GB | 10 GB | Vẫn ở bậc giá M2 (5–10 GB) |
| Cloud Tasks | 4,2 triệu operation | 8,4 triệu operation | Tăng `max_dispatches_per_second` 10 → 20 |
| **Chi phí tầng dữ liệu** | **890,86 USD** | **1.753,41 USD** | **×1,97**, USD/DAU giảm 0,445 → 0,438 |

**Đòn bẩy khi lên 4.000 DAU:** chuyển Cloud SQL sang CUD 3 năm (trả 48% thay vì 75%), tiết kiệm **305,90 USD/tháng**. Thêm 1 read replica cho truy vấn RAG nếu CPU primary > 70%.

**Lời nói (khoảng 15 giây):**
> Khi số người dùng gấp đôi, chi phí tầng dữ liệu tăng 1,97 lần, nên chi phí trên mỗi DAU giảm nhẹ. Knowledge base không phình theo số người. Redis vẫn ở cùng bậc giá. Cloud SQL chỉ cần nâng tier trong cửa sổ bảo trì, không phải đổi kiến trúc.

---

## Kịch bản 1 phút 30 giây cho phần TV3 (03:00 – 04:30 trong bài bảo vệ)

| Thời gian | Slide | Nội dung |
|---|---|---|
| 03:00 – 03:40 | 6 | Lời nói Slide 6 |
| 03:40 – 04:20 | 7 | Lời nói Slide 7, chỉ vào khung "Chứng minh" màu xanh |
| 04:20 – 04:30 | 7 | Chốt: "Tầng dữ liệu tốn 890 USD/tháng, tức 0,45 USD/DAU. Toàn bộ nằm trong module Terraform `data`, validate thành công." |

### Câu hỏi dự phòng (phần Data và workspace trên trang đề)

**Connector gọi API trực tiếp khi cần hay đồng bộ trước vào index? Đánh đổi chi phí và độ tươi?**
Nhóm em dùng cả hai. Tài liệu được đồng bộ trước, vì tìm kiếm ngữ nghĩa cần embedding sẵn và cần lọc quyền ngay trong DB. Cái giá là độ trễ tối đa 15 phút (thường chỉ vài giây nhờ webhook) và 600 triệu token embedding mỗi tháng (12 USD, dòng của TV2). Email, lịch, Jira thì gọi trực tiếp: dữ liệu luôn mới, không phải lưu bản sao, nhưng phụ thuộc rate limit của SaaS. Rủi ro này được xử lý bằng token bucket theo user và backoff trong Cloud Tasks.

**Kết quả tìm kiếm được lọc theo quyền gốc ở bước nào?**
Ở ngay trong câu truy vấn vector. Policy RLS `acl_principals && app.principals` được áp dụng khi HNSW quét. pgvector 0.8 có `iterative_scan`, nên user ít quyền vẫn nhận đủ k kết quả hợp lệ. Nhóm em không lọc sau ở ứng dụng, vì làm vậy vừa có thể rò dữ liệu, vừa có thể trả về ít hơn k kết quả. Cache RAG trong Redis có khóa gồm hash của principals, nên người khác quyền không dùng chung cache.

**Workspace riêng tách bằng gì: bucket, prefix hay khóa mã hóa riêng?**
Nhóm em tách bằng prefix, kết hợp với việc chỉ một service có IAM và token downscoped. Chọn 1 bucket chứ không phải 2.000 bucket vì GCS giới hạn tốc độ tạo bucket, khó quản lý IAM, mà vẫn không chặn được agent đã có quyền project. Không dùng khóa riêng cho từng user vì 2.000 key version tốn khoảng 120 USD/tháng mà không thêm lớp chặn nào, do kẻ tấn công vẫn phải đi qua `workspace-svc`. Nếu một đơn vị yêu cầu khóa riêng (ví dụ phòng pháp chế), có thể tách bucket riêng cho đơn vị đó.

**Hàng đợi cho agent chạy nền, retry và hủy tác vụ ra sao?**
Cloud Tasks `agent-queue` cho tối đa 10 dispatch/s, 50 tác vụ đồng thời, retry 3 lần với backoff 5–60 s, và dừng hẳn sau 600 s (H6). Mỗi bước có idempotency key, nên retry không gửi email hai lần. Khi người dùng bấm hủy, hệ thống gọi `DeleteTask` cho các bước chưa chạy và đặt cờ `cancel:{task_id}` trong Redis để worker dừng ở bước kế tiếp. Khi xong, hệ thống báo qua Teams hoặc email.
