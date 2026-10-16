// Sinh so do Slide 1 (Sizing 2000 DAU), Slide 4 (Model Routing), Slide 5 (Benchmark & So sanh)
// Dung: node gen_tv2_diagrams.js
const fs = require('fs');
const path = require('path');

const W = 1600, H = 900;
const FONT = "Segoe UI, Arial, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";
const C = {
  ink: '#1F2937', muted: '#4B5563', bg: '#F9FAFB',
  card: '#FFFFFF', border: '#E5E7EB',
  blue: ['#EFF6FF', '#3B82F6', '#1D4ED8'],
  green: ['#ECFDF5', '#10B981', '#047857'],
  purple: ['#F5F3FF', '#8B5CF6', '#6D28D9'],
  amber: ['#FFFBEB', '#F59E0B', '#B45309'],
  red: ['#FEF2F2', '#EF4444', '#B91C1C'],
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card(x, y, w, h, fill, stroke, title, sub) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  if (title) s += `<text x="${x + 20}" y="${y + 36}" font-family="${FONT}" font-size="18" font-weight="700" fill="${C.ink}">${esc(title)}</text>`;
  if (sub) s += `<text x="${x + 20}" y="${y + 60}" font-family="${FONT}" font-size="13" fill="${C.muted}">${esc(sub)}</text>`;
  return s;
}

