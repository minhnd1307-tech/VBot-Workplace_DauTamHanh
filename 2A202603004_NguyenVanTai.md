# Báo cáo kết quả cá nhân: Thành viên 1 (Lead Architect & Hạ tầng nền tảng)

| | |
|---|---|
| **Họ tên** | Nguyen Van Tai |
| **MSSV** | 2A202603004 |
| **Dự án** | VBot Workplace: kiến trúc production trên GCP cho 2.000 DAU |
| **Vai trò** | TV1: Lead Architect, Platform & SRE |
| **Component báo giá phụ trách** | `compute`, `load_balancer`, `network`, `cicd`, `ops_labor`, `licenses`, `contingency`, `TOTAL` |
| **Ngày lấy giá** | 2026-10-16, region `asia-southeast1` (Singapore), USD, giá niêm yết, chưa VAT |

---

## 1. Tóm tắt

| Hạng mục (DoD) | Trạng thái |
|---|---|
| Terraform module `network` và `gke` chạy `terraform validate` hợp lệ | ✅ Xong. `terraform validate` ở root: **Success! The configuration is valid.** |
| Root Terraform (`main.tf`, `variables.tf`, `outputs.tf`, `terraform.tfvars.example`) | ✅ Xong |
| File `Gxx_baogia.xlsx`: khung đủ 22 component, 2 sheet, dòng của TV1 đã có giá và bằng chứng | ✅ Xong. Mọi dòng của TV1 qua validator |
| File báo giá báo **ĐẠT** trên validator | ⏳ Chờ TV2, TV3, TV4 điền 17 dòng của họ. Đã thử với dữ liệu giả lập đủ dòng: **ĐẠT** |
| Sơ đồ kiến trúc thể hiện Multi-AZ (3 zone) và đủ mã component | ✅ Slide 2 |
| Slide 2, 3, 11 | ✅ Slide 2, 3 xong. ⏳ Slide 11 còn chờ số `TOTAL` cuối |

**Chi phí phần TV1:** hạ tầng cloud **553.99 USD/tháng**. Cộng nhân sự 3,500 USD và gói support (tối thiểu 29 USD) thì phần TV1 là **4,082.99 USD/tháng**.

---

## 2. Danh sách file bàn giao

| File | Nội dung |
|---|---|
| [terraform/main.tf](terraform/main.tf) | Root module. Nối 5 module, khai báo provider `google` và `google-beta` (~> 6.0) |
| [terraform/variables.tf](terraform/variables.tf) | Biến toàn cục: zone, domain, sizing node, `db_password` (không còn mật khẩu mặc định trong code) |
| [terraform/outputs.tf](terraform/outputs.tf) | Thêm output IP của LB, tên WAF policy, service account của node |
| [terraform/terraform.tfvars.example](terraform/terraform.tfvars.example) | File mẫu cấu hình |
| [terraform/modules/network/](terraform/modules/network/) | VPC, subnet, Private Service Access, firewall, Cloud NAT, IP và chứng chỉ TLS cho LB, SSL policy, Cloud Armor |
| [terraform/modules/gke/](terraform/modules/gke/) | GKE regional private cluster 3 zone, node pool app có autoscale, node pool staging Spot, service account quyền tối thiểu |
| [baogia/build_baogia.js](baogia/build_baogia.js) | Script sinh `Gxx_baogia.xlsx`. Đơn giá, SKU và giả định sizing nằm ở đầu file |
| [baogia/check_baogia.js](baogia/check_baogia.js) | Kiểm tra file xlsx bằng **đúng** đoạn validator trong `vbot-capstone.html`, kết quả giống bản web |
| [baogia/Gxx_baogia.xlsx](baogia/Gxx_baogia.xlsx) | File báo giá master (sheet `BaoGia` và `BangChung`) |
| [slides/slide02_kien_truc.png](slides/slide02_kien_truc.png) / `.svg` | Sơ đồ Slide 2 |
| [slides/slide03_luong_request.png](slides/slide03_luong_request.png) / `.svg` | Sơ đồ Slide 3 |
| [slides/TV1_slide_2_3_11.md](slides/TV1_slide_2_3_11.md) | Chữ trên slide và lời nói cho Slide 2, 3, 11 |
| [slides/gen_diagrams.js](slides/gen_diagrams.js) | Script vẽ lại 2 sơ đồ |
| [.gitignore](.gitignore) | Loại `.terraform/`, `*.tfstate`, `terraform.tfvars`, `node_modules/` khỏi git |

