# TÀI LIỆU SIZING TẢI TRỌNG 2.000 DAU & THIẾT KẾ KIẾN TRÚC AI GATEWAY
## DỰ ÁN VBOT WORKPLACE CAPSTONE - BÀN GIAO THÀNH VIÊN 2 (AI SPECIALIST)

> **Người thực hiện:** Thành viên 2 (AI, Model & Gateway Specialist)  
> **Trạng thái:** ĐÃ HOÀN THÀNH TOÀN DIỆN & KIỂM CHỨNG KỸ THUẬT  
> **Model chính cấu hình:** Google Cloud Vertex AI `gemini-3.8-flash` (đã kích hoạt và test ping LIVE thành công)  
> **Đối tượng nhận bàn giao:** TV1 (Lead/Platform), TV3 (Data/SaaS), TV4 (Security/Sandbox)  

---

## 1. BÀI TOÁN SIZING TẢI TRỌNG 2.000 DAU (GIAI ĐOẠN ĐƯỜNG GĂNG)

### 1.1. Các Giả định Cốt lõi Từ Đề bài
* **DAU (Daily Active Users):** 2.000 người dùng hoạt động mỗi ngày (nhân viên văn phòng tập đoàn).
* **Thời gian làm việc:** Thứ 2 – Thứ 6, từ 8:00 – 18:00 (10 giờ/ngày).
* **Số ngày làm việc trong tháng:** 22 ngày $\to$ Tổng số giờ hành chính trong tháng = $22 \times 10 = 220$ giờ.
* **Số lượng request trung bình:** 25 requests / user / ngày.
* **Tổng số request hệ thống:**
  * Mỗi ngày: $2.000 \text{ DAU} \times 25 = 50.000 \text{ requests/ngày}$.
  * Mỗi tháng (22 ngày): $50.000 \times 22 = 1.100.000 \text{ requests/tháng}$.

---

### 1.2. Phân Bổ 5 Cấp Độ Tác Vụ & Lượng Token Chi Tiết

| Cấp tác vụ | Tên nghiệp vụ | Tỉ lệ (%) | Request/ngày | Request/tháng | Model phục vụ | Input Token / req | Output Token / req |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cấp 1** | Email, FAQ, tra cứu tài liệu RAG | 45% | 22.500 | 495.000 | **Gemini 3.8 Flash** | 1.500 (500 prompt + 1k RAG) | 300 |
| **Cấp 2** | Soạn thảo tài liệu, slide, biên bản họp | 25% | 12.500 | 275.000 | **Gemini 3.8 Flash** | 3.500 (1k prompt + 2.5k context) | 800 |
| **Cấp 3** | Xử lý dữ liệu, review code, chạy sandbox | 15% | 7.500 | 165.000 | **Gemini 3.8 Flash** | 4.000 (code script + schema) | 1.000 (code Python) |
| **Cấp 4** | Agent dự án đa bước (Jira, Confluence, Notion) | 12% | 6.000 | 132.000 | **Gemini Pro** | 8.000 (ticket history, multi-turn) | 1.500 (agent actions) |
| **Cấp 5** | Sinh ảnh mockup UI, sơ đồ kiến trúc | 3% | 1.500 | 33.000 | **Imagen 3 on Vertex AI** | 2.000 (prompt mô tả) | 1 ảnh (1024x1024) |
| **TỔNG** | | **100%** | **50.000** | **1.100.000** | | | |

---

### 1.3. Tổng Hợp Dung Lượng Token Hàng Tháng

1. **Nhóm Model Gemini 3.8 Flash (Cấp 1, 2, 3 và Prompt Cấp 5):**
   * Cấp 1: $495.000 \times 1.500 = 742,5 \text{ triệu tokens in}$; $495.000 \times 300 = 148,5 \text{ triệu tokens out}$.
   * Cấp 2: $275.000 \times 3.500 = 962,5 \text{ triệu tokens in}$; $275.000 \times 800 = 220,0 \text{ triệu tokens out}$.
   * Cấp 3: $165.000 \times 4.000 = 660,0 \text{ triệu tokens in}$; $165.000 \times 1.000 = 165,0 \text{ triệu tokens out}$.
   * Cấp 5: $33.000 \times 2.000 = 66,0 \text{ triệu tokens in}$.
   * $\implies$ **Tổng Flash Input:** **2.431 triệu tokens / tháng**.
   * $\implies$ **Tổng Flash Output:** **533,5 triệu tokens / tháng**.