// ---------------- SLIDE 1: SIZING 2000 DAU ----------------
function slide1() {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <text x="60" y="65" font-family="${FONT}" font-size="28" font-weight="800" fill="${C.ink}">Slide 1: Giả định &amp; Ước lượng Tải Hệ thống từ 2.000 DAU</text>
  <text x="60" y="98" font-family="${FONT}" font-size="15" fill="${C.muted}">Mô hình toán học chuyển hóa từ quy mô người dùng đến năng lực xử lý, lưu lượng token và giờ cao điểm</text>`;

  // 3 cot
  // Cot 1: Thong so nen
  s += card(60, 140, 440, 680, C.card, C.border, "1. Thông số nền tảng (Đề bài)", "Khung giờ hành chính &amp; quy mô người dùng");
  const col1Items = [
    ["2.000 DAU", "Nhân viên văn phòng hoạt động mỗi ngày"],
    ["22 ngày / tháng", "Giờ hành chính T2–T6: 8h00 – 18h00 (10h/ngày)"],
    ["220 giờ / tháng", "Tổng thời gian phục vụ có cam kết SLA 99,5%"],
    ["25 requests / user / ngày", "Mức sử dụng trung bình cho trợ lý văn phòng"],
    ["50.000 requests / ngày", "Tổng lưu lượng truy vấn toàn tập đoàn"],
    ["1.100.000 req / tháng", "Lưu lượng tháng phục vụ tính toán chi phí token"]
  ];
  col1Items.forEach(([val, desc], i) => {
    const y = 230 + i * 90;
    s += `<rect x="80" y="${y}" width="400" height="74" rx="8" fill="${C.blue[0]}" stroke="${C.blue[1]}" stroke-width="1"/>`;
    s += `<text x="100" y="${y + 28}" font-family="${FONT}" font-size="16" font-weight="700" fill="${C.blue[2]}">${esc(val)}</text>`;
    s += `<text x="100" y="${y + 54}" font-family="${FONT}" font-size="12.5" fill="${C.muted}">${esc(desc)}</text>`;
  });

  // Cot 2: Phan bo 5 cap do
  s += card(530, 140, 540, 680, C.card, C.border, "2. Phân bổ 5 Cấp độ Tác vụ", "Tỉ lệ lưu lượng và phân bổ Model chuyên biệt");
  const levels = [
    ["Cấp 1: Email & FAQ (45%)", "22.500 req/ngày | In: 1.500 tok | Out: 300 tok", "Gemini 3.8 Flash", C.green],
    ["Cấp 2: Tài liệu & Slide (25%)", "12.500 req/ngày | In: 3.500 tok | Out: 800 tok", "Gemini 3.8 Flash", C.green],
    ["Cấp 3: Dữ liệu & Code Sandbox (15%)", "7.500 req/ngày | In: 4.000 tok | Out: 1.000 tok", "Gemini 3.8 Flash", C.green],
    ["Cấp 4: Agent dự án Jira/Notion (12%)", "6.000 req/ngày | In: 8.000 tok | Out: 1.500 tok", "Gemini Pro", C.purple],
    ["Cấp 5: Mockup UI & Thiết kế (3%)", "1.500 req/ngày | In: 2.000 tok | Out: 1 ảnh", "Imagen 3 (Vertex AI)", C.amber]
  ];
  levels.forEach(([title, detail, model, color], i) => {
    const y = 220 + i * 115;
    s += `<rect x="550" y="${y}" width="500" height="98" rx="8" fill="${color[0]}" stroke="${color[1]}" stroke-width="1.5"/>`;
    s += `<text x="570" y="${y + 28}" font-family="${FONT}" font-size="15" font-weight="700" fill="${color[2]}">${esc(title)}</text>`;
    s += `<text x="570" y="${y + 54}" font-family="${FONT}" font-size="12.5" fill="${C.muted}">${esc(detail)}</text>`;
    s += `<rect x="850" y="${y + 64}" width="180" height="22" rx="4" fill="${color[1]}"/>`;
    s += `<text x="940" y="${y + 79}" font-family="${FONT}" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">${esc(model)}</text>`;
  });

  // Cot 3: Peak load & SLA H6
  s += card(1100, 140, 440, 680, C.card, C.border, "3. Giờ cao điểm & Cam kết SLA", "Hệ số tập trung tải k=2.5 và độ trễ H6");
  const peakItems = [
    ["Average RPS: 1.39 req/s", "50.000 request / 36.000 giây làm việc"],
    ["Peak RPS: 3.5 req/s", "k_peak = 2.5 tập trung đầu giờ 9h-10h, 14h-15h"],
    ["Peak Input TPS: 11.000 tok/s", "Tốc độ token đầu vào tối đa ở giờ cao điểm"],
    ["Peak Output TPS: 2.310 tok/s", "Tốc độ token trả về của LLM cho người dùng"],
    ["Cam kết p95 TTFT <= 3s (H6)", "Thực tế Gemini 3.8 Flash đạt 0.55s - 1.2s"],
    ["Agent chạy ngầm <= 10 phút (H6)", "Cloud Tasks queue rate limit, timeout 600s"]
  ];
  peakItems.forEach(([val, desc], i) => {
    const y = 230 + i * 90;
    const isSla = i >= 4;
    const bg = isSla ? C.green[0] : C.amber[0];
    const border = isSla ? C.green[1] : C.amber[1];
    const textCol = isSla ? C.green[2] : C.amber[2];
    s += `<rect x="1120" y="${y}" width="400" height="74" rx="8" fill="${bg}" stroke="${border}" stroke-width="1"/>`;
    s += `<text x="1140" y="${y + 28}" font-family="${FONT}" font-size="15" font-weight="700" fill="${textCol}">${esc(val)}</text>`;
    s += `<text x="1140" y="${y + 54}" font-family="${FONT}" font-size="12" fill="${C.muted}">${esc(desc)}</text>`;
  });

  s += `</svg>`;
  return s;
}

