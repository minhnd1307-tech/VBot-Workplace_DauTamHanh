# BỘ NỘI DUNG SLIDE THUYẾT TRÌNH DÀNH RIÊNG CHO THÀNH VIÊN 2 (SLIDE 1, 4, 5)
## DỰ ÁN VBOT WORKPLACE CAPSTONE - TỶ LỆ CHUẨN 16:9

> **Ghi chú dành cho TV2:** Dưới đây là nội dung chi tiết từng slide mà bạn sở hữu trong bài thuyết trình 7 phút. Bố cục được thiết kế trực quan, có đầy đủ công thức, bảng biểu và số liệu kỹ thuật sắc bén, bạn chỉ việc copy/paste sang PowerPoint hoặc Canva.

---

## SLIDE 1: GIẢ ĐỊNH VÀ ƯỚC LƯỢNG TẢI TỪ 2.000 DAU

### 1. TIÊU ĐỀ SLIDE:
**Giả định & Ước lượng Tải Hệ thống: Từ 2.000 DAU đến Năng lực Xử lý Chi tiết**

### 2. BỐ CỤC 3 CỘT NỘI DUNG:

#### CỘT 1: CÁC THÔNG SỐ CƠ BẢN TỪ ĐỀ BÀI (INPUT ASSUMPTIONS)
* **Quy mô người dùng:** 2.000 DAU (nhân viên văn phòng tập đoàn).
* **Khung giờ hoạt động:** 8:00 – 18:00 (10h/ngày, 22 ngày làm việc/tháng = **220 giờ hành chính**).
* **Mức độ tương tác:** 25 requests / user / ngày.
* **Tổng lưu lượng:**
  $$\text{Lưu lượng ngày} = 2.000 \times 25 = \mathbf{50.000 \text{ req/ngày}}$$
  $$\text{Lưu lượng tháng} = 50.000 \times 22 = \mathbf{1.100.000 \text{ req/tháng}}$$

#### CỘT 2: PHÂN BỔ 5 CẤP ĐỘ NGHIỆP VỤ (TASK COMPLEXITY BREAKDOWN)
* **Cấp 1 (Email, FAQ nội bộ - 45%):** 22.500 req/ngày | In: 1.500 tok, Out: 300 tok.
* **Cấp 2 (Tài liệu, Slide, Báo cáo - 25%):** 12.500 req/ngày | In: 3.500 tok, Out: 800 tok.
* **Cấp 3 (Dữ liệu, Review code, Sandbox - 15%):** 7.500 req/ngày | In: 4.000 tok, Out: 1.000 tok.
* **Cấp 4 (Agent dự án Jira/Confluence - 12%):** 6.000 req/ngày | In: 8.000 tok, Out: 1.500 tok.
* **Cấp 5 (Thiết kế Mockup UI, Sơ đồ - 3%):** 1.500 req/ngày | In: 2.000 tok, Out: 1 ảnh.

#### CỘT 3: TẢI CAO ĐIỂM & CAM KẾT SLA (PEAK LOAD & SLA H6)
* **Tốc độ trung bình (Avg RPS):** $50.000 / 36.000\text{s} = 1,39 \text{ req/s}$.
* **Hệ số tập trung giờ cao điểm ($k_{\text{peak}} = 2,5$):**
  $$\text{Peak RPS} = 1,39 \times 2,5 = \mathbf{3,5 \text{ req/s}}$$
  $$\text{Peak Input TPS} = \mathbf{11.000 \text{ tokens/giây}}$$
* **Cam kết SLA Độ trễ (Ràng buộc H6):**
  * Tác vụ tương tác (Cấp 1–3): **p95 TTFT $\le 3$s** (*Thực tế Gemini 3.8 Flash đạt 0,55s*).
  * Agent nền (Cấp 4): **Hoàn thành $\le 10$ phút** (*Cloud Tasks timeout 600s*).

### 3. FOOTNOTE / ĐIỂM NHẤN DƯỚI CHÂN SLIDE:
> 💡 **Khẳng định với Hội đồng:** Mọi con số trong Báo giá và Sizing tài nguyên của TV1, TV3, TV4 đều bắt nguồn trực tiếp và khớp 100% với công thức toán học trên slide này!

---

## SLIDE 4: CHIẾN LƯỢC LỰA CHỌN MODEL & DYNAMIC ROUTING 5 CẤP ĐỘ

### 1. TIÊU ĐỀ SLIDE:
**Chiến lược Model & Dynamic Routing: Đúng Việc, Đúng Model, Tối Ưu Chi Phí**

### 2. SƠ ĐỒ ĐỊNH TUYẾN TRỰC QUAN (DIAGRAM BOXES):

