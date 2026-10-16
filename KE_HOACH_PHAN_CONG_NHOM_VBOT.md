# KẾ HOẠCH PHÂN CÔNG NHIỆM VỤ CAPSTONE: VBOT WORKPLACE (NHÓM 4 NGƯỜI)
## TÍCH HỢP TOÀN DIỆN: SLIDE + BÁO GIÁ XLSX + TERRAFORM IaC

> **Mục tiêu:** Xây dựng kiến trúc Production cho VBot Workplace trên **Google Cloud Platform (GCP)** phục vụ 2.000 DAU, đạt chuẩn 8 ràng buộc cứng (H1–H8), hoàn thiện file báo giá XLSX (đạt validator), bộ slide thuyết trình (tối đa 15 slide) và **Bộ mã nguồn Terraform (IaC)** hoàn chỉnh chứng minh tính khả thi của hệ thống.

---

## 1. SƠ ĐỒ ĐƯỜNG GĂNG & MỐI QUAN HỆ PHỤ THUỘC (DEPENDENCY MATRIX)

```
[Bắt đầu]
   │
   ▼
[THÀNH VIÊN 2] ─────────── (ĐƯỜNG GĂNG QUYẾT ĐỊNH - 00:25 đến 01:15) ────────────┐
Chốt Bảng Sizing Tải (2.000 DAU)                                                 │
(Request, Token In/Out, TPS/RPS, Storage, Sandbox calls, Image gen)              │
   │                                                                             │
   ├──────────────────────────────┬──────────────────────────────┐               │
   ▼                              ▼                              ▼               ▼
[THÀNH VIÊN 1]             [THÀNH VIÊN 3]             [THÀNH VIÊN 4]     [THÀNH VIÊN 2]
Sizing GKE Node,           Sizing DB, Vector,         Sizing GKE Sandbox Sizing Model API
VPC, Mạng, LB,             GCS Workspace,             Pool (gVisor),     (Gemini/Imagen),
Staging                    Redis Cache, Queue         DLP API, KMS, Log  Context Caching
   │                              │                              │               │
   ▼                              ▼                              ▼               ▼
[TERRAFORM MODULES]        [TERRAFORM MODULES]        [TERRAFORM MODULES] [TERRAFORM MODULES]
modules/network            modules/data               modules/security_   modules/ai_gateway
modules/gke (app pool)     (Cloud SQL, GCS, Redis)    sandbox (gVisor)    (APIs, Monitoring)
   │                              │                              │               │
   └──────────────────────────────┴──────────────────────────────┘               │
                                  │                                              │
                                  ▼                                              │
   (01:25 - 02:35) Lấy link Pricing Calculator + Chụp ảnh bằng chứng              │
   (02:35 - 03:00) Điền sheet BaoGia & BangChung                                 │
                                  │                                              │
                                  ▼                                              │
                           [THÀNH VIÊN 1] ◄──────────────────────────────────────┘
                           Tổng hợp Master Excel + Chạy Web Validator đến khi ĐẠT
                           Chốt số TOTAL đồng bộ với Slide 11
                                  │
                                  ▼
                           [Nộp Form trước 03:05]
```

### Bảng Ma trận phụ thuộc (RACI & Dependency)

| Thành viên | Phụ thuộc vào (Depends On) | Ai phụ thuộc vào mình (Blocks) | Phần việc làm ĐỘC LẬP / SONG SONG |
| :--- | :--- | :--- | :--- |
| **TV 2 (AI/Model/Gateway)** | Đề bài (2.000 DAU). Không phụ thuộc ai ở pha đầu. | **TẤT CẢ (TV1, TV3, TV4)** đều chờ con số sizing từ TV2 để tính dung lượng/node/Terraform vars. | So sánh phương án model, cơ chế benchmark chất lượng 95%, routing, module Terraform `ai_gateway`. |
| **TV 1 (Lead/Infra)** | Chờ TV2 (RPS, lưu lượng mạng); Chờ TV3, TV4 (số lượng pod/dịch vụ để sizing node GKE). | Chốt file Báo giá tổng, root Terraform (`main.tf`, `variables.tf`) và Slide chi phí cuối cùng. | Viết module Terraform `network` (VPC, Cloud NAT, WAF) và `gke` (cluster nền tảng), dựng khung slide. |
| **TV 3 (Data/SaaS)** | Chờ TV2 (Dung lượng token, số file/user, số lượt gọi connector). | TV1 (cần biết dung lượng DB/storage để gom chi phí). | Viết module Terraform `data` (Cloud SQL HA pgvector, GCS bucket, Redis, Cloud Tasks), thiết kế OAuth flow. |
| **TV 4 (Sec/Gov/HA)**| Chờ TV2 (Số lượt chạy sandbox/ngày, số request cần quét DLP, lượng log sinh ra). | TV1 (cần cấu hình node pool sandbox để sizing compute). | Viết module Terraform `security_sandbox` (GKE Sandbox gVisor node pool, KMS, Secret Manager, NetworkPolicy). |

