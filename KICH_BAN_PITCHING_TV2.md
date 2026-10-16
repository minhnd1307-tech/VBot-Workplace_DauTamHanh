# KỊCH BẢN THUYẾT TRÌNH BẢO VỆ 1 PHÚT 45 GIÂY DÀNH CHO THÀNH VIÊN 2
## DỰ ÁN VBOT WORKPLACE CAPSTONE (KHUNG GIỜ: 01:15 ĐẾN 03:00)

> **Người trình bày:** Thành viên 2 (AI, Model & Gateway Specialist)  
> **Thời lượng:** Đúng 1 phút 45 giây (105 giây)  
> **Slide phụ trách trình chiếu:** Slide 1, Slide 4, Slide 5  
> **Mục tiêu:** Thuyết phục tuyệt đối Hội đồng giám khảo về tính khả thi, tính chặt chẽ của công thức toán học và đòn bẩy FinOps độc quyền.

---

### [01:15 – 01:45] (30 giây) - BẢO VỆ SLIDE 1: BÀI TOÁN SIZING TẢI TRỌNG TỪ 2.000 DAU
*(Giọng nói dõng dạc, tự tin, chỉ tay vào các con số trên Slide 1)*

> *"Kính thưa Hội đồng giám khảo, tôi là [Tên của bạn] - Kỹ sư AI chịu trách nhiệm toàn bộ bài toán Sizing tải lượng và chiến lược Model cho VBot.*
>
> *Từ đề bài 2.000 DAU và khung giờ hành chính 22 ngày mỗi tháng, nhóm chúng tôi không ước lượng cảm tính mà xây dựng công thức toán học chặt chẽ:*
> * Với mức trung bình 25 request mỗi người, hệ thống phục vụ **50.000 request mỗi ngày**, tương đương **1,1 triệu request mỗi tháng**.
> * Chúng tôi phân rã chi tiết thành 5 cấp độ tác vụ: trong đó 85% là các tác vụ hàng ngày như email, tài liệu và phân tích dữ liệu; 12% là agent đa bước và 3% là thiết kế đồ họa.
> * Ở giờ cao điểm với hệ số $k=2,5$, hệ thống đạt **Peak RPS là 3,5 request/giây** và **Peak Input TPS là 11.000 token/giây**. Toàn bộ số liệu này đã được bàn giao chính xác để TV1 sizing cụm GKE, TV3 sizing cơ sở dữ liệu và TV4 cấu hình node pool sandbox!"*

---

### [01:45 – 02:25] (40 giây) - BẢO VỆ SLIDE 4: CHIẾN LƯỢC MODEL & ĐÒN BẨY FINOPS
*(Chuyển sang Slide 4, nhấn mạnh vào sự thông minh trong việc lựa chọn Gemini 3.8 Flash)*

> *"Về chiến lược Model, nhóm nói KHÔNG với tư duy 'dùng một model đắt tiền cho tất cả'. Thay vào đó, chúng tôi triển khai kiến trúc **AI Gateway Dynamic Routing** phân cấp thông minh:*
> * **85% tác vụ (Cấp 1–3)** được định tuyến vào **Gemini 3.8 Flash**. Đây là 'ngựa thồ' hoàn hảo với context window 1 triệu token, TTFT chỉ 0,55 giây và chi phí cực thấp: chỉ $0.075 cho 1 triệu token input.
> * **Cấp 4** được chuyển giao cho **Gemini Pro** để tận dụng năng lực lý luận chuyên sâu khi phân tích ticket Jira và lập kế hoạch đa bước.
> * **Cấp 5** sử dụng **Imagen 3 trên Vertex AI** để sinh ảnh mockup giao diện sắc nét.
>
> *Đặc biệt, đòn bẩy FinOps số một của nhóm là kích hoạt **Vertex AI Context Caching**. Bằng cách lưu cache các System Prompt và tài liệu RAG cố định, chúng tôi **giảm ngay 75% giá token đầu vào** (xuống chỉ còn $0.01875/1M), giúp doanh nghiệp tiết kiệm trực tiếp hơn 350 USD mỗi tháng!"*