---

## 3. Terraform (IaC)

### 3.1 Module `network`

| Tài nguyên | Mục đích | Ràng buộc |
|---|---|---|
| `google_project_service` (compute, servicenetworking) | Module tự bật API mình cần | |
| VPC `vbot-prod-vpc` + subnet `10.10.0.0/20` (pod `10.20.0.0/16`, service `10.30.0.0/20`) | Mạng riêng cho GKE | H7 |
| `private_ip_google_access = true` | Node gọi Vertex AI qua mạng nội bộ Google, không ra Internet | H1 |
| Private Service Access (`/16` peering) | Cloud SQL và Redis của TV3 chỉ có IP private | H5 |
| Firewall: health check (35.191.0.0/16, 130.211.0.0/22) và traffic nội bộ | Mở tối thiểu | |
| Cloud Router + Cloud NAT (`min_ports_per_vm = 256`, log lỗi) | Đường duy nhất ra ngoài, để connector gọi SaaS | H3 |
| Global static IP, chứng chỉ TLS Google-managed, SSL policy `MODERN` TLS ≥ 1.2 | Phần edge của Global External ALB | H5 (mã hóa khi truyền) |
| Cloud Armor: OWASP SQLi, XSS, rate limit theo IP (6.000 request/phút), default allow | WAF trước LB | H7 |

> **Ghi chú thiết kế:** Kế hoạch ban đầu ghi "3 subnet cho 3 zone". Trên GCP, subnet là tài nguyên **regional**, nên **1 subnet đã phủ cả 3 zone**. Multi-AZ do GKE (`node_locations`) và các dịch vụ HA đảm nhận, không cần chia subnet theo zone.
>
> **Rate limit:** 2.000 nhân viên thường đi ra Internet qua vài IP NAT của văn phòng. Nếu giữ ngưỡng cũ 100 request/phút cho mỗi IP thì cả công ty sẽ bị chặn. Vì vậy ngưỡng theo IP được đặt cao (6.000/phút) để chống DDoS, còn quota theo từng user và đơn vị đặt ở LLM Gateway (H8, TV2).

### 3.2 Module `gke`

| Cấu hình | Giá trị | Lý do |
|---|---|---|
| Loại cluster | Regional, `node_locations` = asia-southeast1-a/b/c | Control plane và node trải 3 AZ (H7) |
| Private nodes, `master_authorized_networks` (biến) | Node không có IP public | Bảo mật |
| `datapath_provider = ADVANCED_DATAPATH` (Dataplane V2) | Thực thi NetworkPolicy chặn egress của sandbox (file YAML của TV4) | H3 |
| Workload Identity + `workload_metadata_config = GKE_METADATA` | Pod không đọc được metadata của node, không cần key service account | H2, H3 |
| Service account riêng cho node, 5 role tối thiểu | Không dùng default compute SA có quyền Editor | H2 |
| `autoscaling_profile = OPTIMIZE_UTILIZATION` | Scale down nhanh ngoài giờ | FinOps |
| **App pool**: e2-standard-4, 1–2 node mỗi zone (3–6 node), `BALANCED` | Ngoài giờ 3 node (vẫn đủ 3 AZ), cao điểm 6 node | H7, FinOps |
| **Staging pool**: e2-standard-4 **Spot**, 1 zone, 0–1 node, taint `env=staging` | Đề yêu cầu có 1 staging. Dùng chung cluster nên không trả thêm phí GKE | FinOps |
| Bảo trì 18:00 UTC (01:00 giờ Việt Nam) | Ngoài giờ hành chính | H7 |
| `release_channel = REGULAR`, `deletion_protection = true` | Vận hành an toàn | |