---

## 2. BẢN MÔ TẢ CHI TIẾT NHIỆM VỤ TỪNG THÀNH VIÊN

---

### THÀNH VIÊN 1: Lead Architect & Hạ tầng Nền tảng (Platform & SRE Lead)

* **Vai trò:** Trưởng nhóm kỹ thuật, điều phối tổng thể, chịu trách nhiệm kết nối hệ thống, đảm bảo tính sẵn sàng cao (HA), kiến trúc mạng, root Terraform và file Báo giá tổng hợp chuẩn chỉ.
* **Component phụ trách trong Báo giá:** `compute`, `load_balancer`, `network`, `cicd`, `ops_labor`, `licenses`, `contingency`, `TOTAL`.
* **Phần mã nguồn Terraform sở hữu:**
  * Root module: `terraform/main.tf`, `terraform/variables.tf`, `terraform/outputs.tf`, `terraform/terraform.tfvars.example`.
  * Module `terraform/modules/network/`: VPC Custom, Private Subnets, Cloud Router, Cloud NAT, Cloud Armor (WAF).
  * Module `terraform/modules/gke/`: Cụm GKE Private Cluster, System/Application Node Pool (Autoscaling).

#### A. Đầu vào (Inputs)
* Yêu cầu đề bài: Chạy trên 1 cloud chính (GCP), Multi-AZ (H7), Uptime 99.5%, môi trường Prod + 1 Staging.
* Bảng Sizing tải từ **Thành viên 2** (RPS cao điểm, số lượng request/giây, băng thông mạng dự kiến).
* Cấu hình tài nguyên (CPU/RAM/replicas) của các dịch vụ từ **Thành viên 3** và **Thành viên 4**.

#### B. Phần việc cụ thể (Tasks)
1. **Thiết kế & Mã hóa Terraform (IaC):**
   * Khởi tạo cấu trúc dự án Terraform mô-đun hóa.
   * Viết module `network`: Cấu hình VPC 3 subnets trải dài 3 Zone của `asia-southeast1` (Singapore), Cloud NAT cho các private node ra internet an toàn, Cloud Armor thiết lập WAF rate-limiting.
   * Viết module `gke`: Cụm GKE Standard kích hoạt Workload Identity, Application Node Pool với autoscaling (scale down ban đêm).
2. **Báo giá & Bằng chứng:**
   * Lấy giá chính thức cho GKE Management fee, Node Compute (e2/n2-standard), Cloud Load Balancing, Cloud NAT, Cloud Armor WAF.
   * Tính lương 1 FTE SRE/MLOps (~3.500 USD/tháng) và khoản Contingency.
3. **Tổng hợp & Kiểm tra:**
   * Gom dữ liệu từ 3 thành viên vào file Excel `Gxx_baogia.xlsx`.
   * Kéo thả vào công cụ kiểm tra trong `vbot-capstone.html` đến khi có thông báo **ĐẠT** (xanh lá).
   * Khớp số dòng `TOTAL` với **Slide 11**.
4. **Slide thuyết trình phụ trách:**
   * **Slide 2:** Sơ đồ kiến trúc tổng thể (High-level Architecture).
   * **Slide 3:** Luồng đi của 1 request mẫu (End-to-End Request Flow).
   * **Slide 11:** Tổng hợp Chi phí tháng (USD/tháng, USD/DAU) & Các đòn bẩy tiết kiệm FinOps.