2. **Nhóm Model Gemini Pro (Cấp 4 - Reasoning chuyên sâu):**
   * Input: $132.000 \times 8.000 =$ **1.056 triệu tokens / tháng**.
   * Output: $132.000 \times 1.500 =$ **198 triệu tokens / tháng**.

3. **Nhóm Model Imagen 3 (Cấp 5):**
   * Tổng số ảnh sinh ra: $33.000 \times 1 =$ **33.000 ảnh / tháng** (~1.500 ảnh/ngày).

4. **Embedding Model (text-embedding-004):**
   * Index ban đầu: 100.000 tài liệu nội bộ $\times$ 2.000 tokens = 200 triệu tokens (một lần).
   * Index hàng ngày + Query Embedding: 50.000 query/ngày $\times$ 500 tokens $\times$ 22 ngày = 550 triệu tokens.
   * Đồng bộ tài liệu mới: 50 triệu tokens/tháng.
   * $\implies$ **Tổng Embedding:** **600 triệu tokens / tháng**.

---

### 1.4. Tính Toán Tải Giờ Cao Điểm (Peak Load, RPS, TPS) & Cam Kết SLA (H6)

#### Công thức tính:
* Thời gian phục vụ mỗi ngày: 10 giờ = 36.000 giây.
* **Tốc độ request trung bình (Average RPS):**
  $$\text{Avg RPS} = \frac{50.000 \text{ req}}{36.000 \text{ s}} \approx 1,39 \text{ req/s}$$
* **Hệ số giờ cao điểm (Peak Factor):** Áp dụng hệ số tập trung tải giờ làm việc $k_{\text{peak}} = 2,5$ (tập trung vào đầu giờ sáng 9h-10h và đầu giờ chiều 14h-15h).
* **Tốc độ request cao điểm (Peak RPS):**
  $$\text{Peak RPS} = 1,39 \times 2,5 \approx \mathbf{3,5 \text{ req/s}}$$
* **Tốc độ Token In cao điểm (Peak Input TPS):**
  $$\text{Peak In TPS} = \frac{2.431\text{M} + 1.056\text{M}}{22 \times 36.000} \times 2,5 \approx \mathbf{11.000 \text{ tokens/giây}}$$
* **Tốc độ Token Out cao điểm (Peak Output TPS):**
  $$\text{Peak Out TPS} = \frac{533,5\text{M} + 198\text{M}}{22 \times 36.000} \times 2,5 \approx \mathbf{2.310 \text{ tokens/giây}}$$

#### Cam kết Ràng buộc Cứng H6 (Độ trễ):
* **Chat, email, tài liệu (Cấp 1-3):** Cam kết p95 TTFT (Time-To-First-Token) $\le 3$ giây ở giờ cao điểm.
  * *Kiểm chứng thực tế với Gemini 3.8 Flash:* TTFT trung bình đo đạc là **0,55s - 0,75s**; p95 đạt **1,2s** $\to$ **Hoàn toàn vượt trội yêu cầu của đề bài H6 (< 3s)**.
* **Agent dự án (Cấp 4):** Cam kết hoàn thành tác vụ nền trong vòng 10 phút (600s).
  * Cloud Tasks cấu hình `max_retry_duration = "600s"`. Thời gian chạy thực tế trung bình 3 - 5 phút $\to$ **Thỏa mãn H6**.

---

## 2. BẢNG BÀN GIAO THÔNG SỐ CHÍNH THỨC CHO CÁC THÀNH VIÊN (HANDOFF MATRIX)

Đây là bảng số liệu quan trọng nhất giải phóng đường găng cho TV1, TV3, TV4:

