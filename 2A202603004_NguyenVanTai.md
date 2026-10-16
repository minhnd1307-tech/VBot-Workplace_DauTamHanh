# Báo cáo kết quả cá nhân: Thành viên 1 (Lead Architect & Hạ tầng nền tảng)

| | |
|---|---|
| **Họ tên** | Nguyen Van Tai |
| **MSSV** | 2A202603004 |
| **Nhóm** | G03 |
| **Dự án** | VBot Workplace: kiến trúc production trên GCP cho 2.000 DAU |
| **Vai trò** | TV1: Lead Architect, Platform & SRE |
| **Component báo giá phụ trách** | `compute`, `load_balancer`, `network`, `cicd`, `ops_labor`, `licenses`, `contingency`, `TOTAL` |
| **Ngày lấy giá** | 2026-10-16, region `asia-southeast1` (Singapore), USD, giá niêm yết, chưa VAT |

---

## 1. Tóm tắt

| Hạng mục (DoD) | Trạng thái |
|---|---|
| Terraform module `network` và `gke` chạy `terraform validate` hợp lệ | ✅ `Success! The configuration is valid.` (validate ở root, gồm cả 5 module) |
| Root Terraform (`main.tf`, `variables.tf`, `outputs.tf`, `terraform.tfvars.example`) | ✅ |
| Gom báo giá của 4 thành viên vào `G03_baogia.xlsx` và validator báo **ĐẠT** | ✅ **ĐẠT, 0 lỗi, 0 cảnh báo** |
| Chốt TOTAL đồng bộ với Slide 11 | ✅ **11,260.64 USD/tháng**, tức **5.63 USD/DAU**. Hình Slide 11 được sinh trực tiếp từ file báo giá |
| Sơ đồ kiến trúc thể hiện Multi-AZ (3 zone) và đủ mã component | ✅ Slide 2 |
| Slide 2, 3, 11 và phần mở đầu, kết luận khi thuyết trình | ✅ Hình, nội dung và kịch bản 2 phút 15 giây kèm 7 câu hỏi đáp dự phòng |

**Chi phí phần TV1:** compute **284.84**, network **103.19**, load_balancer **31.75**, cicd **18.84**; ops_labor **3,500**, licenses **216.19**, contingency **338.10** (USD/tháng).

---

## 2. Danh sách file bàn giao

| File | Nội dung |
|---|---|
| [terraform/main.tf](terraform/main.tf), [variables.tf](terraform/variables.tf), [outputs.tf](terraform/outputs.tf), [terraform.tfvars.example](terraform/terraform.tfvars.example) | Root module: nối 5 module, provider `google` và `google-beta` `~> 6.0`, biến sizing, `db_password` không có giá trị mặc định |
| [terraform/modules/network/](terraform/modules/network/) | VPC, subnet, Private Service Access, firewall, Cloud NAT, IP và chứng chỉ TLS cho LB, SSL policy, Cloud Armor |
| [terraform/modules/gke/](terraform/modules/gke/) | GKE regional private cluster 3 zone, app pool 1→4 node, staging pool Spot, service account quyền tối thiểu |
| [k8s/app-office-hours-scaler.yaml](k8s/app-office-hours-scaler.yaml) | CronJob nâng replica lúc 07:45 và hạ lúc 18:15 (T2–T6), đi kèm autoscale của node pool |
| [G03_baogia.xlsx](G03_baogia.xlsx) | **File báo giá nộp bài** (sheet `BaoGia` và `BangChung`) |
| [baogia/build_baogia.js](baogia/build_baogia.js) | Sinh `G03_baogia.xlsx`: dòng TV1 tính từ đơn giá có SKU, dòng nhóm lấy từ `team_rows.json` |
| [baogia/team_rows.json](baogia/team_rows.json) | 15 dòng của TV2, TV3, TV4 cùng bằng chứng, trích nguyên văn từ bản G03 của TV2 |
| [baogia/check_baogia.js](baogia/check_baogia.js) | Kiểm tra bằng **đúng** đoạn validator trong `vbot-capstone.html` |
| [slides/slide02_kien_truc.png](slides/slide02_kien_truc.png), [slide03_luong_request.png](slides/slide03_luong_request.png), [slide11_chi_phi.png](slides/slide11_chi_phi.png) | Hình Slide 2, 3, 11, có cả bản `.svg` |
| [slides/TV1_slide_2_3_11.md](slides/TV1_slide_2_3_11.md), [slides/gen_diagrams.js](slides/gen_diagrams.js) | Nội dung slide và script vẽ lại hình |
| [KICH_BAN_PITCHING_TV1.md](KICH_BAN_PITCHING_TV1.md) | Kịch bản 00:00–01:15 và 06:00–07:00, bộ câu hỏi đáp của TV1 |