#### C. Tiêu chuẩn hoàn thành (Definition of Done - DoD)
* [ ] Mã nguồn Terraform module `network` và `gke` chạy `terraform validate` hợp lệ.
* [ ] File `Gxx_baogia.xlsx` tải lên validator trên web báo **ĐẠT** (0 lỗi).
* [ ] Sơ đồ kiến trúc thể hiện rõ Multi-AZ (3 availability zones) và đầy đủ mã component.
* [ ] Hoàn thành Slide 2, 3, 11 và làm chủ phần mở đầu & kết luận thuyết trình.

---

### THÀNH VIÊN 2: AI, Model & Gateway Specialist (AI Engineer)

* **Vai trò:** "Trái tim" của giai đoạn đầu. Chịu trách nhiệm toàn bộ bài toán Sizing tải lượng, chiến lược routing model, đánh giá chất lượng (Eval gate), tối ưu hóa chi phí token và khai báo API AI trong Terraform.
* **Component phụ trách trong Báo giá:** `llm`, `embedding`, `gateway`.
* **Phần mã nguồn Terraform sở hữu:**
  * Module `terraform/modules/ai_gateway/`: Kích hoạt Vertex AI APIs, Model Garden bindings, Vertex AI Vector Search / Endpoints, Cloud Monitoring Alert Policies cho LLM Quota & Budgeting.

#### A. Đầu vào (Inputs)
* Yêu cầu đề bài: 2.000 DAU, giờ hành chính 8h-18h (22 ngày/tháng = 220h), 5 cấp độ tác vụ.
* Bảng giá niêm yết của Google Vertex AI (Gemini 1.5 Flash, Gemini 1.5 Pro, Imagen 3, Text Embedding 004).

#### B. Phần việc cụ thể (Tasks)
1. **Bài toán Sizing 2.000 DAU (Hoàn thành trước mốc 01:15):**
   * Lập công thức ước lượng:
     * Request/user/ngày (25 req $\to$ 50.000 req/ngày).
     * Tỉ lệ 5 cấp: Cấp 1 (45%), Cấp 2 (25%), Cấp 3 (15%), Cấp 4 (12%), Cấp 5 (3%).
     * Token Input/Output cho từng cấp tác vụ (kèm RAG context).
     * Giờ cao điểm: Tính TPS và RPS, cam kết độ trễ p95 TTFT $\le 3$s (H6).
   * Bàn giao ngay con số sizing cho TV1, TV3, TV4.
2. **Chiến lược Model & Tối ưu chi phí:**
   * Cấp 1–3: **Gemini 1.5 Flash** (chi phí cực thấp, tốc độ cao).
   * Cấp 4: **Gemini 1.5 Pro** (reasoning chuyên sâu, đọc ticket Jira/Confluence).
   * Cấp 5: **Imagen 3 on Vertex AI** (sinh ảnh mockup/sơ đồ).
   * Embedding: `text-embedding-004`.
   * Tối ưu FinOps: Áp dụng **Vertex AI Context Caching** (giảm 75% giá input token cho system prompt/RAG cố định).
3. **Mã hóa Terraform (IaC):**
   * Viết module `ai_gateway`: Khai báo kích hoạt các dịch vụ `aiplatform.googleapis.com`, cấu hình quota metrics và alert policy khi chi phí vượt ngân sách.
4. **Slide thuyết trình phụ trách:**
   * **Slide 1:** Giả định và Ước lượng tải chi tiết (có công thức rõ ràng).
   * **Slide 4:** Chiến lược lựa chọn Model & Routing theo 5 cấp độ.
   * **Slide 5:** So sánh phương án công nghệ (API vs Tự host GPU) và cách đo benchmark đạt $\ge 95\%$ (H8).

#### C. Tiêu chuẩn hoàn thành (Definition of Done - DoD)
* [ ] Có bảng tính công thức chi tiết từ 2.000 DAU $\to$ Tokens In/Out $\to$ Chi phí hàng tháng.
* [ ] Module Terraform `ai_gateway` cấu hình đầy đủ API và Monitoring Alert.
* [ ] Các dòng `llm`, `embedding`, `gateway` trong Excel có đầy đủ công thức `Token × Đơn giá` và link bảng tính giá Vertex AI chính thức.
* [ ] Hoàn thành Slide 1, 4, 5.

