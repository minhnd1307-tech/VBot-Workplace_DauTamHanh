# Báo cáo kết quả cá nhân: Thành viên 2 (AI, Model & Gateway Specialist)

| | |
|---|---|
| **Họ tên** | Nguyễn Đức Minh |
| **MSSV** | 2A202602891 |
| **Nhóm** | G03 |
| **Dự án** | VBot Workplace: kiến trúc production trên GCP cho 2.000 DAU |
| **Vai trò** | TV2: AI, Model & Gateway Specialist (AI Engineer) |
| **Component báo giá phụ trách** | `llm`, `embedding`, `gateway` |
| **Ngày lấy giá** | 2026-10-16, region `asia-southeast1` (Singapore), USD, giá niêm yết Google Cloud Vertex AI, chưa VAT |

---

## 1. Tóm tắt

| Hạng mục (DoD) | Trạng thái |
|---|---|
| Bài toán Sizing 2.000 DAU chi tiết (Tokens In/Out, Peak RPS/TPS, SLA H6) | ✅ **Hoàn thành**. Bàn giao chính thức thông số giải phóng đường găng cho TV1, TV3, TV4 |
| Module Terraform `ai_gateway` (Vertex AI APIs, Endpoint, Quota Alert H8, Audit Log 12 tháng H5) | ✅ `Success! The configuration is valid.` |
| Báo giá 3 component `llm`, `embedding`, `gateway` với đơn giá SKU và bằng chứng chính thức | ✅ **0 lỗi validator**. Đã gộp vào `G03_baogia.xlsx` đạt **TOTAL 11.260,64 USD** |
| Đòn bẩy FinOps (Context Caching, Dynamic Routing) & Phân tích điểm hòa vốn | ✅ Tiết kiệm **3.150 USD/tháng**. Chứng minh hòa vốn GPU chỉ khi $\ge 55.000$ DAU |
| Khung đánh giá chất lượng mô hình (Eval Gate) đạt chuẩn H8 ($\ge 95\%$) | ✅ **97,50% chất lượng** so với GPT-4o trên Golden Dataset 500 mẫu ([EVAL_GATE_REPORT.md](EVAL_GATE_REPORT.md)) |
| Kết nối thực tế Vertex AI Google Cloud (`gemini-3.8-flash`) | ✅ **HTTP 200 OK** LIVE qua [ai_gateway_service.py](ai_gateway_service.py) |
| Slide 1, 4, 5 và Kịch bản thuyết trình bảo vệ 1 phút 45 giây (01:15 – 03:00) | ✅ Hoàn thành đầy đủ kèm bộ câu hỏi Q&A dự phòng |

**Chi phí phần TV2 phụ trách:** `llm` **3.369,01**, `embedding` **12,00**, `gateway` **50,00** $\implies$ **Tổng cộng:** **3.431,01 USD/tháng** (~**1,71 USD/DAU/tháng**).

---

## 2. Danh sách file bàn giao

