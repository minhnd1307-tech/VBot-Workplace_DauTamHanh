# Báo cáo kết quả cá nhân: Thành viên 3 (Data, Workspace & Connectors)

| | |
|---|---|
| **Họ tên** | Lam Hoang Phuc |
| **MSSV** | _(điền MSSV, rồi đổi tên file thành `<MSSV>_LamHoangPhuc.md` giống TV1)_ |
| **Dự án** | VBot Workplace: kiến trúc production trên GCP cho 2.000 DAU |
| **Vai trò** | TV3: Data, Workspace & Connectors Specialist |
| **Component báo giá phụ trách** | `connectors`, `database`, `vector_db`, `object_storage`, `cache_queue` |
| **Ngày lấy giá** | 2026-10-16, region `asia-southeast1` (Singapore), USD, giá niêm yết, chưa VAT |

---

## 1. Tóm tắt

| Hạng mục (DoD) | Trạng thái |
|---|---|
| Module Terraform `data` hoàn thiện, Multi-AZ cho DB và Redis | ✅ Xong. Cloud SQL `REGIONAL`, Redis `STANDARD_HA`. Root `terraform validate`: **Success! The configuration is valid.** |
| Chứng minh user A không truy cập được workspace hay kết quả vector của user B | ✅ Xong. `tv3_data/run_isolation_test.sh` chạy trên PostgreSQL 16 + pgvector 0.8 thật: **7/7 PASS** |
| Đủ 5 component trong Excel, có link và bằng chứng giá hợp lệ | ✅ Xong. 14 dòng, **0 lỗi validator** trên các dòng của TV3. Bằng chứng E30–E37 cùng file SKU gốc |
| Slide 6, 7 và phần dữ liệu của Slide 12 | ✅ Xong. 2 sơ đồ PNG/SVG, chữ trên slide, lời nói, câu hỏi dự phòng |

**Chi phí phần TV3: 890,86 USD/tháng** (0,445 USD/DAU).

| Component | USD/tháng |
|---|---:|
| database | 545,82 |
| cache_queue | 275,43 |
| object_storage | 67,86 |
| connectors | 1,75 |
| vector_db | 0 (nằm trong database) |
| **Tổng** | **890,86** |

---

## 2. Danh sách file bàn giao

| File | Nội dung |
|---|---|
| [terraform/modules/data/main.tf](terraform/modules/data/main.tf) | Cloud SQL PG16 HA và staging, GCS workspace/ingest/staging, Redis HA, 2 hàng đợi Cloud Tasks, Pub/Sub và DLQ, Cloud Scheduler, service account và IAM tối thiểu |
| [terraform/modules/data/variables.tf](terraform/modules/data/variables.tf) | Biến sizing có ghi căn cứ. `db_password` **không còn default** |
| [terraform/modules/data/outputs.tf](terraform/modules/data/outputs.tf) | Thêm `db_connection_name`, `connector_events_topic`, `data_service_accounts`, ... |
| [terraform/main.tf](terraform/main.tf) | Thêm 1 dòng: truyền `workload_identity_pool = module.gke.workload_identity_pool` vào module `data` |
| [tv3_data/sql/001_schema.sql](tv3_data/sql/001_schema.sql) | Schema PostgreSQL + pgvector + Row-Level Security, quota 10 GB, đồng bộ ACL, hàm `search_kb` |
| [tv3_data/sql/002_test_isolation.sql](tv3_data/sql/002_test_isolation.sql) | 7 kiểm thử cô lập user A/B |
| [tv3_data/run_isolation_test.sh](tv3_data/run_isolation_test.sh) | Chạy schema và kiểm thử trên Docker `pgvector/pgvector:0.8.0-pg16` |
| [tv3_data/pricing/tv3_skus_2026-10-16.json](tv3_data/pricing/tv3_skus_2026-10-16.json) | 21 bản ghi SKU gốc từ Cloud Billing Catalog API (bằng chứng đơn giá) |
| [baogia/build_baogia.js](baogia/build_baogia.js) | Thêm khối `P3`, `S3`, `TV3_ROWS` (14 dòng) và bằng chứng E30–E37. Đã thay 5 dòng `CHỜ TV3` |
| [baogia/Gxx_baogia.xlsx](baogia/Gxx_baogia.xlsx) | Sinh lại từ script, đã có dòng của TV3 |
| [slides/slide06_connectors_oauth.png](slides/slide06_connectors_oauth.png) / `.svg` | Sơ đồ Slide 6 |
| [slides/slide07_workspace_du_lieu.png](slides/slide07_workspace_du_lieu.png) / `.svg` | Sơ đồ Slide 7 |
| [slides/gen_tv3_diagrams.js](slides/gen_tv3_diagrams.js) | Script vẽ lại 2 sơ đồ |
| [slides/TV3_slide_6_7_12.md](slides/TV3_slide_6_7_12.md) | Chữ trên slide, lời nói, bảng x2 DAU, kịch bản 1 phút 30 giây, câu hỏi dự phòng |