---

## 3. Terraform (IaC)

### 3.1 Module `network`

| Tài nguyên | Mục đích | Ràng buộc |
|---|---|---|
| VPC `vbot-prod-vpc` + subnet regional `10.10.0.0/20` (pod `10.20.0.0/16`, service `10.30.0.0/20`) | Mạng riêng cho GKE; 1 subnet regional phủ cả 3 zone | H7 |
| `private_ip_google_access = true` | Gọi Vertex AI qua mạng nội bộ Google, không ra Internet | H1 |
| Private Service Access (`/16`) | Cloud SQL và Redis (TV3) chỉ có IP private | H5 |
| Firewall: health check (35.191.0.0/16, 130.211.0.0/22) và traffic nội bộ | Mở tối thiểu | |
| Cloud Router + Cloud NAT (1 gateway regional, managed) | Đường ra ngoài duy nhất, cho connector gọi SaaS | H3 |
| Global IP, chứng chỉ TLS Google-managed, SSL policy `MODERN` TLS ≥ 1.2 | Phần edge của Global External ALB | H5 |
| Cloud Armor: OWASP SQLi, XSS, rate limit theo IP (6.000 request/phút) | WAF. Quota theo user nằm ở LLM Gateway (TV2) | H7, H8 |

> Kế hoạch ban đầu ghi "3 subnet / 3 zone", nhưng trên GCP subnet là tài nguyên regional nên 1 subnet đã phủ cả 3 zone. Bảng sizing của TV2 ghi "2 Cloud NAT gateway", nhưng Cloud NAT là dịch vụ managed, tự HA, nên 1 gateway là đủ. Ngưỡng rate limit theo IP đặt cao vì cả công ty đi ra qua vài IP NAT văn phòng.

### 3.2 Module `gke`

| Cấu hình | Giá trị | Lý do |
|---|---|---|
| Cluster | Regional, `node_locations` = asia-southeast1-a/b/c, private nodes | H7, bảo mật |
| Dataplane V2 | Thực thi NetworkPolicy chặn egress của sandbox (TV4) | H3 |
| Workload Identity, `GKE_METADATA`, service account riêng với 5 role | Pod không đọc được metadata của node, không cần key | H2, H3 |
| **App pool** e2-standard-4, `total_min_node_count = 1`, `total_max_node_count = 4`, `BALANCED` | Theo sizing TV2 (peak 3,5 RPS → 4 node). Ngoài giờ còn 1 node, giờ hành chính 4 node trải 3 AZ | H7, FinOps |
| **Staging pool** e2-standard-4 Spot, 0–1 node, taint `env=staging` | Đề yêu cầu 1 staging; chung cluster nên không thêm phí GKE | FinOps |
| `OPTIMIZE_UTILIZATION`, bảo trì 01:00 giờ Việt Nam, `REGULAR` channel, `deletion_protection` | Vận hành | H7 |

**Output cho nhóm:** `cluster_name`, `node_service_account_email`; từ module network: `vpc_id`, `private_vpc_connection`, `waf_policy_name`, `lb_ip_name`, `lb_cert_name`, `ssl_policy_name`.

