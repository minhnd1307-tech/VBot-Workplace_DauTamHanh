# VBot Workplace - Production Capstone Architecture (GCP)
## ĐỒ ÁN CAPSTONE: TRỢ LÝ AI DOANH NGHIỆP TRÊN GOOGLE CLOUD PHỤC VỤ 2.000 DAU

Dự án thiết kế và triển khai kiến trúc Production cho **VBot Workplace** trên nền tảng **Google Cloud Platform (GCP)** phục vụ 2.000 người dùng hoạt động mỗi ngày (DAU), đáp ứng nghiêm ngặt 8 ràng buộc cứng (**H1 – H8**), đạt chuẩn công cụ kiểm tra báo giá XLSX (**ĐẠT - XANH LÁ**), bộ mã nguồn **Terraform (IaC)** mô-đun hóa 100% hợp lệ, bộ tài liệu Sizing tải trọng, Slide thuyết trình và Kịch bản bảo vệ trước Hội đồng.

---

## 1. PHÂN CÔNG VÀ KẾ HOẠCH TỔNG THỂ
Chi tiết phân công nhiệm vụ và ma trận phụ thuộc được quy định tại:
👉 [KE_HOACH_PHAN_CONG_NHOM_VBOT.md](KE_HOACH_PHAN_CONG_NHOM_VBOT.md)

---

## 2. BỘ TÀI LIỆU & SẢN PHẨM HOÀN CHỈNH CỦA THÀNH VIÊN 2 (AI SPECIALIST)

Thành viên 2 phụ trách **"Trái tim"** của hệ thống: Bài toán Sizing tải lượng 2.000 DAU (Đường găng quyết định), Chiến lược Model & Dynamic Routing, Khung đo Benchmark chất lượng H8, Module Terraform `ai_gateway`, Báo giá các component `llm`, `embedding`, `gateway`, Slide 1, 4, 5 và Kịch bản Pitching.

### Danh mục sản phẩm đã hoàn thiện:
1. 📊 **Bảng Sizing Tải Trọng & Bàn Giao Kỹ Thuật (TV1, TV3, TV4):**
   * File: [TV2_SIZING_VA_MODEL_ARCHITECTURE.md](TV2_SIZING_VA_MODEL_ARCHITECTURE.md)
   * Chi tiết công thức: 2.000 DAU $\to$ 50.000 req/ngày $\to$ 1.100.000 req/tháng.
   * Phân bổ 5 cấp độ tác vụ, tính toán Token In/Out, Peak RPS = 3,5 req/s, Peak Input TPS = 11.000 token/s.
   * Bảng bàn giao thông số chính thức giải tỏa đường găng cho TV1, TV3, TV4.
2. 🧠 **Chiến Lược Model, FinOps Context Caching & Benchmark H8:**
   * File: [TV2_STRATEGY_FINOPS_BENCHMARK.md](TV2_STRATEGY_FINOPS_BENCHMARK.md)
   * Phân tích điểm hòa vốn (Break-even): Serverless API ($3.431/tháng) rẻ hơn gấp 7 lần so với tự host GPU trên GKE ($23.000+/tháng); chỉ hòa vốn khi vượt 55.000 DAU.
   * Đòn bẩy Vertex AI Context Caching: Giảm 75% giá input token cho prompt cố định.
3. 🏆 **Báo Cáo Đánh Giá Chất Lượng Mô Hình (Eval Gate H8):**
   * File: [EVAL_GATE_REPORT.md](EVAL_GATE_REPORT.md) & Script [eval_benchmark.py](eval_benchmark.py)
   * Đo lường trên Golden Dataset 500 mẫu với phương pháp LLM-as-a-Judge so với GPT-4o: **Đạt 97,50% chất lượng** (Vượt chuẩn $\ge 95\%$ của đề bài H8).
4. 📈 **File Báo Giá Tổng Hợp Đạt Chuẩn Validator Web (Xanh Lá 100%):**
   * File: [G03_baogia.xlsx](G03_baogia.xlsx)
   * Script sinh tự động: [generate_baogia.py](generate_baogia.py)
   * Script kiểm thử validator: [validate_baogia.mjs](validate_baogia.mjs)
   * Kết quả: **Verdict OK: ĐẠT (XANH LÁ)**, 0 lỗi, 0 cảnh báo. Tổng chi phí: **$11.260,64 / tháng** (~$5.63 / DAU / tháng).
   * ⚠️ **Bản chốt (TV1 & TV3):** các dòng `compute`, `load_balancer`, `network`, `cicd`, `ops_labor`, `licenses`, `contingency` (TV1) và `database`, `cache_queue`, `object_storage`, `connectors`, `vector_db` (TV3) đã được chuẩn hóa theo giá Singapore có SKU chính thức. File được sinh bằng `node baogia/build_baogia.js` (dòng TV2/TV3/TV4 nằm trong [baogia/team_rows.json](baogia/team_rows.json)). **Không chạy lại `generate_baogia.py`** vì sẽ ghi đè các dòng chuẩn hóa. Muốn sửa dòng của mình thì sửa `team_rows.json` rồi chạy lại `build_baogia.js`.
5. 💻 **Mã Nguồn Microservice AI Gateway:**
   * File: [ai_gateway_service.py](ai_gateway_service.py)
   * Tích hợp gọi thực tế Vertex AI Google Cloud với model `gemini-3.8-flash`, hỗ trợ dynamic routing 5 cấp độ, tính toán quota H8 và đo SLA TTFT H6.