---

## 3. Terraform: module `data`

### 3.1 Tài nguyên

| Tài nguyên | Cấu hình chính | Ràng buộc |
|---|---|---|
| `google_sql_database_instance.postgres_ha` | PostgreSQL 16 Enterprise, `db-custom-4-16384`, **`availability_type = REGIONAL`**, PD-SSD 200 GB, tự tăng tối đa 500 GB | H7 |
| | Chỉ Private IP, `ssl_mode = ENCRYPTED_ONLY` | H5 |
| | Backup 02:00 giờ VN, PITR, giữ WAL 7 ngày, giữ 14 bản backup | H7 (RPO ≤ 1h) |
| | Flag `cloudsql.iam_authentication`, `cloudsql.enable_pgaudit`, `pgaudit.log = ddl,role`; Query Insights | H2, H5 |
| | `deletion_protection = true` (biến) | |
| `google_sql_user` | `vbot_admin` (mật khẩu từ tfvars, chỉ dùng cho migration). App dùng user **IAM** (`CLOUD_IAM_SERVICE_ACCOUNT`), không có mật khẩu | H2 |
| `postgres_staging` | Zonal `db-custom-1-3840`, 20 GB. Cloud Scheduler bật 07:45, tắt 18:15 (T2–T6) | Staging, FinOps |
| `google_storage_bucket.workspace_bucket` | UBLA, `public_access_prevention = enforced`, **CMEK** (khóa KMS của TV4), versioning, soft delete 7 ngày | H3, H5 |
| | Lifecycle: Standard → Nearline sau 90 ngày → Coldline sau 365 ngày; xóa phiên bản cũ khi có hơn 3 bản hoặc quá 30 ngày | FinOps |
| `google_kms_crypto_key_iam_member.gcs_cmek` | Cấp quyền dùng khóa KMS cho GCS service agent. **Thiếu dòng này thì `apply` tạo bucket CMEK sẽ lỗi** | |
| IAM bucket | **Chỉ** `workspace-svc` có `storage.objectUser`. Agent và sandbox không có quyền bucket | H3 |
| `connector_ingest`, `workspace_staging` | Bucket tạm cho connector (tự xóa sau 7 ngày, CMEK) và bucket staging (tự xóa sau 30 ngày) | |
| `google_redis_instance.redis_ha` | **`STANDARD_HA`** 5 GB, Redis 7.2, AUTH, TLS (`SERVER_AUTHENTICATION`), `allkeys-lru`, bảo trì Chủ Nhật 02:00 | H7, H5 |
| `agent_task_queue` | 10 dispatch/s, 50 tác vụ đồng thời, 3 lần retry, **`max_retry_duration = 600s`**, log 100% dispatch | H6 |
| `connector_sync_queue` | 5 dispatch/s, 5 lần retry, backoff 10–300 s (tôn trọng HTTP 429 của SaaS) | |
| Pub/Sub `connector-events` + DLQ | Nhận Gmail/Drive watch và webhook. Cấp `gmail-api-push@system` quyền publish. DLQ sau 10 lần lỗi | |
| Cloud Scheduler | 5 job delta sync (15 phút/lần, 8–18h, T2–T6) và 2 job bật/tắt Cloud SQL staging | |
| Service account `workspace-svc`, `data-api`, `connector-worker` | Mỗi SA chỉ có quyền tối thiểu, gắn vào K8s ServiceAccount qua Workload Identity (`<pool>[vbot/<tên>]`) | H2 |