---

### THÀNH VIÊN 3: Data, Workspace & Connectors Specialist (Data Engineer)

* **Vai trò:** Thiết kế giải pháp lưu trữ, cơ sở dữ liệu quan hệ, vector database, quản lý không gian làm việc cá nhân của 2.000 nhân viên, hàng đợi tác vụ và viết Terraform cho toàn bộ tầng dữ liệu.
* **Component phụ trách trong Báo giá:** `connectors`, `database`, `vector_db`, `object_storage`, `cache_queue`.
* **Phần mã nguồn Terraform sở hữu:**
  * Module `terraform/modules/data/`:
    * Cloud SQL for PostgreSQL (Regional Multi-AZ, cấu hình pgvector).
    * Cloud Storage (GCS Bucket cho User Workspaces với Uniform Bucket-Level Access, CMEK, Lifecycle rules).
    * Memorystore for Redis (HA Multi-AZ).
    * Cloud Tasks Queue (cho Background Agent tasks).

#### A. Đầu vào (Inputs)
* Danh sách Connectors: Google Workspace, Microsoft 365, Notion, Jira, Confluence.
* Bảng Sizing từ **Thành viên 2**: Dung lượng file upload, kích thước metadata/chat history, số lượt gọi connector.

#### B. Phần việc cụ thể (Tasks)
1. **Mã hóa Terraform (IaC) - Module `data`:**
   * **Cloud SQL:** Cấu hình instance `db-custom-4-16384` với `availability_type = "REGIONAL"` (Multi-AZ failover tự động), cờ `cloudsql.enable_pgvector = "on"`, Private IP trong VPC.
   * **Cloud Storage (GCS):** Tạo bucket `vbot-workspaces` với `uniform_bucket_level_access = true`, mã hóa KMS, tự động chuyển file cũ sang Nearline/Coldline sau 90 ngày.
   * **Memorystore Redis:** Tạo Redis instance chế độ `STANDARD_HA` (Multi-AZ) làm cache session và hội thoại.
   * **Cloud Tasks:** Tạo queue `agent-task-queue` với cấu hình rate limits và max retry cho agent chạy nền.
2. **Kiến trúc dữ liệu & Connectors:**
   * Thiết kế cơ chế cô lập Workspace: Tách prefix `user-workspaces/{user_id}/`.
   * Thiết kế cơ chế lọc kết quả tìm kiếm RAG theo đúng quyền gốc của tài liệu (Document ACL enforcement).
   * Mô hình hóa luồng OAuth Token ủy quyền cá nhân cho SaaS Connectors (least-privilege).
3. **Báo giá & Bằng chứng:**
   * Lấy giá chính thức Cloud SQL (vCPU, RAM, SSD Storage Multi-AZ), GCS, Redis Standard HA, Cloud Tasks.
4. **Slide thuyết trình phụ trách:**
   * **Slide 6:** Tích hợp SaaS Connectors & Cơ chế ủy quyền OAuth (Least-privilege).
   * **Slide 7:** Workspace riêng (Workspace Isolation) & Kiến trúc Dữ liệu/Vector DB.
   * **Slide 12 (phần dữ liệu):** Mở rộng dung lượng dữ liệu khi DAU tăng gấp đôi.

#### C. Tiêu chuẩn hoàn thành (Definition of Done - DoD)
* [ ] Mã nguồn Terraform module `data` hoàn thiện, khai báo chuẩn Multi-AZ cho DB và Redis.
* [ ] Chứng minh được kiến trúc: *User A không thể truy cập workspace hay kết quả vector của User B*.
* [ ] Đủ 5 dòng component trong file Excel với link/ảnh bằng chứng giá hợp lệ.
* [ ] Hoàn thành Slide 6, 7 và phần dữ liệu Slide 12.

---

### THÀNH VIÊN 4: Security, Sandbox, Governance & Reliability (SecOps / Compliance)