6. 📑 **Nội Dung Slide Thuyết Trình TV2 (Slide 1, Slide 4, Slide 5):**
   * File: [SLIDE_TV2_NOI_DUNG.md](SLIDE_TV2_NOI_DUNG.md)
   * Đầy đủ công thức, infographic layout, biểu đồ và số liệu kỹ thuật sắc bén.
7. 🎤 **Kịch Bản Thuyết Trình Bảo Vệ 1m45s Cho TV2:**
   * File: [KICH_BAN_PITCHING_TV2.md](KICH_BAN_PITCHING_TV2.md)
   * Khớp đúng khung giờ 01:15 đến 03:00, tự tin, chuyên nghiệp, kèm bộ câu hỏi Q&A dự phòng.

---

## 3. BỘ SẢN PHẨM CÁC THÀNH VIÊN TRONG NHÓM

| Thành viên | Vai trò | Sản phẩm chính | Báo cáo cá nhân |
|---|---|---|---|
| **TV 1 (Nguyen Van Tai)** | Lead Architect & Platform | Module Terraform `network`, `gke`; file báo giá [G03_baogia.xlsx](G03_baogia.xlsx); Slide 2, 3, 11; kịch bản [KICH_BAN_PITCHING_TV1.md](KICH_BAN_PITCHING_TV1.md) | [2A202603004_NguyenVanTai.md](2A202603004_NguyenVanTai.md) |
| **TV 2 (Nguyen Duc Minh)** | AI & Model Specialist | Sizing tải lượng 2.000 DAU, Routing 5 cấp, Eval Gate H8, [ai_gateway_service.py](ai_gateway_service.py), Slide 1, 4, 5, [KICH_BAN_PITCHING_TV2.md](KICH_BAN_PITCHING_TV2.md) | [SLIDE_TV2_NOI_DUNG.md](SLIDE_TV2_NOI_DUNG.md) |
| **TV 3 (Lam Hoang Phuc)** | Data & Workspace | Module Terraform `data` (Cloud SQL HA pgvector, GCS, Redis HA, Tasks), kiểm thử RLS [run_isolation_test.sh](tv3_data/run_isolation_test.sh) (7/7 PASS), Slide 6, 7, 12 | [TV3_LamHoangPhuc.md](TV3_LamHoangPhuc.md) |
| **TV 4 (Nguyen Huy Hung)** | Security, Sandbox & DR | Module Terraform `security_sandbox` (gVisor, KMS, DLP), kiểm thử [run_security_tests.sh](tv4_security/run_security_tests.sh) (9/9 PASS), Slide 8, 9, 10, [KICH_BAN_PITCHING_TV4.md](KICH_BAN_PITCHING_TV4.md) | [TV4_NguyenHuyHung.md](TV4_NguyenHuyHung.md) |

---

## 4. MÃ NGUỒN TERRAFORM INFRASTRUCTURE AS CODE (IaC)
Toàn bộ hạ tầng GCP được mã hóa bằng Terraform chuẩn mô-đun hóa tại thư mục [terraform/](terraform/):
* `terraform/modules/ai_gateway/`: (TV2) Kích hoạt Vertex AI APIs, Artifact Registry, Monitoring Alert Policy (H8), Audit Log Bucket 12 tháng (H5), Vertex AI Private Endpoint.
* `terraform/modules/network/`: (TV1) VPC Custom, Private Subnets, Cloud NAT Multi-AZ, Cloud Armor WAF.
* `terraform/modules/gke/`: (TV1) Cụm GKE Standard Multi-AZ, Workload Identity, Autoscaling Node Pool.
* `terraform/modules/data/`: (TV3) Cloud SQL HA PG16 + pgvector, GCS Workspaces (CMEK, prefix), Redis HA, Cloud Tasks, Pub/Sub + Scheduler cho connectors.
* `terraform/modules/security_sandbox/`: (TV4) GKE Sandbox gVisor Node Pool, Cloud KMS, Secret Manager, Cloud DLP.

---

## 5. HƯỚNG DẪN KIỂM TRA NHANH (QUICK START)

1. **Kiểm tra file Báo giá qua bộ kiểm tra:**
   ```bash
   cd baogia && npm install && node check_baogia.js ../G03_baogia.xlsx
   # Output: ==> DAT (TOTAL: 11260.64 USD, 5.63 USD/DAU)
   ```
2. **Chạy bài kiểm tra Chất lượng Benchmark (H8 - TV2):**
   ```bash
   python eval_benchmark.py
   # Output: OVERALL QUALITY RATIO: 97.50% -> PASSED
   ```
3. **Chạy bài kiểm tra Cô lập Dữ liệu (H3 - TV3):**
   ```bash
   bash tv3_data/run_isolation_test.sh
   # Output: 7/7 PASSED
   ```
4. **Chạy bài kiểm tra Bảo mật Sandbox & Độ tin cậy (H2, H3, H4, H5, H7 - TV4):**
   ```bash
   bash tv4_security/run_security_tests.sh
   # Output: 9/9 PASS (100.0%) -> TOÀN BỘ CƠ CHẾ ĐẠT CHUẨN
   ```
5. **Sinh lại toàn bộ Sơ đồ Slide (16:9 SVG + PNG):**
   ```bash
   cd slides && npm install
   node gen_diagrams.js      # Slide 2, 3, 11 (TV1)
   node gen_tv3_diagrams.js  # Slide 6, 7 (TV3)
   node gen_tv4_diagrams.js  # Slide 8, 9, 10 (TV4)
   ```