### 3.2 Những chỗ đã sửa so với bản module cũ

| Vấn đề ở bản cũ | Hậu quả | Đã sửa |
|---|---|---|
| Flag `cloudsql.enable_pgvector = on` | Cloud SQL **không có** flag này. `validate` vẫn qua nhưng `apply` lỗi "invalid flag" | Bỏ flag. Bật pgvector bằng `CREATE EXTENSION vector` trong migration `001_schema.sql` |
| Bucket CMEK nhưng chưa cấp quyền khóa cho GCS service agent | `apply` lỗi 403 khi tạo bucket | Thêm `google_kms_crypto_key_iam_member.gcs_cmek` |
| Redis `transit_encryption_mode = DISABLED`, không AUTH | Trái với H5 (mã hóa khi truyền) | `SERVER_AUTHENTICATION` + `auth_enabled = true` |
| `db_password` có default viết cứng trong code | Lộ mật khẩu trong git (TV1 đã nêu ở báo cáo) | Bỏ default. App dùng IAM auth |
| `deletion_protection = false` | Một lệnh `destroy` xóa luôn DB prod | Mặc định `true` |
| Cloud Tasks 50 dispatch/s, 100 đồng thời | Lệch với bảng sizing của TV2 (10 tác vụ/s) | 10/s, 50 đồng thời; tách thêm hàng đợi riêng cho connector |
| Redis 4 GB | Thuộc bậc giá M1, đắt hơn | 5 GB thuộc bậc M2, rẻ hơn **59,13 USD/tháng** |

**Kiểm tra lại:**
```bash
cd terraform
terraform init -backend=false
terraform validate      # => Success! The configuration is valid.
```

---

## 4. Kiến trúc dữ liệu và connectors

### 4.1 Cô lập workspace: user A không đọc được dữ liệu của user B

| Tầng | Cơ chế | Kiểm thử |
|---|---|---|
| Cloud SQL (chat, memory, metadata file) | Row-Level Security `user_id = app.user_id`. Role `vbot_app` không có BYPASSRLS. Chưa đặt danh tính thì trả 0 dòng (fail-closed) | T1, T3, T4 |
| pgvector (knowledge base) | Mỗi chunk mang `acl_principals` lấy từ quyền gốc. Policy `acl_principals && app.principals` chạy **trong** truy vấn HNSW, có `hnsw.iterative_scan` | T2, T3 |
| Thu hồi quyền | Connector cập nhật `documents.acl_principals`, trigger cập nhật luôn các chunk trong cùng transaction | T7 |
| Cloud Storage | Prefix `user-workspaces/{uid}/`. Ràng buộc CHECK: `gcs_path` phải nằm trong prefix của chính user. Chỉ `workspace-svc` có IAM. Sandbox nhận token downscoped (Credential Access Boundary) cho đúng prefix, hết hạn sau 15 phút | T5 |
| Quota 10 GB | Trigger `enforce_quota` chặn trước khi `workspace-svc` cấp Signed URL upload | T6 |
| Redis | Khóa theo user `u:{uid}:*`. Khóa cache RAG có hash của principals. Chỉ app trong VPC truy cập, có AUTH và TLS | |

**Kết quả chạy `bash tv3_data/run_isolation_test.sh`:**
```
PASS T1: khong co danh tinh => 0 dong (fail-closed)
PASS T2: Alice thay {"Kế hoạch marketing Q4 (riêng Alice)","Sổ tay nhân viên (toàn công ty)"} (khong co tai lieu finance, chi 1 tin nhan cua minh)
PASS T3: Bob chi thay {"Sổ tay nhân viên (toàn công ty)","Bảng lương 2026 (nhóm finance)"} ; 0 chat/memory/file cua Alice
PASS T4: ghi vao du lieu cua Alice bi chan (new row violates row-level security policy for table "chat_messages")
PASS T5: path ngoai prefix cua minh bi chan (new row for relation "workspace_files" violates check constraint "gcs_path_in_own_prefix")
PASS T6: vuot 10 GB bi chan
PASS T7: thu hoi quyen goc => Bob khong con thay tai lieu
==> TAT CA 7 KIEM THU CO LAP DU LIEU: PASS
```
Ở T3, Bob tìm bằng **đúng embedding** của tài liệu riêng của Alice, tức trường hợp xấu nhất, mà vẫn không lấy được tài liệu đó.

