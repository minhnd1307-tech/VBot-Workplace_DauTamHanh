# Nội dung Slide 1, 4, 5 (Thành viên 2 - AI Specialist)
## Người thực hiện: Nguyễn Đức Minh (MSSV: 2A202602891)

Tỷ lệ chuẩn 16:9. Kịch bản thuyết trình chi tiết tương ứng nằm ở [../KICH_BAN_PITCHING_TV2.md](../KICH_BAN_PITCHING_TV2.md).

---

## Slide 1: Giả định & Ước lượng Tải Hệ thống từ 2.000 DAU

**Tiêu đề:** Giả định & Ước lượng Tải Hệ thống: Từ 2.000 DAU đến Năng lực Xử lý Chi tiết

### 3 Cột nội dung chính:

#### 1. Thông số Cơ bản & Khung giờ
* **Quy mô:** 2.000 DAU (nhân viên văn phòng tập đoàn).
* **Khung giờ làm việc:** 8:00 – 18:00 (10h/ngày, 22 ngày/tháng = **220 giờ hành chính**).
* **Mức dùng:** 25 requests / user / ngày.
* **Lưu lượng:** **50.000 req/ngày** $\to$ **1.100.000 req/tháng**.

#### 2. Phân bổ 5 Cấp độ Nghiệp vụ
* **Cấp 1 (Email, FAQ - 45%):** 22.500 req/ngày | In: 1.500 tok, Out: 300 tok.
* **Cấp 2 (Tài liệu, Slide - 25%):** 12.500 req/ngày | In: 3.500 tok, Out: 800 tok.
* **Cấp 3 (Dữ liệu, Sandbox - 15%):** 7.500 req/ngày | In: 4.000 tok, Out: 1.000 tok.
* **Cấp 4 (Agent Jira/Notion - 12%):** 6.000 req/ngày | In: 8.000 tok, Out: 1.500 tok.
* **Cấp 5 (Mockup UI, Sơ đồ - 3%):** 1.500 req/ngày | In: 2.000 tok, Out: 1 ảnh.

#### 3. Tải Cao điểm & Cam kết SLA H6
* **Avg RPS:** 1,39 req/s.
* **Peak factor $k=2,5 \implies$** **Peak RPS = 3,5 req/s**; **Peak Input TPS = 11.000 token/s**.
* **Độ trễ H6:** Gemini 3.8 Flash p95 TTFT thực tế **0,55s** (cam kết H6 $\le 3$s). Agent nền chạy trong 3 - 5 phút (H6 $\le 10$ phút).

---

## Slide 4: Chiến lược Lựa chọn Model & Dynamic Routing 5 Cấp độ

**Tiêu đề:** Chiến lược Model & Dynamic Routing: Đúng Việc, Đúng Model, Tối Ưu Chi Phí

### 3 Điểm nhấn kiến trúc:

#### 1. "Ngựa thồ" Gemini 3.8 Flash phục vụ 85% tác vụ (Cấp 1–3):
* Giá token siêu cạnh tranh: **$0.075 / 1M input** và **$0.30 / 1M output** (rẻ hơn 30 lần so với GPT-4o).
* Context window 1M+ tokens: Giữ trọn vẹn ngữ cảnh tài liệu văn phòng dài và bảng tính Excel.
* TTFT cực nhanh (~0,55s) giúp phản hồi tức thì.

#### 2. Gemini Pro cho tác vụ Cấp 4 (Agent đa bước):
* Khả năng reasoning chuyên sâu khi phân tích ticket Jira, trang Confluence và lập kế hoạch dự án.

#### 3. Đòn bẩy FinOps: Vertex AI Context Caching:
* Lưu trữ context cố định (System Prompt, FAQ) $\to$ **giảm 75% giá input token** (chỉ còn **$0.01875 / 1M token**).
* Tiết kiệm trực tiếp hơn **350 USD mỗi tháng**.

---

## Slide 5: So sánh Công nghệ & Đo Benchmark Đạt Chuẩn H8 ($\ge 95\%$)

**Tiêu đề:** Lựa chọn Công nghệ & Đo lường Chất lượng: Vượt Cổng H8 với Điểm Số 97.5%

### 1. So sánh Serverless API vs Tự Host GPU trên GKE

| Tiêu chí | Serverless API (Vertex AI) | Tự Host GPU trên GKE (A100 + Llama 3) |
|---|---|---|
| **Phần cứng GPU** | **0 USD** (Pay-as-you-go) | **15.000 – 18.000 USD/tháng** (8 $\times$ A100 Multi-AZ) |
| **Lãng phí ngoài giờ** | **0 USD** | **Lãng phí 65%** do GPU chạy không tải |
| **Nhân sự MLOps** | **0 USD** | **+7.000 USD/tháng** (2 FTE MLOps trực 24/7) |
| **Tổng chi phí Model** | **3.431 USD/tháng** | **23.000 – 25.500 USD/tháng** |
| **Điểm hòa vốn** | **Tối ưu tuyệt đối ở 2.000 DAU** | Chỉ hòa vốn khi $\ge \mathbf{55.000 \text{ DAU}}$ |

### 2. Kết quả Đo Benchmark Eval Gate (Chuẩn H8):
* **Model tham chiếu:** GPT-4o (OpenAI).
* **Tập mẫu:** Golden Dataset 500 mẫu nghiệp vụ văn phòng thực tế.
* **Phương pháp:** LLM-as-a-Judge theo Rubric 5 tiêu chí (Accuracy 30%, Formatting 20%, Faithfulness 25%, Safety 15%, Latency 10%).

$$\mathbf{Tỷ\ lệ\ chất\ lượng\ VBot\ /\ GPT-4o = 97,50\% \ge 95\%} \implies \text{ĐẠT CHUẨN XUẤT SẮC!}$$