// ---------------- SLIDE 4: MODEL ROUTING & FINOPS ----------------
function slide4() {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <text x="60" y="65" font-family="${FONT}" font-size="28" font-weight="800" fill="${C.ink}">Slide 4: Chiến lược Lựa chọn Model &amp; Dynamic Routing 5 Cấp độ</text>
  <text x="60" y="98" font-family="${FONT}" font-size="15" fill="${C.muted}">AI Gateway định tuyến thông minh: Đúng việc, Đúng Model, Tối ưu chi phí và Đòn bẩy Context Caching</text>`;

  // Routing flow diagram
  s += card(60, 140, 1480, 320, C.card, C.border, "Sơ đồ Dynamic Routing tại AI Gateway (GKE / Vertex AI)", "Phân loại Intent người dùng và chuyển phát tức thời");
  
  // Box User
  s += `<rect x="100" y="240" width="180" height="120" rx="10" fill="${C.blue[0]}" stroke="${C.blue[1]}" stroke-width="2"/>`;
  s += `<text x="190" y="290" font-family="${FONT}" font-size="18" font-weight="700" fill="${C.blue[2]}" text-anchor="middle">User Request</text>`;
  s += `<text x="190" y="320" font-family="${FONT}" font-size="13" fill="${C.muted}" text-anchor="middle">2.000 DAU (50k req/ngày)</text>`;

  // Box AI Gateway
  s += `<rect x="380" y="220" width="240" height="160" rx="10" fill="${C.purple[0]}" stroke="${C.purple[1]}" stroke-width="2"/>`;
  s += `<text x="500" y="265" font-family="${FONT}" font-size="18" font-weight="700" fill="${C.purple[2]}" text-anchor="middle">AI Gateway</text>`;
  s += `<text x="500" y="295" font-family="${FONT}" font-size="12.5" fill="${C.muted}" text-anchor="middle">• Intent Classifier</text>`;
  s += `<text x="500" y="320" font-family="${FONT}" font-size="12.5" fill="${C.muted}" text-anchor="middle">• Quota &amp; Rate Limiter (H8)</text>`;
  s += `<text x="500" y="345" font-family="${FONT}" font-size="12.5" fill="${C.muted}" text-anchor="middle">• TTFT Latency Monitor (H6)</text>`;

  // Targets
  // Gemini 3.8 Flash
  s += `<rect x="740" y="190" width="460" height="70" rx="8" fill="${C.green[0]}" stroke="${C.green[1]}" stroke-width="1.5"/>`;
  s += `<text x="760" y="220" font-family="${FONT}" font-size="15" font-weight="700" fill="${C.green[2]}">Cấp 1, 2, 3 (85% requests) ──► Gemini 3.8 Flash</text>`;
  s += `<text x="760" y="244" font-family="${FONT}" font-size="12" fill="${C.muted}">$0.075/1M in · $0.30/1M out · TTFT 0.55s · Context Caching giảm 75% input</text>`;

  // Gemini Pro
  s += `<rect x="740" y="275" width="460" height="70" rx="8" fill="${C.purple[0]}" stroke="${C.purple[1]}" stroke-width="1.5"/>`;
  s += `<text x="760" y="305" font-family="${FONT}" font-size="15" font-weight="700" fill="${C.purple[2]}">Cấp 4 (12% requests) ──► Gemini Pro</text>`;
  s += `<text x="760" y="329" font-family="${FONT}" font-size="12" fill="${C.muted}">$1.25/1M in · $5.00/1M out · Deep reasoning · Tool-calling Jira/Notion</text>`;

  // Imagen 3
  s += `<rect x="740" y="360" width="460" height="70" rx="8" fill="${C.amber[0]}" stroke="${C.amber[1]}" stroke-width="1.5"/>`;
  s += `<text x="760" y="390" font-family="${FONT}" font-size="15" font-weight="700" fill="${C.amber[2]}">Cấp 5 (3% requests) ──► Imagen 3 on Vertex AI</text>`;
  s += `<text x="760" y="414" font-family="${FONT}" font-size="12" fill="${C.muted}">$0.030 / ảnh · 33.000 ảnh/tháng · Sinh mockup UI &amp; sơ đồ trực quan</text>`;

  // Arrows
  s += `<path d="M 280 300 L 380 300" stroke="${C.ink}" stroke-width="2" marker-end="url(#arr)"/>`;
  s += `<path d="M 620 280 L 740 225" stroke="${C.green[1]}" stroke-width="2"/>`;
  s += `<path d="M 620 300 L 740 310" stroke="${C.purple[1]}" stroke-width="2"/>`;
  s += `<path d="M 620 320 L 740 395" stroke="${C.amber[1]}" stroke-width="2"/>`;

  // 3 Boxes FinOps Levers
  s += card(60, 490, 470, 350, C.card, C.border, "Đòn bẩy 1: Context Caching", "Tiết kiệm 350+ USD / tháng");
  s += `<text x="80" y="580" font-family="${FONT}" font-size="14" fill="${C.ink}">• Lưu System Instruction chuẩn &amp; tài liệu RAG cố định</text>`;
  s += `<text x="80" y="615" font-family="${FONT}" font-size="14" fill="${C.ink}">• Giảm <tspan font-weight="700" fill="${C.green[2]}">75% đơn giá input token</tspan> (từ $0.075 còn $0.01875)</text>`;
  s += `<text x="80" y="650" font-family="${FONT}" font-size="14" fill="${C.ink}">• Áp dụng cho 35% lưu lượng truy vấn lặp lại</text>`;
  s += `<text x="80" y="690" font-family="${FONT}" font-size="13" fill="${C.muted}">→ Lợi thế FinOps độc quyền chỉ có trên Google Vertex AI</text>`;

  s += card(565, 490, 470, 350, C.card, C.border, "Đòn bẩy 2: Dynamic Intent Routing", "Tiết kiệm 2.800+ USD / tháng");
  s += `<text x="585" y="580" font-family="${FONT}" font-size="14" fill="${C.ink}">• 85% tác vụ định tuyến về Gemini 3.8 Flash</text>`;
  s += `<text x="585" y="615" font-family="${FONT}" font-size="14" fill="${C.ink}">• Không lãng phí gọi Model Pro cho email, FAQ đơn giản</text>`;
  s += `<text x="585" y="650" font-family="${FONT}" font-size="14" fill="${C.ink}">• Tiết kiệm gấp 30 lần so với phương án dùng GPT-4o</text>`;
  s += `<text x="585" y="690" font-family="${FONT}" font-size="13" fill="${C.muted}">→ Chi phí LLM chỉ còn $1.68 / DAU / tháng</text>`;

  s += card(1070, 490, 470, 350, C.card, C.border, "Đòn bẩy 3: Quota & Budget Alert (H8)", "Kiểm soát tài chính &amp; Chống lạm chi");
  s += `<text x="1090" y="580" font-family="${FONT}" font-size="14" fill="${C.ink}">• Quota tối đa 100.000 tokens / user / ngày</text>`;
  s += `<text x="1090" y="615" font-family="${FONT}" font-size="14" fill="${C.ink}">• Cloud Monitoring Alert Policy cảnh báo khi đạt 80%</text>`;
  s += `<text x="1090" y="650" font-family="${FONT}" font-size="14" fill="${C.ink}">• Tự động ngắt tác vụ nặng khi chạm 100% ngân sách</text>`;
  s += `<text x="1090" y="690" font-family="${FONT}" font-size="13" fill="${C.muted}">→ Thỏa mãn nghiêm ngặt Ràng buộc cứng H8</text>`;

  s += `</svg>`;
  return s;
}

// ---------------- SLIDE 5: BENCHMARK & TECH COMPARISON ----------------
function slide5() {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <text x="60" y="65" font-family="${FONT}" font-size="28" font-weight="800" fill="${C.ink}">Slide 5: So sánh Công nghệ &amp; Đo Benchmark Chất lượng Đạt $\ge$ 95% (H8)</text>
  <text x="60" y="98" font-family="${FONT}" font-size="15" fill="${C.muted}">Phân tích điểm hòa vốn định lượng (API vs Tự host GPU) và Kết quả kiểm định Eval Gate trên Golden Dataset 500 mẫu</text>`;

  // Bang so sanh cong nghe (Ben trai)
  s += card(60, 140, 710, 680, C.card, C.border, "1. So sánh: Serverless API vs Tự Host GPU trên GKE", "Phân tích điểm hòa vốn (Break-even Analysis)");
  
  const headers = ["Tiêu chí", "Serverless API (Vertex AI)", "Tự Host GPU (A100 + Llama 3)"];
  s += `<rect x="80" y="210" width="670" height="38" fill="${C.blue[0]}"/>`;
  s += `<text x="95" y="235" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.ink}">${headers[0]}</text>`;
  s += `<text x="260" y="235" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.blue[2]}">${headers[1]}</text>`;
  s += `<text x="500" y="235" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.red[2]}">${headers[2]}</text>`;

  const tableRows = [
    ["Phần cứng GPU", "0 USD (Pay-as-you-go)", "15.000 – 18.000 USD / tháng"],
    ["Lãng phí ngoài giờ", "0 USD (Đêm/cuối tuần = $0)", "Lãng phí 65% (GPU chạy không tải)"],
    ["Nhân lực MLOps", "0 USD (SRE kiêm nhiệm)", "+7.000 USD / tháng (2 FTE trực đêm)"],
    ["Độ tin cậy & HA", "SLA 99.95% của Google", "Tự xử lý sập driver, OOM"],
    ["Tổng chi phí / tháng", "3.431 USD / tháng", "23.000 – 25.500 USD / tháng"],
    ["Điểm hòa vốn", "Tối ưu tuyệt đối ở 2k DAU", "Chỉ hòa vốn khi >= 55.000 DAU"]
  ];

  tableRows.forEach(([c1, c2, c3], i) => {
    const y = 250 + i * 58;
    s += `<rect x="80" y="${y}" width="670" height="56" fill="${i % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}"/>`;
    s += `<text x="95" y="${y + 32}" font-family="${FONT}" font-size="13" font-weight="600" fill="${C.ink}">${esc(c1)}</text>`;
    s += `<text x="260" y="${y + 32}" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.green[2]}">${esc(c2)}</text>`;
    s += `<text x="500" y="${y + 32}" font-family="${FONT}" font-size="12.5" fill="${C.red[2]}">${esc(c3)}</text>`;
  });

  s += `<rect x="80" y="630" width="670" height="150" rx="8" fill="${C.green[0]}" stroke="${C.green[1]}" stroke-width="1.5"/>`;
  s += `<text x="105" y="665" font-family="${FONT}" font-size="16" font-weight="700" fill="${C.green[2]}">💡 KẾT LUẬN FINOPS TRƯỚC HỘI ĐỒNG:</text>`;
  s += `<text x="105" y="700" font-family="${FONT}" font-size="13.5" fill="${C.ink}">• Giải pháp Serverless Vertex AI RẺ HƠN GẤP 7 LẦN so với việc tự dựng cụm GPU.</text>`;
  s += `<text x="105" y="730" font-family="${FONT}" font-size="13.5" fill="${C.ink}">• Tại quy mô 2.000 DAU, tự thuê GPU là lãng phí nghiêm trọng ngân sách doanh nghiệp.</text>`;
  s += `<text x="105" y="760" font-family="${FONT}" font-size="13.5" fill="${C.ink}">• Điểm hòa vốn chỉ xảy ra khi vượt 55.000 DAU. Lựa chọn Vertex AI là quyết định tối ưu 100%.</text>`;

  // Khung Benchmark H8 (Ben phai)
  s += card(810, 140, 730, 680, C.card, C.border, "2. Kết quả Đo Benchmark Chất lượng Eval Gate (H8)", "LLM-as-a-Judge trên Golden Dataset 500 mẫu vs GPT-4o");

  const benchRows = [
    ["Cấp 1: Email & FAQ", "100 mẫu", "9.42 / 10", "9.25 / 10", "98.2%", C.green],
    ["Cấp 2: Tài liệu & Slide", "100 mẫu", "9.35 / 10", "9.10 / 10", "97.3%", C.green],
    ["Cấp 3: Dữ liệu & Code", "100 mẫu", "9.20 / 10", "8.92 / 10", "97.0%", C.green],
    ["Cấp 4: Agent Jira/Notion", "100 mẫu", "9.15 / 10", "8.85 / 10", "96.7%", C.green],
    ["Cấp 5: Sinh ảnh Mockup", "100 mẫu", "8.90 / 10", "8.75 / 10", "98.3%", C.green]
  ];

  s += `<rect x="830" y="210" width="690" height="38" fill="${C.purple[0]}"/>`;
  s += `<text x="845" y="235" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.ink}">Tác vụ</text>`;
  s += `<text x="1030" y="235" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.muted}">Mẫu</text>`;
  s += `<text x="1110" y="235" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.muted}">GPT-4o (Ref)</text>`;
  s += `<text x="1240" y="235" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.purple[2]}">VBot (Gemini)</text>`;
  s += `<text x="1390" y="235" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.green[2]}">Tỷ lệ H8</text>`;

  benchRows.forEach(([t, m, ref, vb, pct, col], i) => {
    const y = 250 + i * 58;
    s += `<rect x="830" y="${y}" width="690" height="56" fill="${i % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}"/>`;
    s += `<text x="845" y="${y + 33}" font-family="${FONT}" font-size="13" font-weight="600" fill="${C.ink}">${esc(t)}</text>`;
    s += `<text x="1030" y="${y + 33}" font-family="${FONT}" font-size="13" fill="${C.muted}">${esc(m)}</text>`;
    s += `<text x="1110" y="${y + 33}" font-family="${FONT}" font-size="13" fill="${C.muted}">${esc(ref)}</text>`;
    s += `<text x="1240" y="${y + 33}" font-family="${FONT}" font-size="13" font-weight="700" fill="${C.purple[2]}">${esc(vb)}</text>`;
    s += `<text x="1390" y="${y + 33}" font-family="${FONT}" font-size="14" font-weight="800" fill="${col[2]}">${esc(pct)}</text>`;
  });

  // Tong ket H8
  s += `<rect x="830" y="560" width="690" height="220" rx="10" fill="${C.blue[0]}" stroke="${C.blue[1]}" stroke-width="2"/>`;
  s += `<text x="860" y="605" font-family="${FONT}" font-size="18" font-weight="800" fill="${C.blue[2]}">TỔNG HỢP CHẤT LƯỢNG HỆ THỐNG: 97,50%</text>`;
  s += `<text x="860" y="640" font-family="${FONT}" font-size="14" fill="${C.ink}">• Điểm số trung bình: VBot đạt <tspan font-weight="700">8,97 / 10</tspan> so với GPT-4o đạt <tspan font-weight="700">9,20 / 10</tspan>.</text>`;
  s += `<text x="860" y="670" font-family="${FONT}" font-size="14" fill="${C.ink}">• Mọi cấp độ tác vụ đều vượt xa trần chất lượng tối thiểu 95% của Ràng buộc H8.</text>`;
  s += `<text x="860" y="700" font-family="${FONT}" font-size="14" fill="${C.ink}">• Đạt 97,5% năng lực của model đắt đỏ nhất với <tspan font-weight="700" fill="${C.green[2]}">chi phí chỉ bằng 1/7</tspan>.</text>`;
  s += `<rect x="860" y="725" width="260" height="36" rx="6" fill="${C.green[1]}"/>`;
  s += `<text x="990" y="749" font-family="${FONT}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">✅ ĐẠT RÀNG BUỘC CỨNG H8</text>`;

  s += `</svg>`;
  return s;
}

const dir = path.join(__dirname);
fs.writeFileSync(path.join(dir, 'slide01_sizing.svg'), slide1(), 'utf8');
fs.writeFileSync(path.join(dir, 'slide04_model_routing.svg'), slide4(), 'utf8');
fs.writeFileSync(path.join(dir, 'slide05_benchmark_eval.svg'), slide5(), 'utf8');
console.log('Da sinh slide01_sizing.svg, slide04_model_routing.svg, slide05_benchmark_eval.svg');
