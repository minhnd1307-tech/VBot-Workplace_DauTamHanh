# Nội dung Slide 2, 3, 11 (Thành viên 1)

Ảnh chèn thẳng vào slide 16:9. PowerPoint chèn được SVG hoặc PNG, Google Slides dùng PNG.

| Slide | Ảnh |
|---|---|
| 2: Kiến trúc tổng thể | `slide02_kien_truc.png` |
| 3: Luồng một request | `slide03_luong_request.png` |
| 11: Chi phí và FinOps | `slide11_chi_phi.png` (số đọc trực tiếp từ `G03_baogia.xlsx`) |

Muốn sửa thì sửa `gen_diagrams.js`, rồi chạy `npm install && node gen_diagrams.js`. Nếu báo giá thay đổi, **chạy lại lệnh này** để Slide 11 luôn khớp TOTAL.

Lời nói đầy đủ cho từng slide nằm ở [../KICH_BAN_PITCHING_TV1.md](../KICH_BAN_PITCHING_TV1.md).

---

## Slide 2: Kiến trúc tổng thể

**Tiêu đề:** Kiến trúc tổng thể VBot Workplace trên GCP

**3 ý chính:**
1. Một cloud chính là GCP, region `asia-southeast1` (Singapore). Đây là region gần Việt Nam nhất có 3 zone, và Gemini có sẵn trong region (H1).
2. Mọi tầng chạy trên 3 AZ: GKE regional, Cloud SQL HA, Redis HA, Global LB anycast. Không có điểm lỗi đơn ở LB, gateway và database (H7).
3. Toàn bộ dựng bằng Terraform 5 module: `network`, `gke`, `data`, `security_sandbox`, `ai_gateway`. Staging chạy chung cluster, trên node pool Spot riêng.

## Slide 3: Luồng một request

**Tiêu đề:** Luồng một request: chat có RAG, connector, sandbox và xác nhận của người dùng

**Điểm nhấn:** RAG lọc theo ACL gốc của tài liệu; connector dùng OAuth token của chính user; sandbox gVisor không có egress; hành động ghi ra ngoài phải được người dùng xác nhận; p95 TTFT ≤ 3 giây.

## Slide 11: Chi phí hằng tháng

**Tiêu đề:** Chi phí hằng tháng: 11,260.64 USD · 5.63 USD/DAU

**5 hạng mục lớn nhất** (theo `G03_baogia.xlsx`):

| # | Component | USD/tháng | % tổng |
|---|---|---|---|
| 1 | ops_labor | 3,500.00 | 31.1% |
| 2 | llm | 3,369.01 | 29.9% |
| 3 | authn | 2,000.00 | 17.8% |
| 4 | database | 545.82 | 4.8% |
| 5 | contingency | 338.10 | 3.0% |
| | 17 component còn lại | 1,507.71 | 13.4% |

**Đòn bẩy tiết kiệm (USD/tháng):**

| Đòn bẩy | Tiết kiệm | Nguồn |
|---|---|---|
| Autoscale theo giờ hành chính (4 node → 1 node ngoài giờ) | 252.96 | TV1, Terraform |
| Committed use 1 năm cho node nền 24/7 (−37%) | 44.66 | TV1, Terraform |
| Staging chạy Spot, chỉ giờ hành chính | 98.86 | TV1, Terraform |
| Staging chung cluster với prod | 73.00 | TV1, Terraform |
| Vertex AI Context Caching | 350.00 | TV2 |
| Routing 5 cấp, 85% tác vụ chạy Gemini Flash | 2,800.00 | TV2 |
| **Tổng** | **3,619.48** | |

**Khi DAU gấp đôi (4.000), phần hạ tầng của TV1:** node app lúc cao điểm từ 4 lên khoảng 7 (+109 USD), egress +60, LB data +13.5, NAT +14.4, Cloud Armor +11.25, các mục khác +4. Tổng khoảng **+212 USD/tháng**. Phần cố định gồm phí GKE, forwarding rule, WAF policy và 1 FTE.
