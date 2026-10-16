# Nội dung Slide 2, 3, 11 (Thành viên 1)

Ảnh sơ đồ chèn thẳng vào slide 16:9 (PowerPoint chèn được SVG hoặc PNG, Google Slides dùng PNG):

- Slide 2: `slide02_kien_truc.png` (hoặc `.svg`)
- Slide 3: `slide03_luong_request.png` (hoặc `.svg`)

Muốn sửa hộp hay chữ thì sửa trong `gen_diagrams.js`, rồi chạy `npm install && node gen_diagrams.js`.

---

## Slide 2: Kiến trúc tổng thể

**Tiêu đề:** Kiến trúc tổng thể VBot Workplace trên GCP

**Hình:** `slide02_kien_truc.png`, chiếm gần hết slide.

**3 ý chính (đặt ở chân slide hoặc nói):**
1. Một cloud chính là GCP, region `asia-southeast1` (Singapore). Đây là region GCP gần Việt Nam nhất có đủ 3 zone, và Vertex AI có Gemini ở cùng region (H1).
2. Mọi tầng đều chạy trên 3 AZ: GKE regional (node trải zone a, b, c), Cloud SQL HA, Redis HA, Global LB anycast. Không có điểm lỗi đơn ở LB, gateway và database (H7).
3. Toàn bộ hạ tầng được dựng bằng Terraform với 5 module: `network`, `gke`, `data`, `security_sandbox`, `ai_gateway`. Môi trường staging nằm chung cluster, chạy trên node pool Spot riêng.

**Lời nói (khoảng 35 giây):**
> Người dùng đăng nhập qua SSO của tập đoàn, có MFA. Request đi qua Cloud Armor rồi Global Load Balancer, vào cụm GKE private trải 3 zone. Trong cụm có Web/API, Orchestrator, Policy & ACL, LLM Gateway, Guardrail cùng DLP, connector worker, và một node pool sandbox gVisor tách riêng. Dữ liệu nằm ở Cloud SQL HA có pgvector, Redis HA và Cloud Storage chia workspace theo user, tất cả chỉ có IP private. Gateway gọi Vertex AI qua Private Google Access, không đi ra Internet. Đường duy nhất ra ngoài là Cloud NAT, dùng để connector gọi các SaaS.

---

## Slide 3: Luồng một request

**Tiêu đề:** Luồng một request: chat có RAG, connector, sandbox và xác nhận của người dùng

**Hình:** `slide03_luong_request.png`

**Lời nói (khoảng 40 giây), theo 12 bước trên hình:**
> (1) Người dùng đăng nhập SSO + MFA. (2–3) Request HTTPS đi qua WAF và rate limit, ALB chuyển tới pod khỏe ở một trong 3 zone. (4–5) API kiểm tra JWT và quyền RBAC. Guardrail quét prompt injection, DLP che PII trước khi tới Orchestrator. (6) RAG tìm trong pgvector và **lọc theo ACL gốc của user**, nên user A không thấy tài liệu của user B. (7) Khi cần dữ liệu mới, connector dùng **OAuth token của chính user** lấy từ Secret Manager, gọi ra SaaS qua Cloud NAT. (8–9) LLM Gateway chọn model theo cấp tác vụ, kiểm tra quota rồi stream token về, p95 TTFT dưới 3 giây. (10) Nếu cần chạy code, hệ thống tạo pod gVisor không có egress, chỉ mount workspace của user, chạy xong thì hủy. (11) Mọi hành động ghi ra ngoài, như gửi email hay tạo ticket, đều phải được người dùng xác nhận. (12) Guardrail kiểm tra đầu ra rồi stream về trình duyệt. Mọi bước đều ghi audit log.

---

## Slide 11: Tổng chi phí tháng và đòn bẩy FinOps

**Tiêu đề:** Chi phí hằng tháng: `<TOTAL>` USD, tức `<TOTAL/2000>` USD/DAU

> ⚠️ Số `<TOTAL>` lấy **đúng** từ dòng `TOTAL` của `baogia/Gxx_baogia.xlsx` sau khi chạy `node check_baogia.js` báo ĐẠT. Lệch số sẽ bị trừ 5 điểm.

**Khối 1: 5 hạng mục lớn nhất** (lấy từ bảng "theo component" mà `check_baogia.js` in ra, sắp giảm dần):

| # | Component | USD/tháng | % tổng |
|---|---|---|---|
| 1 | `<...>` | | |
| 2 | `<...>` | | |
| 3 | `<...>` | | |
| 4 | `<...>` | | |
| 5 | `<...>` | | |

Phần hạ tầng của TV1 đã chốt (đơn giá niêm yết ngày 2026-10-16, asia-southeast1):

| Component | USD/tháng |
|---|---|
| compute (GKE fee + node app 3→6 + staging Spot + disk) | 441.31 |
| network (NAT, egress, inter-zone, Cloud Armor) | 73.16 |
| load_balancer | 20.68 |
| cicd (Cloud Build + Artifact Registry) | 18.84 |
| ops_labor (1 FTE SRE/MLOps) | 3,500.00 |
| licenses (Standard Support, 3% chi phí cloud, tối thiểu 29) | tự tính theo TOTAL cloud |

**Khối 2: Đòn bẩy tiết kiệm của phần hạ tầng, có số USD**

So với cách làm "ngây thơ": 6 node on-demand chạy 24/7, staging on-demand 24/7 trên một cluster riêng.

| Đòn bẩy | Trước | Sau | Tiết kiệm/tháng |
|---|---|---|---|
| Autoscale theo giờ hành chính: 3 node nền 24/7, +3 node trong 220 giờ | 724.16 | 471.20 | **252.96** |
| Committed use 1 năm cho 3 node nền (giảm 37%) | 362.08 | 228.11 | **133.97** |
| Staging trên Spot, chỉ chạy giờ hành chính | 120.69 | 21.83 | **98.86** |
| Staging chung cluster với prod (không trả thêm phí GKE) | 73.00 | 0 | **73.00** |
| **Cộng phần hạ tầng** | | | **558.79** |

Thêm đòn bẩy phần model của TV2 (Context Caching, routing Flash/Pro) với số USD tương ứng.

**Khối 3: Khi DAU tăng gấp đôi (4.000), tóm tắt cho phần kết, chi tiết ở Slide 12**
- Cố định: phí GKE, forwarding rule LB, Cloud Armor policy, NAT IP, 1 FTE vận hành.
- Tăng theo bậc: node app lúc cao điểm tăng từ 2 lên 4 node/zone. Chi phí node từ 337.23 lên 555.47 USD (+218.24).
- Tăng gần tuyến tính: egress, NAT data, LB data, request Cloud Armor. Phần mạng khoảng +57 USD.
- Tăng tuyến tính và lớn nhất: token LLM (theo số của TV2).

**Lời nói (khoảng 30 giây):**
> Tổng chi phí là X USD mỗi tháng, tức Y USD cho mỗi người dùng. Lớn nhất là ... Riêng phần hạ tầng, nhờ autoscale theo giờ hành chính, cam kết 1 năm cho các node nền và staging chạy Spot, nhóm tiết kiệm gần 560 USD mỗi tháng so với cấu hình chạy 24/7. Toàn bộ cấu hình này có thật trong mã Terraform.
