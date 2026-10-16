// Sinh so do Slide 8 (Sandbox gVisor), Slide 9 (Governance + DLP + Human-in-the-loop)
// va Slide 10 (HA Multi-AZ + Backup/DR) dang SVG + PNG 16:9 cho TV4.
// Dung: node gen_tv4_diagrams.js
const fs = require('fs');
const path = require('path');

const W = 1600, H = 900;
const FONT = "Segoe UI, Arial, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";
const C = {
  ink: '#202124', muted: '#5F6368',
  gcp: ['#F5F9FF', '#4285F4'], vpc: ['#F3FBF5', '#34A853'], gke: ['#EAF2FE', '#1A73E8'],
  svc: ['#FFFFFF', '#9AA0A6'], data: ['#FFF8E6', '#F9AB00'], ai: ['#F3E8FD', '#9334E6'],
  sec: ['#FCE8E6', '#D93025'], ops: ['#F1F3F4', '#5F6368'], ok: ['#E6F4EA', '#188038'],
  zone: ['#FFFFFF', '#8AB4F8'], chip: '#202124',
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const chipW = code => code.length * 7.3 + 14;

function chips(x, y, codes, maxW) {
  let out = '', cx = x, cy = y;
  for (const code of codes) {
    const w = chipW(code);
    if (cx + w > x + maxW && cx > x) { cx = x; cy += 22; }
    out += `<rect x="${cx}" y="${cy}" width="${w}" height="18" rx="9" fill="${C.chip}"/>` +
      `<text x="${cx + w / 2}" y="${cy + 13}" font-family="${MONO}" font-size="12" fill="#fff" text-anchor="middle">${esc(code)}</text>`;
    cx += w + 6;
  }
  return out;
}

function box(x, y, w, h, o) {
  const [fill, stroke] = o.color || C.svc;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${o.sw || 1.5}"${o.dash ? ' stroke-dasharray="6 4"' : ''}/>`;
  const ts = o.titleSize || 14.5;
  if (o.title) s += `<text x="${x + 12}" y="${y + ts + 9}" font-family="${FONT}" font-size="${ts}" font-weight="700" fill="${C.ink}">${esc(o.title)}</text>`;
  (o.lines || []).forEach((l, i) => {
    s += `<text x="${x + 12}" y="${y + ts + 29 + i * 17}" font-family="${o.mono ? MONO : FONT}" font-size="12.5" fill="${C.muted}">${esc(l)}</text>`;
  });
  if (o.codes) s += chips(x + 12, y + h - 26, o.codes, w - 24);
  return s;
}

function label(x, y, text, o = {}) {
  return `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : FONT}" font-size="${o.size || 13}" font-weight="${o.bold ? 700 : 400}" fill="${o.color || C.ink}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(text)}</text>`;
}

const DEFS = `<defs>
  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.ink}"/></marker>
  <marker id="arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.sec[1]}"/></marker>
  <marker id="arrG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.ok[1]}"/></marker>
</defs>`;
const line = (d, o = {}) => `<path d="${d}" fill="none" stroke="${o.color || C.ink}" stroke-width="${o.sw || 2}"${o.dash ? ' stroke-dasharray="7 5"' : ''} marker-end="url(#${o.red ? 'arrR' : o.green ? 'arrG' : 'arr'})"${o.both ? ` marker-start="url(#${o.red ? 'arrR' : 'arr'})"` : ''}/>`;
const step = (x, y, n, color) => `<circle cx="${x}" cy="${y}" r="11" fill="${color || C.gke[1]}"/>` + label(x, y + 4, String(n), { size: 12, bold: true, color: '#fff', anchor: 'middle' });
const tag = (x, y, text, color) => { const w = text.length * 6.9 + 16; return `<rect x="${x}" y="${y}" width="${w}" height="20" rx="4" fill="#FFFFFF" stroke="${color || C.muted}"/>` + label(x + 8, y + 14, text, { size: 12, color: color || C.ink }); };
const svgWrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}<rect width="${W}" height="${H}" fill="#FFFFFF"/>${body}</svg>`;

// ============================== SLIDE 8: SANDBOX GVISOR ==============================
function slide8() {
  let s = '';
  s += label(24, 40, 'Slide 8: Cô lập Sandbox chạy Code bằng gVisor (H3) & NetworkPolicy chặn Egress', { size: 22, bold: true });
  s += chips(1340, 24, ['sandbox', 'compute'], 100);

  // Khung ben trai: Agent Coordinator & Dispatch
  s += box(30, 90, 320, 710, { color: C.gke, title: '1. Điều phối Tác vụ Agent',
    lines: ['Người dùng yêu cầu chạy script phân tích,', 'xử lý dữ liệu bảng tính, vẽ biểu đồ', '',
            'Orchestrator nhận lệnh và sinh code', 'Gán quota: CPU 1 vCPU, RAM 2 GB', 'Giới hạn thời gian: timeout 60 giây', '',
            'Gửi code qua internal gRPC:', 'Chỉ qua cluster IP nội bộ', 'Không mount volume nhạy cảm'] });
  s += step(50, 150, 1);
  s += box(50, 370, 280, 160, { color: C.svc, title: 'agent-coordinator pod',
    lines: ['Namespace: vbot-core', 'Gửi code + dataset tạm', 'Nhận kết quả (stdout/ảnh)', 'Không cho agent quyền root'] });

  // Khung giua: GKE Node Pool Sandbox voi gVisor
  s += box(380, 90, 760, 710, { color: C.sec, title: '2. Node Pool Sandbox gVisor (Cô lập tầng Kernel)',
    lines: ['GKE Standard Node Pool chuyên dụng: sandbox_config { sandbox_type = "gvisor" }',
            'Taint: sandbox.gke.io/runtime=gvisor:NoSchedule (ngăn pod thường chạy nhầm)'] });
  s += step(400, 150, 2);

  // Cau truc ben trong Sandbox Pod
  s += box(410, 180, 700, 360, { color: C.svc, title: 'Kiến trúc Container gVisor (runsc runtime)', titleSize: 16 });
  s += box(430, 230, 660, 70, { color: C.ai, title: 'User Application: Python 3 Code Execution',
    lines: ['Code do LLM sinh ra chạy trong sandbox · Bị hạn chế quyền non-root (UID 10001)'] });
  s += box(430, 320, 660, 90, { color: C.sec, title: 'gVisor Sentry (User-Space Kernel bằng Go)',
    lines: ['Đánh chặn và xử lý trực tiếp toàn bộ Linux Syscalls trong user-space',
            'CHẶN: ptrace, raw socket, setns, chroot breakout, bpf, load module',
            'Không bao giờ để mã độc chạm trực tiếp vào Host Linux Kernel'] });
  s += box(430, 430, 660, 80, { color: C.ops, title: 'Host Linux Kernel & Bare-Metal Worker',
    lines: ['Host chỉ thấy tiến trình gVisor Sentry như một ứng dụng thông thường',
            'Không thể tấn công kernel privilege escalation / container breakout'] });

  // Co che Cleanup & Ephemeral
  s += box(410, 560, 700, 220, { color: C.ok, title: 'Vòng đời Ephemeral & Tiêu hủy Pod (H3)', titleSize: 15,
    lines: ['Mỗi phiên chạy code là 1 Pod hoàn toàn mới (Single-use Ephemeral Pod)',
            'Bộ nhớ tạm: emptyDir { medium: "Memory" } dung lượng tối đa 500 MB',
            'Sau 60s hoặc khi chạy xong: Pod bị FORCE DESTROY ngay lập tức',
            'Dữ liệu tạm, biến môi trường và file trung gian bị xóa sạch 100%',
            'Không lưu vết, không rò rỉ trạng thái giữa các lần thực thi'] });

  // Khung ben phai: NetworkPolicy & Metadata Barrier
  s += box(1170, 90, 400, 710, { color: C.vpc, title: '3. NetworkPolicy: Tuyệt đối chặn Egress',
    lines: ['Chặn toàn bộ Egress ra bên ngoài:',
            'Pod không thể kết nối Internet (0.0.0.0/0)', 'Ngăn chặn rò rỉ dữ liệu (Exfiltration)', '',
            'Chặn Endpoint GCP Metadata: 169.254.169.254/32',
            'Mã độc không thể lấy Service Account Token!', '',
            'Chỉ mở cổng DNS 53 (kube-dns nội bộ)', 'Chỉ nhận lệnh từ agent-coordinator:8080'] });
  s += step(1190, 150, 3);
  s += box(1190, 420, 360, 160, { color: C.sec, title: 'Tường lửa Chặn Egress',
    lines: ['DROP 0.0.0.0/0 (Internet)', 'DROP 169.254.169.254 (Metadata)', 'ALLOW cluster DNS:53', 'ALLOW Ingress từ Core:8080'], mono: true });

  s += line('M 330 450 L 410 450', { sw: 3 });
  s += line('M 1110 450 L 1170 450', { sw: 3, red: true });

  s += `<rect x="30" y="818" width="1540" height="64" rx="10" fill="#EAF2FE"/>`;
  s += label(50, 844, 'Thỏa mãn H3: Cô lập tuyệt đối môi trường chạy code bằng microVM/gVisor. Chặn 100% Egress Internet và Cloud Metadata.', { size: 14.5, bold: true });
  s += label(50, 866, 'Mã Terraform có sẵn trong modules/security_sandbox. Sizing: 2 node c2-standard-4 giờ HC + 1 staging Spot = 228.80 USD/tháng.', { size: 14, color: C.muted });
  return svgWrap(s);
}

// ============================== SLIDE 9: GOVERNANCE & DLP ==============================
function slide9() {
  let s = '';
  s += label(24, 40, 'Slide 9: AI & Data Governance (H4, H5) · Cloud DLP, Chống Prompt Injection & HITL', { size: 22, bold: true });
  s += chips(1340, 24, ['governance', 'monitoring'], 100);

  // 1. Prompt Injection Defense
  s += box(30, 90, 480, 710, { color: C.sec, title: '1. Ba Lớp Chống Prompt Injection (H4)',
    lines: ['Bảo vệ trước tấn công phá rào (Jailbreak, DAN, Delimiter)', '',
            'Lớp 1: Semantic Classifier & Regex Guardrail',
            '· Quét nhận diện mẫu: "ignore previous instructions", "DAN"',
            '· Phát hiện ký tự phân tách lạ nhằm ngắt context',
            '· Tự động từ chối và ghi log cảnh báo tức thì', '',
            'Lớp 2: Prompt Hardening & Delimiter Formatting',
            '· Đóng gói dữ liệu người dùng trong cặp thẻ <user_input>',
            '· System prompt cố định, nghiêm cấm tiết lộ chỉ dẫn nội bộ', '',
            'Lớp 3: Output Guardrail & Token Leakage Check',
            '· Quét câu trả lời LLM trước khi stream về client',
            '· Chặn đứng nếu phát hiện rò rỉ mã khóa, token hoặc prompt gốc'] });
  s += step(50, 150, 1);

  // 2. Cloud DLP API
  s += box(540, 90, 520, 710, { color: C.data, title: '2. Cloud Sensitive Data Protection (DLP API - H5)',
    lines: ['Tự động quét và che giấu (mask) dữ liệu nhạy cảm PII', 'Thực thi trước khi gửi sang LLM và trước khi ghi Log', '',
            'Các InfoType cấu hình trong Terraform Inspect Template:',
            '· EMAIL_ADDRESS: Ẩn email cá nhân',
            '· PHONE_NUMBER (Vietnam): Đầu số 03, 05, 07, 08, 09',
            '· VIETNAM_CCCD: Định dạng 12 chữ số căn cước công dân',
            '· CREDIT_CARD_NUMBER: Visa, Mastercard 16 chữ số', '',
            'Cơ chế Masking an toàn:',
            'Thay thế chuỗi PII bằng [MASKED_TYPE] trước khi LLM xử lý',
            'Giải mã token hoàn trả cho người dùng ở tầng API Gateway',
            'LLM không bao giờ nhìn thấy dữ liệu PII gốc!'] });
  s += step(560, 150, 2);

  // 3. Human-in-the-Loop & Audit Logging
  s += box(1090, 90, 480, 710, { color: C.ok, title: '3. Human-in-the-Loop & Audit Log 12 Tháng',
    lines: ['Cơ chế Human-in-the-Loop bắt buộc (H4):',
            '· Thao tác ĐỌC (RAG, search Notion, Jira): tự động chạy',
            '· Thao tác GHI/GỬI RA NGOÀI (send mail, create issue, delete file):',
            '  Agent BẮT BUỘC dừng lại và gửi popup xin xác nhận',
            '  Chỉ thực thi khi người dùng click "Đồng ý"', '',
            'Audit Logging 12 Tháng (H5):',
            '· Mọi request, prompt, response, quyết định guardrail',
            '· Ghi vào Cloud Logging Bucket lưu trữ đúng 365 ngày',
            '· Thiết lập Immutable Bucket Lock (WORM - chống xóa/sửa)',
            '· Phục vụ thanh tra tuân thủ an toàn thông tin doanh nghiệp'] });
  s += step(1110, 150, 3);

  s += line('M 510 380 L 540 380', { sw: 2.5 });
  s += line('M 1060 380 L 1090 380', { sw: 2.5 });

  s += `<rect x="30" y="818" width="1540" height="64" rx="10" fill="#EAF2FE"/>`;
  s += label(50, 844, 'Thỏa mãn H4 & H5: Chống Prompt Injection 3 lớp, DLP che PII tự động, bắt buộc xác nhận người dùng cho hành động nhạy cảm.', { size: 14.5, bold: true });
  s += label(50, 866, 'Audit Log 12 tháng lưu bất biến tại Cloud Logging Bucket. Chi phí: DLP API 100 USD + Monitoring/Logging 40 USD = 140 USD/tháng.', { size: 14, color: C.muted });
  return svgWrap(s);
}

// ============================== SLIDE 10: HA & BACKUP / DR ==============================
function slide10() {
  let s = '';
  s += label(24, 40, 'Slide 10: Tính sẵn sàng cao (HA Multi-AZ) & Kế hoạch Phục hồi Thảm họa (RTO ≤ 4h, RPO ≤ 1h)', { size: 22, bold: true });
  s += chips(1340, 24, ['backup_dr', 'database'], 100);

  // Khung ben trai: HA Multi-AZ
  s += box(30, 90, 740, 710, { color: C.gcp, title: '1. Kiến trúc Sẵn sàng Cao (Multi-AZ HA) tại Singapore',
    lines: ['Chạy trên 3 Availability Zones độc lập (asia-southeast1-a/b/c) · Không có điểm lỗi đơn (No SPOF)', '',
            'Global Application Load Balancer:',
            '· Anycast IP phủ toàn cầu, health check tự động ngắt traffic pod lỗi (10-30s)', '',
            'GKE Regional Cluster (3 Zones):',
            '· 4 app node trải đều 3 zone trong giờ hành chính',
            '· Khi 1 AZ sập: Pod ở 2 AZ còn lại tiếp tục phục vụ, Cluster Autoscaler bù node trong 2-4 phút', '',
            'Cloud SQL Regional HA (PostgreSQL 16 + pgvector):',
            '· Primary (Zone a) sao chép đồng bộ mức đĩa (Regional PD) sang Standby (Zone b)',
            '· Tự động Failover trong vòng 60 giây khi Zone a gặp sự cố',
            '· RPO = 0 đối với các giao dịch đã commit (Không mất mát dữ liệu!)', '',
            'Memorystore Redis Standard HA:',
            '· Primary + Replica đa zone, tự động thăng cấp trong 30 giây'] });
  s += step(50, 150, 1);

  // Khung ben phai: Backup & Disaster Recovery
  s += box(800, 90, 770, 710, { color: C.ok, title: '2. Chiến lược Sao lưu & Khôi phục Thảm họa (DR Plan)',
    lines: ['Đáp ứng nghiêm ngặt Ràng buộc cứng H7: RTO ≤ 4 giờ, RPO ≤ 1 giờ', '',
            'Kế hoạch Sao lưu Dữ liệu (Backup Strategy):',
            '· Cloud SQL Automated Daily Backup: lưu 14 bản sao lưu (02:00 sáng)',
            '· Point-In-Time Recovery (PITR): ghi giữ Transaction WAL log liên tục 7 ngày',
            '  -> Cho phép khôi phục chính xác tới từng giây. RPO thực tế ≤ 5 phút!',
            '· GCS Workspace: Bật Object Versioning + Soft Delete 7 ngày + CMEK khóa KMS', '',
            'Kịch bản Khôi phục Thảm họa diện rộng (Regional Outage DR):',
            '· Thảm họa toàn Singapore sập diện rộng:',
            '· Sao lưu định kỳ sang Secondary Region: asia-southeast2 (Jakarta)',
            '· Hạ tầng dựng lại 100% bằng Terraform IaC trong 25 phút',
            '· Khôi phục Database từ bản sao lưu gần nhất: 20 phút',
            '· Tổng thời gian khôi phục (RTO thực tế) = 45 phút << Cam kết 4 giờ (H7)',
            '· Chi phí: Automated backup + Cross-region storage = 59.00 USD/tháng'] });
  s += step(820, 150, 2);

  // Hop so sanh chi so SLA
  s += box(830, 580, 710, 190, { color: C.svc, title: 'Bảng Cam kết Chỉ số Phục hồi (Disaster Recovery Metrics)', titleSize: 14 });
  s += label(850, 640, 'Chỉ số', { size: 14, bold: true });
  s += label(1020, 640, 'Yêu cầu H7', { size: 14, bold: true });
  s += label(1180, 640, 'Kiến trúc VBot', { size: 14, bold: true });
  s += label(1380, 640, 'Đánh giá', { size: 14, bold: true });

  s += line('M 850 655 L 1510 655', { sw: 1, color: C.muted });
  s += label(850, 680, 'RPO (Mất dữ liệu tối đa)');
  s += label(1020, 680, '≤ 1 giờ (60 phút)');
  s += label(1180, 680, '5 phút (PITR WAL)', { bold: true, color: C.ok[1] });
  s += label(1380, 680, 'VƯỢT CHUẨN 12x', { bold: true, color: C.ok[1] });

  s += label(850, 720, 'RTO (Thời gian phục hồi)');
  s += label(1020, 720, '≤ 4 giờ (240 phút)');
  s += label(1180, 720, '45 phút (Terraform IaC)', { bold: true, color: C.ok[1] });
  s += label(1380, 720, 'VƯỢT CHUẨN 5.3x', { bold: true, color: C.ok[1] });

  s += label(850, 755, 'Failover nội bộ (1 AZ)');
  s += label(1020, 755, 'Tự động trong SLA');
  s += label(1180, 755, '≤ 60 giây (Multi-AZ)', { bold: true, color: C.ok[1] });
  s += label(1380, 755, 'ĐẠT 99.5% UPTIME', { bold: true, color: C.ok[1] });

  s += `<rect x="30" y="818" width="1540" height="64" rx="10" fill="#EAF2FE"/>`;
  s += label(50, 844, 'Thỏa mãn H7: Uptime 99.5%, Multi-AZ không điểm lỗi đơn. Failover 1 zone mất dưới 1 phút. Khôi phục toàn bộ dưới 45 phút.', { size: 14.5, bold: true });
  s += label(50, 866, 'Cloud SQL PITR 7 ngày + Backup cross-region Jakarta. Toàn bộ hạ tầng phục hồi tự động bằng mã nguồn Terraform.', { size: 14, color: C.muted });
  return svgWrap(s);
}

const outDir = __dirname;
const files = {
  'slide08_sandbox_gvisor': slide8(),
  'slide09_governance_dlp': slide9(),
  'slide10_ha_backup_dr': slide10()
};

let Resvg = null;
try { ({ Resvg } = require('@resvg/resvg-js')); } catch (e) { /* chi xuat SVG */ }

for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name + '.svg'), svg);
  if (Resvg) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1920 }, font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } }).render().asPng();
    fs.writeFileSync(path.join(outDir, name + '.png'), png);
  }
  console.log('Da ghi ' + name + (Resvg ? '.svg + .png' : '.svg'));
}