| File | Nội dung |
|---|---|
| [TV2_SIZING_VA_MODEL_ARCHITECTURE.md](TV2_SIZING_VA_MODEL_ARCHITECTURE.md) | Tài liệu bài toán Sizing tải 2.000 DAU, 5 cấp độ tác vụ, Peak RPS 3.5, Peak Input TPS 11.000, ma trận bàn giao cho TV1, TV3, TV4 |
| [TV2_STRATEGY_FINOPS_BENCHMARK.md](TV2_STRATEGY_FINOPS_BENCHMARK.md) | Chiến lược Model, đòn bẩy FinOps Context Caching (-75%), phân tích TCO Serverless vs GPU, khung đo H8 |
| [EVAL_GATE_REPORT.md](EVAL_GATE_REPORT.md) & [eval_benchmark.py](eval_benchmark.py) | Báo cáo và script chạy kiểm định chất lượng LLM-as-a-Judge đạt **97,50%** so với GPT-4o |
| [ai_gateway_service.py](ai_gateway_service.py) | Mã nguồn microservice AI Gateway: dynamic routing 5 cấp, quota rate limit H8, TTFT SLA H6, gọi LIVE Vertex AI Gemini 3.8 Flash |
| [terraform/modules/ai_gateway/](terraform/modules/ai_gateway/) | Module Terraform: kích hoạt 12 core APIs, Artifact Registry, Monitoring Alert Policy (H8), Audit Logging Bucket 365 ngày (H5), Vertex AI Private Endpoint |
| [SLIDE_TV2_NOI_DUNG.md](SLIDE_TV2_NOI_DUNG.md) | Nội dung chi tiết chuẩn tỷ lệ 16:9 cho Slide 1, Slide 4, Slide 5 |
| [KICH_BAN_PITCHING_TV2.md](KICH_BAN_PITCHING_TV2.md) | Kịch bản bảo vệ 1m45s (01:15 đến 03:00) và câu hỏi đáp Q&A dự phòng |
| [baogia/team_rows.json](baogia/team_rows.json) | Dữ liệu 3 dòng của TV2 (`llm`, `embedding`, `gateway`) tích hợp cùng TV3, TV4 để TV1 xuất file Excel master |
| [slides/gen_tv2_diagrams.js](slides/gen_tv2_diagrams.js) | Script sinh sơ đồ kiến trúc Slide 1, 4, 5 (SVG/PNG) |

---

## 3. Terraform (IaC): Module `ai_gateway`

### 3.1 Tài nguyên triển khai
* **Kích hoạt Dịch vụ Google Cloud:** Khai báo qua `google_project_service` với danh sách 12 API cốt lõi (`aiplatform.googleapis.com`, `dlp.googleapis.com`, `cloudkms.googleapis.com`, `secretmanager.googleapis.com`, `container.googleapis.com`, `sqladmin.googleapis.com`, `redis.googleapis.com`, `cloudtasks.googleapis.com`, `monitoring.googleapis.com`, `logging.googleapis.com`, `artifactregistry.googleapis.com`, `cloudbuild.googleapis.com`).
* **Artifact Registry:** Lưu trữ các container image bản build của AI Gateway và microservices.
* **Cloud Monitoring Alert Policy (Ràng buộc H8):** Cảnh báo tức thì khi lưu lượng request hoặc lượng token vượt ngưỡng ngân sách định mức (`ALIGN_RATE` trên `serviceruntime.googleapis.com/api/request_count`).
* **Cloud Logging Audit Bucket (Ràng buộc H5):** Lưu trữ toàn bộ Audit Log truy cập và hành vi Agent trong đúng **365 ngày (12 tháng)** (`retention_days = 365`).
* **Vertex AI Endpoint:** Private Endpoint phục vụ AI Gateway routing và Vertex AI Model deployment trong mạng VPC.

### 3.2 Kiểm tra cú pháp
```bash
cd terraform && terraform init -backend=false && terraform validate
# Output: Success! The configuration is valid.
```

---

## 4. Bài toán Sizing Tải Trọng 2.000 DAU & Báo Giá

### 4.1 Bảng Sizing Tải Chi Tiết

* **Cơ sở tính toán:** 2.000 DAU $\times$ 25 req/user = **50.000 req/ngày** (**1.100.000 req/tháng** / 22 ngày làm việc = 220 giờ hành chính).

| Cấp tác vụ | Nghiệp vụ | Tỉ lệ | Req/ngày | Model phục vụ | Input Token / req | Output Token / req | Tổng Token In/tháng | Tổng Token Out/tháng |
| :---: | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **Cấp 1** | Email, FAQ, tra cứu RAG | 45% | 22.500 | Gemini 3.8 Flash | 1.500 | 300 | 742,5M | 148,5M |
| **Cấp 2** | Tài liệu, slide, biên bản | 25% | 12.500 | Gemini 3.8 Flash | 3.500 | 800 | 962,5M | 220,0M |
| **Cấp 3** | Xử lý dữ liệu, code sandbox | 15% | 7.500 | Gemini 3.8 Flash | 4.000 | 1.000 | 660,0M | 165,0M |
| **Cấp 4** | Agent dự án Jira/Confluence | 12% | 6.000 | Gemini Pro | 8.000 | 1.500 | 1.056,0M | 198,0M |
| **Cấp 5** | Mockup UI, sơ đồ | 3% | 1.500 | Imagen 3 on Vertex AI | 2.000 | 1 ảnh | 66,0M | 33.000 ảnh |
| **TỔNG** | | **100%** | **50.000** | | | | **3.487,0M** | **731,5M + 33k ảnh** |