**Output cho nhóm:** `cluster_name`, `cluster_id`, `node_service_account_email` (TV4 có thể dùng lại cho sandbox pool). Output của `network`: `vpc_id`, `private_vpc_connection` (TV3 dùng), `waf_policy_name`, `lb_ip_name`, `lb_cert_name`, `ssl_policy_name` (manifest Gateway/Ingress của K8s tham chiếu theo tên).

### 3.3 Sửa lỗi tích hợp để root `terraform validate` chạy được

Trước khi sửa, `terraform validate` ở root **lỗi 3 chỗ**, đều nằm ngoài module của TV1. Với vai trò Lead tích hợp, mình sửa ở mức tối thiểu và **cần các bạn xác nhận lại**:

| File | Lỗi | Sửa |
|---|---|---|
| `modules/ai_gateway/main.tf` (TV2) | `toset(locals.services)` → "undeclared resource" | Đổi thành `local.services` |
| `modules/security_sandbox/main.tf` (TV4) | `sandbox_config` (gVisor) **không có** trong provider `google`, kể cả bản 6.50 | Thêm `provider = google-beta` cho `sandbox_pool`, thêm `versions.tf`, root truyền `providers` |
| `modules/security_sandbox/main.tf` (TV4) | DLP `limits` thiếu tham số bắt buộc `max_findings_per_item` | Thêm `max_findings_per_item = 10` |
| `variables.tf` (root) | Mật khẩu DB viết cứng trong `default` | Bỏ default. Truyền qua `terraform.tfvars` (đã gitignore) hoặc `TF_VAR_db_password` |

Còn lại: `terraform fmt -check` báo `modules/ai_gateway/main.tf` lệch căn lề. TV2 chạy `terraform fmt` là xong. Module `data` (TV3) vẫn có `db_password` mặc định trong code, nên bỏ.

**Cách kiểm tra lại:**
```bash
cd terraform
terraform init -backend=false
terraform validate      # => Success! The configuration is valid.
```

---

## 4. Báo giá

### 4.1 Nguồn đơn giá

Toàn bộ đơn giá lấy từ **Cloud Billing Catalog API** của Google (giá niêm yết công khai, USD) ngày 2026-10-16. Mỗi dòng ghi **SKU ID**, nên giám khảo có thể tra lại chính xác. Riêng gói Support lấy từ trang `cloud.google.com/support`. Không dùng free tier, trial hay credit. Với các SKU có bậc 0 USD ban đầu (Cloud Build, Artifact Registry), mình vẫn tính **toàn bộ** lượng dùng theo đơn giá có phí.

### 4.2 Giả định sizing (bản nháp, chờ TV2 chốt)

| Đại lượng | Giá trị | Căn cứ |
|---|---|---|
| Request | 25 req/user/ngày × 2.000 = 50.000/ngày × 22 ngày ≈ **1,1 triệu/tháng** | Kế hoạch nhóm (TV2) |
| Cao điểm | ~50.000 / 10 giờ ≈ 1,4 RPS trung bình, × 3 lúc cao điểm ≈ 4–5 RPS chat (~50 HTTP RPS) | |
| Pod production | ~12,75 vCPU / 25,5 GB request (web 3, gateway 3, orchestrator 3, connector 3, indexer 2, export 2, agent worker 2, guardrail 2) | Phải ≥ 2 replica ở 2 zone khác nhau |
| Node app | e2-standard-4: **3 node 24/7** (1 mỗi zone) + **3 node trong 220 giờ** cao điểm | 6 node × ~3,9 vCPU có thể cấp phát ≈ 23 vCPU, dư cho system pod và failover mất 1 zone |
| Staging | 1 node Spot, 220 giờ/tháng | |
| LB data | vào 70 GB, ra 200 GB/tháng | 1,1 triệu × 20 KB + upload; response, asset, file DOCX/XLSX/PPTX |
| Egress Internet | 220 GB/tháng (Singapore → APAC) | 200 GB qua LB + 20 GB ra SaaS |
| Cloud NAT | 300 GB/tháng | Gọi API SaaS + đồng bộ index |
| Inter-zone | 200 GB/tháng | Traffic pod ↔ pod và pod ↔ SQL/Redis giữa các zone |
| Cloud Armor | 4 rule, 15 triệu request/tháng | ~10 HTTP call mỗi request chat + asset |
| CI/CD | 10 service × 2 build/ngày × 22 ngày × 6 phút = 2.640 phút; registry 30 GB | |