### 3.3 Tích hợp

- Lúc đầu, root `terraform validate` lỗi 3 chỗ trong module của TV2 và TV4 (`locals.services`, `sandbox_config` cần `google-beta`, DLP thiếu `max_findings_per_item`). Commit `4351ac4` của TV2 sửa trùng đúng các lỗi này. Khi merge, mình giữ bản của TV2 cho module của họ, còn root thống nhất về provider `~> 6.0`.
- Bỏ mật khẩu DB viết cứng ở root: truyền qua `terraform.tfvars` (đã `.gitignore`) hoặc `TF_VAR_db_password`.

```bash
cd terraform && terraform init -backend=false && terraform validate   # Success!
```

---

## 4. Báo giá `G03_baogia.xlsx`

### 4.1 Rà soát và chỉnh các dòng TV1 trong bản G03 của TV2

| Dòng | Bản trước | Vấn đề | Bản chốt |
|---|---|---|---|
| compute | 239.83 | Giá 0.134 USD/giờ là giá region Mỹ (Singapore là 0.165332); 4 node chỉ chạy 220 giờ nên ban đêm không còn node nào | **284.84** |
| load_balancer | 30.25 | Data processing ở Singapore là 0.009 USD/GB, không phải 0.008 | **31.75** |
| network | 150.70 | "2 NAT × 730 giờ × 0.045": 0.045 là giá mỗi GB, giá gateway là 0.0014 USD/VM-giờ | **103.19** |
| cicd | 8.60 | Cloud Build e2-standard-2 là 0.006 USD/phút, không phải 0.003 | **18.84** |
| licenses | 500.00 | Enhanced Support tính 10% chi phí (khoảng 700), con số 500 không khớp bằng chứng | **216.19** (Standard, 3%) |
| contingency | 500.00 | "5% tổng" không khớp phép tính | **338.10** (10% × llm + embedding) |

Đề trừ 5 điểm cho mỗi dòng có bằng chứng không khớp đơn giá. Sau khi TV1 và TV3 chuẩn hóa đơn giá theo SKU thật, **TOTAL chốt ở 11,260.64 USD (5.63 USD/DAU)**.

### 4.2 Sizing dùng cho các dòng TV1 (theo bảng bàn giao của TV2)

| Đại lượng | Giá trị | Nguồn |
|---|---|---|
| Request | 50.000/ngày, 1,1 triệu/tháng; peak 3,5 RPS | TV2 |
| Node app | 1 node 24/7 + 3 node trong 220 giờ hành chính = 4 node trải 3 AZ | TV2: "4 node e2-standard-4, đêm xuống 1 node" |
| LB data / Egress | 1.500 GB / 500 GB mỗi tháng | TV2 |
| NAT data, inter-zone | 300 GB, 200 GB | TV1 ước lượng (connector, traffic giữa zone) |
| Sandbox gắn NAT | 5 node × 220 giờ | Dòng sandbox của TV4 |
| Cloud Armor | 4 rule, 15 triệu request | ~10 HTTP call cho mỗi request chat |
| CI/CD | 2.640 phút build, 30 GB registry | 10 service × 2 build/ngày |

### 4.3 Các dòng của TV1