### 4.2 Giờ cao điểm và Cam kết SLA (H6)
* **Average RPS:** $50.000 / 36.000\text{s} = 1,39 \text{ req/s}$.
* **Hệ số tập trung cao điểm ($k_{\text{peak}} = 2,5$):**
  $$\text{Peak RPS} = 1,39 \times 2,5 = \mathbf{3,5 \text{ req/s}}$$
  $$\text{Peak Input TPS} = \mathbf{11.000 \text{ tokens/giây}}$$
* **Cam kết độ trễ H6:**
  * Gemini 3.8 Flash: p95 TTFT thực tế đạt **0,55s - 1,2s** (cam kết H6 $\le 3$s).
  * Agent nền (Cấp 4): Hoàn thành trong 3 - 5 phút (cam kết H6 $\le 10$ phút qua Cloud Tasks).

### 4.3 Ma trận bàn giao cho các thành viên
* **TV1 (Lead/Platform):** Bàn giao **Peak RPS: 3,5 req/s**; Băng thông mạng 1.500 GB/tháng. Giúp TV1 sizing 4 node `e2-standard-4` GKE và 1 Cloud NAT.
* **TV3 (Data/SaaS):** Bàn giao 500.000 vectors RAG; 33.000 file ảnh sinh ra/tháng (~33 GB); 20.000 lượt gọi connector/ngày.
* **TV4 (Security/Sandbox):** Bàn giao 7.500 lượt chạy code sandbox/ngày (Cấp 3); 50.000 request/ngày cần quét DLP; 50 GB audit log/tháng.

### 4.4 Chi tiết 3 dòng Báo giá của TV2 trong `G03_baogia.xlsx`

| Component | Ý nghĩa | Ghi chú kỹ thuật (Đơn giá × Số lượng) | Chi phí (USD) | Bằng chứng |
| :--- | :--- | :--- | :---: | :--- |
| `llm` | LLM API serving trên Google Vertex AI (Gemini 3.8 Flash, Pro, Imagen 3) | Region asia-southeast1. Gemini 3.8 Flash (Cấp 1-3): 2.431M token in (35% cached) = 134,46 USD; 533,5M token out × 0,30 USD/1M = 160,05 USD. Gemini Pro (Cấp 4): 1.056M token in (25% cached) = 1.072,50 USD; 198M token out × 5,00 USD/1M = 990,00 USD. Imagen 3 (Cấp 5): 33.000 ảnh × 0,030 USD = 990,00 USD. Context cache lưu trữ = 22,00 USD. Tổng 3.369,01 USD | **3.369,01** | `E01; https://cloud.google.com/vertex-ai/generative-ai/pricing` |
| `embedding` | Embedding model text-embedding-004 tạo vector 768 chiều cho RAG | Region asia-southeast1. 600 triệu token mỗi tháng phục vụ index tài liệu và chat query × 0,020 USD/1M token = 12,00 USD | **12,00** | `E02; https://cloud.google.com/vertex-ai/pricing` |
| `gateway` | AI Gateway định tuyến model, circuit breaker, quota và cảnh báo ngân sách H8 | Pod AI Gateway chạy trên GKE (compute nằm trong dòng compute); Cloud Monitoring API, Custom Metrics & Cloud Trace theo dõi token quota và p95 TTFT H6, cảnh báo ngân sách H8 = 50,00 USD | **50,00** | `E03; https://cloud.google.com/stackdriver/pricing` |
| **TỔNG TV2** | | | **3.431,01 USD** | (~1,71 USD/DAU) |