* **Vai trò:** "Lá chắn" bảo vệ hệ thống. Chịu trách nhiệm môi trường thực thi code an toàn (Sandbox gVisor), định danh SSO, kiểm soát rò rỉ dữ liệu (DLP), chống tấn công AI, mã hóa KMS và viết Terraform bảo mật.
* **Component phụ trách trong Báo giá:** `sandbox`, `authn`, `authz`, `secrets_kms`, `governance`, `backup_dr`, `monitoring`.
* **Phần mã nguồn Terraform sở hữu:**
  * Module `terraform/modules/security_sandbox/`:
    * Node Pool GKE chuyên dụng với `sandbox_config { sandbox_type = "gvisor" }`.
    * Kubernetes NetworkPolicy template (chặn toàn bộ Egress, chặn Cloud Metadata `169.254.169.254`).
    * Google Cloud KMS Keyring & CryptoKey cho việc mã hóa Workspace và Secrets.
    * Secret Manager secret container lưu trữ OAuth tokens.
    * Cloud Sensitive Data Protection (DLP) inspect template.

#### A. Đầu vào (Inputs)
* Ràng buộc cứng: H2 (SSO/MFA/Vault), H3 (Sandbox microVM/gVisor cô lập), H4 (AI Governance), H5 (Data Governance/DLP/Audit 12 tháng), H7 (Backup/DR).
* Bảng Sizing từ **Thành viên 2**: Số lượt chạy code sandbox/ngày, số request cần quét DLP.

#### B. Phần việc cụ thể (Tasks)
1. **Mã hóa Terraform (IaC) - Module `security_sandbox`:**
   * **GKE Sandbox:** Tạo node pool riêng `sandbox-pool` trên GKE, cấu hình `sandbox_config { sandbox_type = "gvisor" }`, gán taints/tolerations để chỉ cho phép pod chạy code của agent lên pool này.
   * **KMS & Secrets:** Tạo Cloud KMS KeyRing + CryptoKey cho mã hóa at-rest; tạo Secret Manager để lưu trữ an toàn OAuth Refresh Tokens của 2.000 nhân viên.
   * **Network Policies:** Viết file NetworkPolicy chặn toàn bộ egress internet của sandbox pod, chỉ cho phép giao tiếp với pod điều phối nội bộ.
   * **Cloud DLP:** Tạo DLP Inspect Template cấu hình nhận diện và mask các trường PII (Email, Phone, Số CCCD/CMND, Thẻ tín dụng).
2. **Thiết kế Bảo mật & Governance:**
   * Luồng SSO SAML 2.0 / OIDC tích hợp MFA tập đoàn.
   * Cơ chế Human-in-the-loop: Bắt buộc xác nhận của người dùng trước các hành động nhạy cảm (gửi email, xóa file, tạo ticket).
   * Kế hoạch Backup & DR: Cloud SQL automated backups + cross-region snapshot, cam kết RTO $\le 4$h, RPO $\le 1$h.
3. **Báo giá & Bằng chứng:**
   * Lấy giá Cloud KMS (số lượng key version + thao tác mã hóa), Secret Manager, Cloud DLP API (chi phí quét GB data), Cloud Monitoring/Logging 12 tháng.
4. **Slide thuyết trình phụ trách:**
   * **Slide 8:** Cơ chế Cô lập Sandbox (gVisor) & Bảo mật môi trường chạy code.
   * **Slide 9:** AI & Data Governance (Cloud DLP, Chống Prompt Injection, Human-in-the-loop).
   * **Slide 10:** Tính sẵn sàng cao (HA), Kế hoạch Sao lưu & Khôi phục thảm họa (Backup/DR, RTO/RPO).

#### C. Tiêu chuẩn hoàn thành (Definition of Done - DoD)
* [ ] Mã nguồn Terraform module `security_sandbox` thể hiện rõ cờ `gvisor` và cấu hình KMS/Secret Manager.
* [ ] Có sơ đồ/kịch bản chứng minh: Chặn đứng tấn công Prompt Injection và code độc hại cố vượt ngục sandbox.
* [ ] Đủ 7 dòng component trong file Excel với link/ảnh bằng chứng giá hợp lệ.
* [ ] Hoàn thành Slide 8, 9, 10.

---

## 3. CHECKLIST KIỂM TRA CHẤT LƯỢNG TRƯỚC KHI NỘP BÀI (PRE-FLIGHT CHECK)

Trước mốc **03:00 (trước hạn nộp 5 phút)**, cả nhóm cùng rà soát các tiêu chí sống còn sau:

### 1. Kiểm tra File Báo giá (.xlsx)
* [ ] File có đúng 2 sheet: `BaoGia` và `BangChung`.
* [ ] Sheet `BaoGia` có đủ 5 cột chuẩn: `Component` | `Ý nghĩa` | `Ghi chú` | `Chi phí/tháng (USD)` | `Bằng chứng`.
* [ ] Không thiếu bất kỳ component nào trong số **19 component bắt buộc**.
* [ ] Dòng cuối cùng có Component là `TOTAL`, chi phí là tổng cộng chính xác của các dòng trên.
* [ ] Cột `Chi phí/tháng (USD)` chỉ chứa số thuần túy (không chứa chữ USD, $, đ, dấu phẩy).
* [ ] Dòng nào có chi phí = 0 phải có chữ `"nằm trong"` ở cột Ghi chú.
* [ ] **Tuyệt đối KHÔNG có các từ:** `free tier`, `trial`, `dùng thử`, `khuyến mãi`, `credits`.
* [ ] Cột `Ghi chú` có độ dài $> 15$ ký tự, thể hiện rõ công thức `Đơn giá × Số lượng`.
* [ ] **ĐÃ KÉO FILE VÀO TRANG `vbot-capstone.html` VÀ HIỆN THÔNG BÁO "ĐẠT" (MÀU XANH LÁ).**

### 2. Kiểm tra Mã nguồn Terraform (IaC)
* [ ] Thư mục `terraform/` đầy đủ các module: `network`, `gke`, `data`, `security_sandbox`, `ai_gateway`.
* [ ] Cú pháp Terraform chuẩn, các biến và output liên kết chặt chẽ.
* [ ] Thể hiện rõ các thông số kỹ thuật đã cam kết trong Slide và Báo giá (Multi-AZ, gVisor, pgvector, Private IP).

### 3. Kiểm tra Slide Thuyết trình (.pdf / .pptx)
* [ ] Đúng định dạng 16:9, dung lượng file $< 10$ MB, tổng số slide nội dung $\le 15$ slide.
* [ ] Con số tổng chi phí hàng tháng trên **Slide 11** TRÙNG KHỚP 100% với số ở dòng `TOTAL` của file Excel.
* [ ] Tên file đặt đúng quy định: `Gxx_slide.pdf` và `Gxx_baogia.xlsx`.

---

## 4. KẾ HOẠCH BẢO VỆ 7 PHÚT TRƯỚC HỘI ĐỒNG (PITCHING SCRIPT)

| Thời gian | Người nói | Nội dung chính cần làm nổi bật |
| :--- | :--- | :--- |
| **00:00 – 01:15** (1m15s) | **TV 1 (Lead)** | Giới thiệu bài toán, Sơ đồ Kiến trúc tổng thể trên GCP, Trình chiếu cấu trúc Terraform IaC tự động hóa 100% hạ tầng. |
| **01:15 – 03:00** (1m45s) | **TV 2 (AI)** | Giả định Sizing từ 2.000 DAU; Lựa chọn Gemini 1.5 Flash/Pro + Imagen 3; Đòn bẩy Context Caching; Cam kết chất lượng $\ge 95\%$ và TTFT $\le 3$s. |
| **03:00 – 04:30** (1m30s) | **TV 3 (Data)** | Kiến trúc Terraform module Data (Cloud SQL HA pgvector, GCS prefix isolation, Redis HA, Cloud Tasks queue); Luồng OAuth least-privilege. |
| **04:30 – 06:00** (1m30s) | **TV 4 (Sec)** | GKE Sandbox với runtime `gVisor` cô lập kernel; Chặn toàn bộ Egress; Cloud DLP che PII; KMS mã hóa; Kế hoạch HA Multi-AZ, RTO < 4h, RPO < 1h. |
| **06:00 – 07:00** (1m00s) | **TV 1 (Lead)** | Bảng tổng kết chi phí tháng (USD/tháng, USD/DAU); Đòn bẩy FinOps; Mở rộng khi x2 DAU; Khẳng định tính khả thi qua mã Terraform. |
| **07:00 – 10:00** (3m00s) | **Cả nhóm** | Trả lời chất vấn của Hội đồng giám khảo. |