### 4.3 Các dòng báo giá của TV1

| Component | Hạng mục | Cách tính | USD/tháng |
|---|---|---|---|
| compute | Phí GKE regional cluster (prod và staging chung) | 1 × 730 h × 0.10 | 73.00 |
| compute | App pool, phần nền 24/7, **CUD 1 năm** | 3 node × 730 h × 0.104159 (4 × 0.016952865 + 16 × 0.002271742) | 228.11 |
| compute | App pool, scale-out giờ cao điểm | 3 node × 220 h × 0.165332 (4 × 0.02690931 + 16 × 0.00360594) | 109.12 |
| compute | Staging pool, Spot | 1 node × 220 h × 0.099224 | 21.83 |
| compute | Boot disk PD Standard | 210.3 GB-tháng × 0.044 | 9.25 |
| load_balancer | Forwarding rule global (tới 5 rule) | 730 h × 0.025 | 18.25 |
| load_balancer | Data processing Singapore | 270 GB × 0.009 | 2.43 |
| network | Cloud NAT gateway | 5.260 VM-h × 0.0014 | 7.36 |
| network | IP của NAT | 1 × 730 h × 0.005 | 3.65 |
| network | NAT data processing | 300 GB × 0.045 | 13.50 |
| network | Egress Premium, Singapore → APAC | 220 GB × 0.12 | 26.40 |
| network | Inter-zone | 200 GB × 0.01 | 2.00 |
| network | Cloud Armor Standard | 5 + 4 × 1 + 15 × 0.75 | 20.25 |
| cicd | Cloud Build | 2.640 phút × 0.006 | 15.84 |
| cicd | Artifact Registry | 30 GB × 0.10 | 3.00 |
| ops_labor | 1 FTE SRE/MLOps | 1 × 3,500 | 3,500.00 |
| licenses | Standard Support | max(29; 3% × chi phí cloud) (**công thức Excel**) | ≥ 29.00 |
| contingency | Dự phòng cho token LLM và embedding | 10% × (llm + embedding) (**công thức Excel**) | chờ TV2 |

**Tổng theo component:** compute **441.31**, network **73.16**, load_balancer **20.68**, cicd **18.84**, tổng hạ tầng **553.99 USD**.

### 4.4 Cấu trúc file `Gxx_baogia.xlsx`

- Sheet `BaoGia` có đúng 5 cột theo đề. 22 component: 19 bắt buộc, cộng `embedding`, `licenses`, `contingency`. Dòng cuối là `TOTAL = SUM(...)`.
- 17 dòng của TV2, TV3, TV4 đã có sẵn component và ý nghĩa. Ghi chú đang để `CHỜ TVx điền`, cột Chi phí và Bằng chứng để trống.
- `licenses`, `contingency` và `TOTAL` là **công thức**, tự cập nhật khi các bạn điền số trong Excel. Lưu bằng Excel hoặc Google Sheets để có giá trị đã tính trước khi đưa vào validator.
- Sheet `BangChung` có E01–E13: mô tả, SKU, link, ngày lấy giá. Cột E để dán ảnh chụp màn hình.