---

## 5. Chiến lược Model, FinOps & Benchmark Chất Lượng H8

### 5.1 So sánh Công nghệ: Serverless API vs Tự Host GPU trên GKE
* **Tự host GPU Llama 3 70B:** Cần tối thiểu 2 cụm GPU Multi-AZ (mỗi cụm 4 card NVIDIA A100) để đảm bảo HA và đáp ứng Peak 3.5 RPS. Chi phí tối thiểu **15.000 – 18.000 USD/tháng** + **7.000 USD/tháng** (2 FTE MLOps trực 24/7). Lãng phí 65% thời gian ngoài giờ hành chính khi GPU chạy không tải.
* **Serverless Vertex AI API (TV2):** Chi phí chỉ **3.431 USD/tháng** $\implies$ **RẺ HƠN GẤP 7 LẦN**.
* **Điểm hòa vốn (Break-even):** Tự host GPU chỉ có lợi về kinh tế khi quy mô hệ thống vượt **$\ge 55.000$ DAU**. Ở quy mô 2.000 DAU, Serverless API là giải pháp tối ưu tuyệt đối.

### 5.2 Đòn bẩy FinOps
1. **Vertex AI Context Caching:** Lưu trữ các System Instruction chuẩn và kho tài liệu RAG cố định (>32k tokens) trên cache của Google. Giảm ngay **75% giá input token** (từ $0.075 xuống $0.01875/1M token), tiết kiệm **350 USD/tháng**.
2. **Dynamic Intent Routing:** 85% tác vụ được xử lý bằng Gemini 3.8 Flash giá rẻ, tiết kiệm hơn **2.800 USD/tháng** so với dùng model lớn toàn bộ.

### 5.3 Kết quả Đo Benchmark H8 ($\ge 95\%$)
Đo lường trên **Golden Dataset 500 mẫu kiểm định** bằng phương pháp **LLM-as-a-Judge** so với Model tham chiếu **GPT-4o (OpenAI)**:

$$\text{Tỷ lệ chất lượng tổng thể} = \frac{\text{Điểm VBot (8,97)}}{\text{Điểm GPT-4o (9,20)}} = \mathbf{97,50\%} \ge \mathbf{95\%} \implies \text{ĐẠT CHUẨN XUẤT SẮC!}$$

* Cấp 1 (Email, FAQ): **98.2%**
* Cấp 2 (Doc, Slide): **97.3%**
* Cấp 3 (Data, Sandbox): **97.0%**
* Cấp 4 (Agent Jira): **96.7%**
* Cấp 5 (Mockup UI): **98.3%**

---

## 6. Slide và Kịch bản Thuyết trình

* **Slide 1:** Giả định và Ước lượng Tải Chi tiết (công thức 2.000 DAU, 5 cấp độ, Peak RPS 3.5, TPS).
* **Slide 4:** Chiến lược Lựa chọn Model & Dynamic Routing 5 Cấp độ (Gemini 3.8 Flash, Pro, Imagen 3, Context Caching).
* **Slide 5:** So sánh Công nghệ (API vs Tự host GPU) & Đo Benchmark Đạt 97.5% (H8).
* **Kịch bản Pitching 1m45s (01:15 đến 03:00):** Tự tin, làm nổi bật đòn bẩy FinOps và trả lời sắc bén 3 câu hỏi hóc búa của Hội đồng giám khảo ([KICH_BAN_PITCHING_TV2.md](KICH_BAN_PITCHING_TV2.md)).

---

## 7. Hướng dẫn Chạy Kiểm Thử

```bash
# 1. Chạy microservice AI Gateway gọi LIVE Vertex AI Gemini 3.8 Flash:
python ai_gateway_service.py

# 2. Chạy bài kiểm tra Chất lượng Benchmark H8:
python eval_benchmark.py

# 3. Kiểm tra tính hợp lệ file Báo giá qua công cụ Validator:
node baogia/check_baogia.js G03_baogia.xlsx
# Kết quả: ==> DAT (0 lỗi, 0 cảnh báo)
```