### 4.2 OAuth ủy nhiệm cho connectors (least-privilege)

1. Người dùng bấm "Kết nối" và đồng ý scope tại trang của SaaS (Authorization Code + PKCE, có `state` chống CSRF).
2. Callback đi qua LB về `connector-gateway`. Gateway đổi code lấy refresh token và gắn token với `user_id` của phiên SSO.
3. Refresh token mã hóa CMEK, lưu trong Secret Manager (do TV4 sở hữu, 1 secret cho mỗi user và mỗi SaaS). Access token được cache trong Redis tối đa 50 phút.
4. Khi agent cần gọi SaaS, gateway lấy token theo user của phiên hiện tại rồi gọi API qua Cloud NAT (IP tĩnh). LLM không bao giờ nhìn thấy token.

| SaaS | Scope | Ghi chú |
|---|---|---|
| Google | `gmail.readonly`, `gmail.compose`*, `drive.readonly`, `calendar.events`* | Không xin `gmail.modify` hay `drive` toàn quyền |
| Microsoft Graph | `Mail.Read`, `Mail.Send`*, `Files.Read.All`, `Calendars.ReadWrite`*, `offline_access` | Chỉ delegated, không application permission |
| Atlassian | `read:jira-work`, `write:jira-work`*, `read:confluence-content.all`, `offline_access` | 3LO theo từng user |
| Notion | User tự chọn trang chia sẻ; read content, insert content* | 3 request/giây mỗi integration |

`*` = hành động ghi, phải chờ người dùng xác nhận (H4, phần của TV4).

**Đồng bộ trước hay gọi trực tiếp:** tài liệu (Drive, SharePoint/OneDrive, Confluence, Notion) được đồng bộ trước vào index để tìm kiếm ngữ nghĩa và lọc quyền trong DB. Email, lịch, Teams, Jira được gọi trực tiếp để luôn có dữ liệu mới và không phải lưu bản sao.

---

## 5. Sizing tầng dữ liệu

Đầu vào lấy từ bảng bàn giao của TV2: 1,1 triệu request/tháng, 500.000 vector ban đầu, 33.000 ảnh/tháng, 2.000 phiên đồng thời, 132.000 tác vụ cấp 4/tháng, 20.000 lượt gọi connector/ngày.

| Đại lượng | Công thức | Kết quả |
|---|---|---|
| Lịch sử chat | 1,1 triệu request × (3 KB trả lời + 0,5 KB câu hỏi + 0,5 KB metadata/index) = 4,4 GB, cộng tool output của agent 132.000 × 5 bước × 4 KB = 2,6 GB | ~7 GB/tháng → **84 GB** cho 12 tháng |
| Vector KB | 100.000 tài liệu × 2.000 token / 400 token mỗi chunk = 500.000 chunk, thêm ~25.000 chunk/tháng → ~800.000 chunk × (3 KB vector + 2 KB text) + HNSW | **~8 GB** |
| Memory | 2.000 user × 200 mục × 4 KB | **1,6 GB** |
| Metadata | tài liệu, ACL, file, phiên | **~2 GB** |
| **Ổ Cloud SQL** | (84 + 8 + 1,6 + 2) × 1,5 (WAL, bloat, vacuum) ≈ 144 GB | **200 GB** (dư IOPS, tự tăng tối đa 500 GB) |
| RAM Cloud SQL | HNSW ~3 GB + dữ liệu chat nóng | **16 GB** |
| Workspace mới | upload 4,5 MB + file xuất 1 MB + kết quả sandbox 0,75 MB mỗi ngày × 22 ngày + ảnh 20 MB/tháng ≈ 160 MB/user/tháng × 2.000, cộng 10% phiên bản cũ | **350 GB/tháng** |
| GCS ở trạng thái ổn định | Standard 3 tháng × 350 = 1.050 GB; Nearline 9 tháng × 350 = 3.150 GB | **4.200 GB = 2,1 GB/user** (quota 10 GB) |
| Redis | 2.000 phiên × 200 KB = 0,4 GB, cộng cache RAG 1–2 GB và bộ đếm | ~2,5 GB → **5 GB** |
| Cloud Tasks | agent 132.000 × 6 bước × 2 operation = 1,58 triệu; sync theo webhook 2,2 triệu; delta tick 0,35 triệu | **4,2 triệu operation** |
| Pub/Sub | 2.000 user × 50 event/ngày × 22 ngày = 2,2 triệu event × 1 KB × 2 (publish + delivery) | **4,4 GB** |