| Component | Hạng mục | Cách tính | USD |
|---|---|---|---|
| compute | Phí GKE regional (prod + staging chung) | 730 h × 0.10 | 73.00 |
| compute | 1 node nền 24/7, CUD 1 năm | 730 h × 0.104159 | 76.04 |
| compute | 3 node giờ hành chính | 3 × 220 h × 0.165332 | 109.12 |
| compute | Staging Spot | 220 h × 0.099224 | 21.83 |
| compute | Boot disk PD Standard | 110.3 GB-tháng × 0.044 | 4.85 |
| load_balancer | Forwarding rule global | 730 h × 0.025 | 18.25 |
| load_balancer | Data processing | 1.500 GB × 0.009 | 13.50 |
| network | NAT gateway | 2.710 VM-h × 0.0014 | 3.79 |
| network | IP của NAT | 730 h × 0.005 | 3.65 |
| network | NAT data | 300 GB × 0.045 | 13.50 |
| network | Egress Singapore → APAC | 500 GB × 0.12 | 60.00 |
| network | Inter-zone | 200 GB × 0.01 | 2.00 |
| network | Cloud Armor | 5 + 4 × 1 + 15 × 0.75 | 20.25 |
| cicd | Cloud Build | 2.640 phút × 0.006 | 15.84 |
| cicd | Artifact Registry | 30 GB × 0.10 | 3.00 |
| ops_labor | 1 FTE SRE/MLOps | 3,500 | 3,500.00 |
| licenses | Standard Support | max(29; 3% × 7,206.35) (công thức Excel) | 216.19 |
| contingency | Dự phòng token | 10% × (3,369.01 + 12) (công thức Excel) | 338.10 |

Toàn bộ đơn giá lấy từ **Cloud Billing Catalog API** của Google, mỗi dòng ghi SKU ID. Bằng chứng TV1 là E16–E28 trong sheet `BangChung`, đánh số tiếp sau E01–E13 của nhóm. Không dùng free tier hay credit.

---

## 5. Slide và thuyết trình

| Slide | Nội dung |
|---|---|
| 2: Kiến trúc tổng thể | Đủ 19 component bắt buộc, mỗi hộp ghi mã; 3 zone; VPC, Private Service Access, Private Google Access, NAT → SaaS |
| 3: Luồng một request | 10 lane, 12 bước: SSO → WAF/LB → RBAC → guardrail/DLP → RAG lọc ACL → connector với OAuth của user → routing LLM → stream → sandbox gVisor → người dùng xác nhận |
| 11: Chi phí | **11,260.64 USD · 5.63 USD/DAU**, top 5 hạng mục, 6 đòn bẩy tiết kiệm **3,619.48 USD/tháng** (TV1: 469.48, TV2: 3,150) |

Kịch bản và 7 câu hỏi đáp (AZ sập lúc 10 giờ, scale ngoài giờ, chi phí egress/NAT/WAF, 1 hay 2 NAT, GKE so với Cloud Run, 1 FTE và gói support, nguồn giá) nằm ở [KICH_BAN_PITCHING_TV1.md](KICH_BAN_PITCHING_TV1.md).

---

## 6. Lưu ý cho nhóm

1. **Không chạy lại `generate_baogia.py`** vì nó sẽ ghi đè các dòng TV1. Muốn sửa dòng của mình thì sửa [baogia/team_rows.json](baogia/team_rows.json), rồi chạy `node baogia/build_baogia.js`, `node baogia/check_baogia.js G03_baogia.xlsx` và `node slides/gen_diagrams.js` để Slide 11 khớp lại.
2. **Kiến trúc và báo giá đang lệch nhau ở 2 chỗ (TV2 xử lý):** dòng `gateway` ghi "2 container Cloud Run", nhưng sơ đồ và Terraform đặt LLM Gateway trong GKE. Tài liệu ghi "Gemini 3.8 Flash" cần đối chiếu với tên model thật trên trang giá Vertex AI.
3. **TV4:** Terraform đặt sandbox pool `min_node_count = 1` mỗi zone (3 node chạy 24/7), trong khi báo giá tính 2 node × 2 AZ × 220 giờ. Cần thống nhất một trong hai.
4. **Ảnh chụp bằng chứng:** sheet `BangChung` đã có link chính thức và cột E để dán ảnh chụp màn hình. Nên dán ảnh cho các mã E16–E28 trước khi nộp.

---

## 7. Cách chạy lại

```bash
cd terraform && terraform init -backend=false && terraform validate
cd ../baogia && npm install && node build_baogia.js && node check_baogia.js ../G03_baogia.xlsx
cd ../slides && npm install && node gen_diagrams.js
```