---

### [02:25 – 03:00] (35 giây) - BẢO VỆ SLIDE 5: SO SÁNH CÔNG NGHỆ & ĐẠT CHUẨN H8
*(Chuyển sang Slide 5, giọng điệu đanh thép, khẳng định tính vượt trội)*

> *"Trước câu hỏi kinh điển: 'Tại sao không tự thuê cụm GPU để chạy Llama 3?', chúng tôi đã làm bài toán điểm hòa vốn định lượng:*
> * Để tự host GPU cho 2.000 DAU đạt chuẩn HA Multi-AZ, doanh nghiệp phải trả **ít nhất 15.000 đến 18.000 USD/tháng** tiền thuê GPU và thêm 7.000 USD cho 2 kỹ sư MLOps trực đêm, trong khi 65% thời gian ngoài giờ hành chính GPU chạy không tải! Điểm hòa vốn chỉ đạt khi vượt **55.000 DAU**.
> * Trong khi đó, giải pháp Serverless Vertex AI của chúng tôi chỉ tốn đúng **3.431 USD/tháng**, tức là **RẺ HƠN GẤP 7 LẦN**!
>
> *Quan trọng nhất, về chất lượng theo ràng buộc cứng H8: Chúng tôi đã kiểm định độc lập trên **Golden Dataset 500 mẫu nghiệp vụ** bằng phương pháp LLM-as-a-Judge so với model tham chiếu GPT-4o. Kết quả: VBot đạt **97,5% chất lượng của GPT-4o**, vượt xa ngưỡng 95% của đề bài!*
>
> *Tiếp theo, xin mời Thành viên 3 trình bày về kiến trúc Dữ liệu và Không gian làm việc cá nhân!"*

---

## 4. BỘ CÂU HỎI VÀ ĐÁP ÁN DỰ PHÒNG CHO PHẦN Q&A HỘI ĐỒNG (DÀNH CHO TV2)

#### Câu hỏi 1: "Nếu nhà cung cấp tăng giá token 30% thì kiến trúc của bạn có còn tối ưu không?"
* **Trả lời:** *"Dạ thưa Hội đồng, ngay cả khi giá token tăng 30%, chi phí LLM của nhóm chỉ tăng từ 3.369 USD lên 4.380 USD/tháng. Con số này vẫn rẻ hơn gấp 5 lần so với chi phí tối thiểu 22.000 USD/tháng khi tự vận hành cụm GPU. Hơn nữa, nhờ AI Gateway có lớp trừu tượng hóa (Abstraction layer), chúng tôi có thể chuyển đổi linh hoạt sang model khác chỉ bằng việc thay đổi cấu hình routing trong vài phút mà không phải sửa mã nguồn."*

#### Câu hỏi 2: "Làm sao nhóm đảm bảo độ trễ TTFT dưới 3 giây ở giờ cao điểm theo đúng H6?"
* **Trả lời:** *"Dạ, nhóm đã kiểm tra trực tiếp qua request LIVE trên môi trường Vertex AI asia-southeast1. Gemini 3.8 Flash có độ trễ TTFT trung bình thực tế chỉ từ 0,45s đến 0,65s; p95 tại giờ cao điểm ước tính chỉ đạt 1,2s, thấp hơn rất nhiều so với trần 3,0s của ràng buộc H6. Ngoài ra, AI Gateway có cơ chế streaming token trực tiếp về client qua Server-Sent Events (SSE) giúp người dùng thấy chữ chạy ngay lập tức."*

#### Câu hỏi 3: "Dữ liệu văn phòng nội bộ gửi lên Vertex AI có bị dùng để huấn luyện model không (H5)?"
* **Trả lời:** *"Dạ hoàn toàn không. Google Cloud cam kết rõ ràng trong điều khoản dịch vụ Vertex AI Enterprise: Dữ liệu prompt, tài liệu RAG và output của khách hàng được bảo vệ bằng mã hóa KMS, hoàn toàn không được lưu trữ để đào tạo hay cải thiện bất kỳ mô hình công cộng nào của Google."*