---

## 6. Báo giá

### 6.1 Nguồn đơn giá

Toàn bộ đơn giá lấy từ **Cloud Billing Catalog API** (`services/*/skus`, USD) ngày 2026-10-16, cùng nguồn với TV1. 21 bản ghi SKU gốc lưu ở `tv3_data/pricing/tv3_skus_2026-10-16.json`. Với SKU có bậc 0 USD ban đầu (thao tác GCS, Cloud Tasks, Pub/Sub, Scheduler), toàn bộ lượng dùng vẫn được tính theo đơn giá có phí.

| SKU | Mô tả | Đơn giá |
|---|---|---|
| 0152-2835-C929 / 37B4-B2B7-C640 | Cloud SQL PostgreSQL Regional vCPU / RAM, Singapore | 0,1156 USD/giờ, 0,0196 USD/GB-giờ |
| 83A6-DA61-7797 | Cloud SQL PostgreSQL Regional storage | 0,476 USD/GB-tháng |
| DE86-B401-E60F / EF83-F6A8-8EA7 / 45B3-606F-EE91 | Cloud SQL Zonal vCPU / RAM / storage | 0,0578 / 0,0098 / 0,238 |
| B4F3-4753-84D8 | Cloud SQL CUD 1 năm asia-southeast1 | 0,0075 cho mỗi 0,01 cam kết (giảm 25%) |
| 76BA-5CAD-4338 / 4453-FEE4-941B | GCS Standard / Nearline Singapore | 0,020 / 0,010 USD/GB-tháng |
| 4DBF-185F-A415 / 7870-010B-2763 | GCS Class A / Class B | 0,05 / 0,004 USD cho 10.000 thao tác |
| A728-AD0D-27B4 / ABC0-67FF-FCAD | Redis Standard M2 / M1 Singapore | 0,075 / 0,114 USD/GB-giờ |
| 378A-D762-1F74 | Cloud Tasks operations | 0,40 USD/triệu |
| 027D-B6C7-CCA2 | Pub/Sub message delivery | 40 USD/TiB |
| A5D6-43A2-28A7 | Cloud Scheduler jobs | 0,10 USD/job-tháng |

### 6.2 Các dòng báo giá của TV3

| Component | Hạng mục | Cách tính | USD/tháng |
|---|---|---|---:|
| connectors | Gọi API SaaS | Nằm trong license SaaS; worker nằm trong compute; egress nằm trong network | 0,00 |
| connectors | Pub/Sub event | 4,4 GB / 1024 × 40 + 0,1 GB × 0,27 | 0,20 |
| connectors | Cloud Scheduler delta sync | 5 job × 0,10 | 0,50 |
| connectors | Bucket connector-ingest | 15 GB × 0,02 + 150.000 × 0,000005 | 1,05 |
| database | Cloud SQL HA 4 vCPU / 16 GB, **CUD 1 năm** | (4 × 0,1156 + 16 × 0,0196) × 730 × 0,75 | 424,86 |
| database | SSD regional 200 GB | 200 × 0,476 | 95,20 |
| database | Cloud SQL staging (220 giờ) | 0,09455 × 220 + 20 × 0,238 + 2 job × 0,10 | 25,76 |
| vector_db | pgvector trong Cloud SQL | Nằm trong dòng database | 0,00 |
| object_storage | Standard 1.050 GB | 1.050 × 0,020 | 21,00 |
| object_storage | Nearline 3.150 GB | 3.150 × 0,010 | 31,50 |
| object_storage | Thao tác + chuyển lớp + retrieval | 6,60 + 1,76 + 4,40 + 1,60 | 14,36 |
| object_storage | Bucket staging 50 GB | 50 × 0,020 | 1,00 |
| cache_queue | Redis Standard HA 5 GB | 5 × 730 × 0,075 | 273,75 |
| cache_queue | Cloud Tasks | 4,2 × 0,40 | 1,68 |
| | **Tổng TV3** | | **890,86** |