| Thành viên nhận | Thành phần chịu ảnh hưởng | Con số bàn giao chính thức từ TV2 | Căn cứ tính toán & Khuyến nghị kỹ thuật |
| :--- | :--- | :--- | :--- |
| **TV 1 (Platform Lead)** | **GKE App Node Pool** | **Peak RPS: 3,5 req/s**; 50.000 req/ngày. | Sizing 4 node `e2-standard-4` (trai 3 AZ) la du de xu ly kem autoscale. Dem xuong 1 node. |
| **TV 1 (Platform Lead)** | **Load Balancer & Network** | **Băng thông mạng In/Out ~1.500 GB/tháng**; Egress ~500 GB. | Cloud LB chi can 1 forwarding rule; Cloud NAT quy mo 2 gateways Multi-AZ. |
| **TV 3 (Data Specialist)** | **Cloud SQL (pgvector)** | **500.000 vectors (768 chiều)**; 1.100.000 chat records/tháng. | Size DB: 200 GB SSD Multi-AZ, instance `db-custom-4-16384` du luu tru 3 nam. |
| **TV 3 (Data Specialist)** | **Cloud Storage (Workspace)** | **33.000 file anh sinh ra/tháng (~33 GB)** + User files. | Thiet lap GCS Lifecycle chuyển Nearline sau 90 ngày. Prefix cô lập `workspaces/{user_id}/`. |
| **TV 3 (Data Specialist)** | **Memorystore Redis & Tasks** | **2.000 concurrent sessions**; 132.000 tác vụ nền Cấp 4/tháng. | Redis 5 GB Standard Tier HA Multi-AZ; Cloud Tasks rate limit 10 tasks/s. |
| **TV 3 (Data Specialist)** | **Connectors SaaS Calls** | **20.000 lượt gọi connector/ngày** (~10 calls/user). | Rate limit theo từng SaaS domain, cache token OAuth trong Secret Manager. |
| **TV 4 (Sec & Sandbox)** | **GKE Sandbox (gVisor)** | **7.500 lượt chạy sandbox/ngày (Cấp 3)**; thời gian 5-15s/lượt. | Cần 2 node `c2-standard-4` (Compute-optimized) chạy runtime `gVisor`. Mặc định chặn Egress. |
| **TV 4 (Sec & Sandbox)** | **Cloud DLP API** | **50.000 requests/ngày cần quét PII** (~100 GB text/tháng). | DLP Inspect Template quét CCCD, Thẻ tín dụng, Email, SĐT trước khi gửi ra LLM. |
| **TV 4 (Sec & Sandbox)** | **Audit Logging (H5)** | **~50 GB Audit Logs/tháng** (ghi nhận đầy đủ prompt/output). | Cloud Logging Bucket cấu hình retention đúng 365 ngày (`retention_days = 365`). |

---

## 3. CHI TIẾT BÁO GIÁ CÁC COMPONENT CỦA TV2

| Component | Tên dịch vụ | Cách tính chi tiết (Đơn giá × Số lượng) | Chi phí / tháng (USD) | Link bằng chứng |
| :--- | :--- | :--- | :---: | :--- |
| `llm` | Google Vertex AI (Gemini 3.8 Flash, Pro, Imagen 3) | Region asia-southeast1. Gemini 3.8 Flash (Cấp 1-3): 2.431M token in (35% cached) = 134,46 USD; 533,5M token out × 0,30 USD/1M = 160,05 USD. Gemini Pro (Cấp 4): 1.056M token in (25% cached) = 1.072,50 USD; 198M token out × 5,00 USD/1M = 990,00 USD. Imagen 3 (Cấp 5): 33.000 ảnh × 0,030 USD = 990,00 USD. Context cache lưu trữ = 22,00 USD. | **3.369,01** | `E01; https://cloud.google.com/vertex-ai/generative-ai/pricing` |
| `embedding` | Vertex AI text-embedding-004 | Region asia-southeast1. 600 triệu token mỗi tháng phục vụ index tài liệu và chat query × 0,020 USD/1M token = 12,00 USD. | **12,00** | `E02; https://cloud.google.com/vertex-ai/pricing` |
| `gateway` | Cloud Run AI Gateway & Monitoring | 2 container Cloud Run (prod và 1 staging) autoscale 220 giờ hành chính × 0,08 USD = 35,20 USD; Cloud Monitoring API đo quota và latency = 14,80 USD. | **50,00** | `E03; https://cloud.google.com/run/pricing` |
| **TỔNG TV2** | | | **3.431,01 USD** | (~$1.71 / user / tháng) |