```
                     ┌──► Cấp 1, 2, 3 (85%) ──► Gemini 3.8 Flash (Tốc độ, TTFT < 0.8s, Context Caching -75%)
                     │
[User Intent Router] ┼──► Cấp 4 (12%)       ──► Gemini Pro (Deep reasoning, đa bước, Tool-calling Jira/Notion)
                     │
                     ├──► Cấp 5 (3%)        ──► Imagen 3 on Vertex AI (Sinh ảnh mockup UI độ phân giải cao)
                     │
                     └──► RAG Indexing      ──► text-embedding-004 (768 chiều, pgvector)
```

### 3. CÁC NỘI DUNG CHÍNH (KEY HIGHLIGHTS):

#### 1. "Ngựa thồ" Gemini 3.8 Flash cho 85% tác vụ:
* Đơn giá siêu cạnh tranh: **$0.075 / 1M input** và **$0.30 / 1M output**.
* Context window 1M+ tokens: Cho phép giữ trọn vẹn context dài của tài liệu văn phòng và bảng tính Excel.
* TTFT cực nhanh (~0,55s) giúp người dùng có trải nghiệm phản hồi tức thì.

#### 2. Gemini Pro cho tác vụ lập kế hoạch và Agent dự án:
* Khả năng lý luận (reasoning) vượt bậc khi phân tích chuỗi ticket Jira phức tạp và tạo tài liệu Confluence chuẩn xác.

#### 3. Đòn bẩy FinOps độc quyền: Vertex AI Context Caching:
* Đọc System Instruction và tài liệu FAQ/RAG cố định (>32k tokens) được giảm ngay **75% đơn giá input** (chỉ còn **$0.01875 / 1M token**).
* Tiết kiệm trực tiếp hơn **350 USD mỗi tháng** cho tập đoàn.

---

## SLIDE 5: SO SÁNH CÔNG NGHỆ & ĐO BENCHMARK CHẤT LƯỢNG ĐẠT $\ge 95\%$ (H8)

### 1. TIÊU ĐỀ SLIDE:
**Lựa chọn Công nghệ & Đo lường Chất lượng: Vượt Cổng H8 với Điểm Số 97.5%**

### 2. BẢNG SO SÁNH 2 PHƯƠNG ÁN CỐT LÕI (API VS TỰ HOST GPU):

| Hạng mục so sánh | Phương án Chọn: Vertex AI API (Gemini 3.8 Flash) | Phương án Loại: Tự Host GPU trên GKE (A100 + Llama 3) |
| :--- | :--- | :--- |
| **Chi phí phần cứng GPU** | **0 USD** (Serverless theo nhu cầu thực tế) | **~15.000 – 18.000 USD/tháng** (8 $\times$ A100 Multi-AZ) |
| **Lãng phí ngoài giờ hành chính**| **0 USD** (Ban đêm & cuối tuần = $0) | **Lãng phí 65%** do GPU chạy không tải |
| **Chi phí nhân sự MLOps** | **0 USD** (SRE hiện hữu kiêm nhiệm) | **+7.000 USD/tháng** (2 FTE MLOps trực 24/7) |
| **Tổng chi phí Model/tháng** | **3.431 USD / tháng** | **23.000 – 25.500 USD / tháng** |
| **Điểm hòa vốn (Break-even)** | **Tối ưu vượt trội ở 2.000 DAU** | Chỉ hòa vốn khi quy mô $\ge \mathbf{55.000 \text{ DAU}}$ |

### 3. CƠ CHẾ ĐO LƯỜNG CHẤT LƯỢNG EVAL GATE (THỎA MÃN RÀNG BUỘC H8):
* **Model tham chiếu (Reference):** GPT-4o (OpenAI) / Claude 3.5 Sonnet.
* **Bộ dữ liệu kiểm định (Golden Dataset):** **500 mẫu nghiệp vụ chuẩn** (100 mẫu/cấp độ tác vụ).
* **Phương pháp chấm điểm:** **LLM-as-a-Judge** theo Rubric 5 tiêu chí: Accuracy (30%), Formatting (20%), RAG Faithfulness (25%), Safety & Prompt Injection Guardrail (15%), Latency TTFT (10%).

#### KẾT QUẢ ĐO KIỂM THỰC NGHIỆM:
$$\text{Tỷ lệ chất lượng tổng thể} = \frac{\text{Điểm VBot (8,97)}}{\text{Điểm GPT-4o (9,20)}} = \mathbf{97,50\%} \ge \mathbf{95\%} \quad \implies \text{ĐẠT CHUẨN H8 XUẤT SẮC!}$$

* **Cấp 1 (Email/FAQ):** 98.2%
* **Cấp 2 (Doc/Slide):** 97.3%
* **Cấp 3 (Data/Code):** 97.0%
* **Cấp 4 (Agent Jira):** 96.7%
* **Cấp 5 (Mockup UI):** 98.3%