**Kết quả validator** (`node check_baogia.js Gxx_baogia.xlsx`): 14 dòng của TV3 không có lỗi nào. File tổng hiện vẫn CHƯA ĐẠT, nhưng 25 lỗi còn lại đều thuộc 5 dòng của TV2 (dòng 2–6), 7 dòng của TV4 (dòng 21–27) và dòng `contingency` (đang chờ số `llm`).

### 6.3 Đòn bẩy FinOps của tầng dữ liệu

| Đòn bẩy | Tiết kiệm/tháng | So với |
|---|---:|---|
| CUD 1 năm cho Cloud SQL prod | 141,62 | On-demand 566,48 USD |
| pgvector trong Cloud SQL thay vì thuê dịch vụ vector riêng | Không mất thêm phí node 24/7 | Vertex AI Vector Search |
| Lifecycle GCS: 75% dữ liệu ở Nearline | 27,10 | Để toàn bộ 4.200 GB ở Standard (84 USD); đã trừ 4,40 USD phí chuyển lớp |
| Redis 5 GB bậc M2 thay vì 4 GB bậc M1 | 59,13 | 332,88 USD |
| Staging DB chỉ chạy 220 giờ, zonal | 48,02 | Staging zonal chạy 24/7 (69,02 + 4,76 USD) |
| Staging Redis chạy container trên node staging | 47,45 | Redis Basic 1 GB 24/7 (0,065 × 730) |
| **Tổng** | **323,32** | |

---

## 7. Bàn giao và việc còn lại

| # | Việc | Ai | Ghi chú |
|---|---|---|---|
| 1 | Chụp ảnh bằng chứng E30–E37 dán vào sheet `BangChung` | TV1 (đang chụp E01–E13) hoặc TV3 | Link và SKU đã có. Ảnh phải thấy tên dịch vụ, SKU, region, đơn giá |
| 2 | Dòng `backup_dr`: backup Cloud SQL ~140 GB × 0,112 = **15,68 USD**, cộng log PITR ~35 GB × 0,112 = **3,92 USD** (SKU 5C0F-D226-757F) | TV4 | Số ước lượng của TV3 để TV4 dùng, chưa tính bản sao cross-region |
| 3 | `secrets_kms`: 2.000 user × tối đa 5 SaaS = ~10.000 secret refresh token; mỗi thao tác GCS CMEK gọi KMS (~5,7 triệu thao tác/tháng) | TV4 | Ảnh hưởng chi phí Secret Manager và KMS |
| 4 | Cloud NAT: lưu lượng connector ước tính ~90 GB/tháng (20.000 lượt gọi × 22 × 50 KB + 60 GB tải tài liệu), nằm trong mức 300 GB TV1 đã tính | TV1 | Không cần sửa |
| 5 | Dòng `contingency` đang bằng 0, chờ số `llm` | TV2 → TV1 | |
| 6 | Bật API `pubsub`, `cloudscheduler`, `storage`: module `data` đã tự bật. Nếu TV2 muốn gom vào `ai_gateway` thì có thể chuyển | TV2 | |
| 7 | Đổi tên file báo cáo theo MSSV | TV3 | |

---

## 8. Cách chạy lại

```bash
# Terraform
cd terraform && terraform init -backend=false && terraform validate

# Kiểm thử cô lập dữ liệu (cần Docker)
bash tv3_data/run_isolation_test.sh

# Báo giá
cd baogia && npm install && node build_baogia.js && node check_baogia.js Gxx_baogia.xlsx

# Sơ đồ Slide 6, 7
cd slides && npm install && node gen_tv3_diagrams.js
```