**Kết quả validator (`node check_baogia.js Gxx_baogia.xlsx`):**
- File hiện tại: CHƯA ĐẠT, 35 lỗi. 34 lỗi thuộc 17 dòng đang chờ (mỗi dòng thiếu chi phí và bằng chứng). Lỗi còn lại ở dòng `contingency`: dòng này bằng 0 vì chưa có số `llm`.
- Bản giả lập đã điền đủ 17 dòng: **ĐẠT**, `TOTAL` khớp tổng các dòng.

---

## 5. Slide phụ trách

| Slide | Nội dung | File |
|---|---|---|
| 2: Kiến trúc tổng thể | Sơ đồ đủ 19 component bắt buộc, mỗi hộp ghi mã component, thể hiện 3 zone, VPC, Private Service Access, Private Google Access, NAT → SaaS | `slides/slide02_kien_truc.png` |
| 3: Luồng một request | Sequence 10 lane, 12 bước: SSO → WAF/LB → RBAC → guardrail/DLP → RAG lọc ACL → connector với OAuth của user → routing LLM → stream → sandbox gVisor → người dùng xác nhận → trả kết quả | `slides/slide03_luong_request.png` |
| 11: Chi phí và FinOps | Khung slide, bảng phần TV1, 4 đòn bẩy tiết kiệm có số USD, ý chính khi DAU gấp đôi | `slides/TV1_slide_2_3_11.md` |

**Đòn bẩy FinOps của phần hạ tầng** (so với 6 node on-demand chạy 24/7 và staging chạy riêng 24/7):

| Đòn bẩy | Tiết kiệm/tháng |
|---|---|
| Autoscale theo giờ hành chính (3 node nền, +3 node trong 220 giờ) | 252.96 |
| Committed use 1 năm cho 3 node nền (giảm 37%) | 133.97 |
| Staging trên Spot, chỉ chạy giờ hành chính | 98.86 |
| Staging chung cluster với prod | 73.00 |
| **Tổng** | **558.79** |

---

## 6. Việc còn lại và phụ thuộc

| # | Việc | Ai | Ghi chú |
|---|---|---|---|
| 1 | Chốt bảng sizing (RPS, token, GB) | TV2 | Nếu khác giả định ở mục 4.2, sửa khối `S` trong `build_baogia.js` rồi chạy lại |
| 2 | Điền 17 dòng báo giá (component, chi phí, bằng chứng) | TV2, TV3, TV4 | Điền thẳng trong Excel hoặc vào mảng `TEAM_ROWS` |
| 3 | Chụp ảnh bằng chứng E01–E13 dán vào `BangChung` (ảnh phải thấy tên dịch vụ, SKU, region, đơn giá) | TV1 | Link đã có, chỉ còn chụp ảnh |
| 4 | Chạy `check_baogia.js` và validator trên web đến khi **ĐẠT**, sau đó đổi tên file `Gxx` thành mã nhóm | TV1 | |
| 5 | Điền `TOTAL`, USD/DAU, top 5 hạng mục vào Slide 11 | TV1 | Phải khớp 100% với dòng `TOTAL` |
| 6 | Xác nhận các chỗ sửa trong module của mình (mục 3.3) | TV2, TV4 | |
| 7 | Nếu TV4 đổi số node sandbox, cập nhật `sandboxNodesForNat` | TV4 → TV1 | Ảnh hưởng dòng Cloud NAT |

---

## 7. Cách chạy lại

```bash
# Terraform
cd terraform && terraform init -backend=false && terraform validate

# Báo giá: sinh file và kiểm tra (Node.js 18+)
cd baogia && npm install
node build_baogia.js          # tạo Gxx_baogia.xlsx
node check_baogia.js Gxx_baogia.xlsx

# Sơ đồ slide
cd slides && npm install && node gen_diagrams.js
```
