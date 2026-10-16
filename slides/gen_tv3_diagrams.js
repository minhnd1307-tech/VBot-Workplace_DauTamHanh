// Sinh so do Slide 6 (Connectors + OAuth uy nhiem) va Slide 7 (Workspace rieng + kien truc du lieu)
// dang SVG + PNG 16:9, cung phong cach voi gen_diagrams.js cua TV1.
// Dung: npm install && node gen_tv3_diagrams.js
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
  chip: '#202124',
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
</defs>`;
const line = (d, o = {}) => `<path d="${d}" fill="none" stroke="${o.color || C.ink}" stroke-width="${o.sw || 2}"${o.dash ? ' stroke-dasharray="7 5"' : ''} marker-end="url(#${o.red ? 'arrR' : 'arr'})"${o.both ? ` marker-start="url(#${o.red ? 'arrR' : 'arr'})"` : ''}/>`;
const step = (x, y, n, color) => `<circle cx="${x}" cy="${y}" r="11" fill="${color || C.gke[1]}"/>` + label(x, y + 4, String(n), { size: 12, bold: true, color: '#fff', anchor: 'middle' });
const tag = (x, y, text, color) => { const w = text.length * 6.9 + 16; return `<rect x="${x}" y="${y}" width="${w}" height="20" rx="4" fill="#FFFFFF" stroke="${color || C.muted}"/>` + label(x + 8, y + 14, text, { size: 12, color: color || C.ink }); };
const svgWrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}<rect width="${W}" height="${H}" fill="#FFFFFF"/>${body}</svg>`;

// ============================== SLIDE 6: CONNECTORS + OAUTH ==============================
function connectors() {
  let s = '';
  s += label(24, 40, 'Connectors SaaS: agent hành động bằng OAuth ủy nhiệm của chính người dùng, scope tối thiểu', { size: 22, bold: true });
  s += chips(1270, 24, ['connectors', 'secrets_kms'], 300);

  // Ben ngoai GCP
  s += box(20, 70, 210, 130, { title: 'Người dùng (A)', lines: ['Bấm "Kết nối Google/M365"', 'Xem và đồng ý từng scope', 'Thu hồi bất kỳ lúc nào'] });
  s += box(1370, 70, 210, 180, { title: 'OAuth server SaaS', lines: ['Google Identity', 'Microsoft Entra ID', 'Atlassian (3LO)', 'Notion OAuth', 'Auth code + PKCE'], color: C.ops });
  s += box(1370, 316, 210, 226, { title: 'SaaS API', lines: ['Gmail, Drive, Calendar', 'Outlook, OneDrive,', 'SharePoint, Teams (Graph)', 'Jira, Confluence, Notion', '', 'Gửi push / webhook', 'khi dữ liệu thay đổi'], color: C.ops });

  // GCP
  s += box(250, 100, 1090, 618, { color: C.gcp, sw: 2 });
  s += label(266, 122, 'Google Cloud · asia-southeast1 · GKE private cluster (3 zone)', { size: 14, bold: true, color: C.gcp[1] });

  s += box(270, 146, 300, 150, { title: 'connector-gateway (GKE)', lines: ['Nhận callback, kiểm tra state + PKCE', 'Đổi code lấy refresh token', 'Gắn token với user_id từ SSO', 'Chỉ trả access token cho', 'đúng chủ sở hữu'], color: C.gke, codes: ['connectors'] });
  s += box(640, 146, 300, 150, { title: 'Token vault', lines: ['Secret Manager, 1 secret/user/SaaS', 'Mã hóa CMEK (Cloud KMS)', 'Chỉ connector-gateway có quyền', 'Access token cache Redis ≤ 50 phút', 'Thu hồi: xóa secret + revoke'], color: C.sec, codes: ['secrets_kms'] });
  s += box(1010, 146, 310, 150, { title: 'Cloud NAT · IP tĩnh', lines: ['Đường ra Internet duy nhất', 'SaaS có thể whitelist IP', 'Sandbox không có egress'], color: C.vpc, codes: ['network'] });

  // B (goi truc tiep) ben trai, A (dong bo) ben phai gan SaaS de nhan webhook
  s += box(270, 316, 520, 226, { title: 'B. Gọi API trực tiếp khi cần (dữ liệu tươi, hành động)', lines: [
    'Gmail, Outlook, Calendar, Teams, Jira',
    'Agent gọi tool → connector-gateway lấy token của',
    '  ĐÚNG user đang chat → gọi API qua Cloud NAT',
    'Hành động ghi (gửi mail, tạo ticket, sửa trang)',
    '  dừng chờ người dùng bấm xác nhận (H4)',
    'Ưu: luôn mới, không lưu bản sao. Nhược: phụ thuộc',
    '  rate limit SaaS → token bucket theo user trong Redis'], color: C.ai, codes: ['connectors', 'governance'] });
  s += box(810, 316, 510, 226, { title: 'A. Đồng bộ trước vào index (tài liệu, wiki)', lines: [
    'Drive, OneDrive/SharePoint, Confluence, Notion',
    'Pub/Sub nhận push (Drive changes.watch, Graph',
    '  subscription, Confluence/Jira webhook)',
    '+ Cloud Scheduler delta sync 15 phút giờ hành chính',
    '→ Cloud Tasks connector-sync (backoff 10s→300s)',
    '→ tách chunk, embedding, lưu ACL gốc vào pgvector',
    'Ưu: tìm nhanh, lọc quyền trong DB. Nhược: trễ ≤ 15 phút'], color: C.data, codes: ['connectors', 'vector_db', 'cache_queue'] });

  // Luong OAuth danh so
  s += line('M230,86 L1366,86', { color: C.muted, dash: true });
  s += step(700, 86, 1, C.muted); s += label(718, 80, 'Đồng ý scope tại trang của SaaS', { size: 12.5, color: C.muted });
  s += line('M1370,134 L420,134 L420,142');
  s += step(1120, 134, 2); s += label(1138, 128, 'code + PKCE (redirect qua LB)', { size: 12.5 });
  s += line('M570,221 L636,221');
  s += step(603, 221, 3);
  s += line('M940,221 L1006,221');
  s += step(973, 221, 4);
  s += line('M1320,260 Q1352,280 1366,320');
  s += line('M1370,470 L1324,470', { dash: true, color: C.muted });

  s += box(270, 556, 1050, 150, { color: C.ops });
  s += label(286, 580, 'Scope tối thiểu theo từng SaaS (* = ghi, cần người dùng xác nhận trước khi agent thực hiện)', { size: 14, bold: true });
  const rows = [
    ['Google', 'gmail.readonly, gmail.compose*, drive.readonly, calendar.events*', 'Không xin gmail.modify, drive (full)'],
    ['Microsoft Graph', 'Mail.Read, Mail.Send*, Files.Read.All, Calendars.ReadWrite*, offline_access', 'Delegated, không application permission'],
    ['Atlassian', 'read:jira-work, write:jira-work*, read:confluence-content.all, offline_access', 'Token 3LO theo từng user'],
    ['Notion', 'User tự chọn trang chia sẻ cho integration; read content, insert content*', '3 request/giây mỗi integration'],
  ];
  rows.forEach((r, i) => {
    const y = 606 + i * 24;
    s += label(286, y, r[0], { size: 12.5, bold: true });
    s += label(420, y, r[1], { size: 12, mono: true });
    s += label(1304, y, r[2], { size: 12, color: C.muted, anchor: 'end' });
  });

  s += `<rect x="24" y="730" width="1552" height="150" rx="10" fill="#F1F3F4"/>`;
  s += label(40, 758, 'Vì sao agent của user A không dùng được quyền của user B', { size: 15, bold: true });
  [
    '1. Không có service account đọc toàn tập đoàn: mọi lệnh gọi SaaS dùng token ủy nhiệm của chính người đang chat (H2).',
    '2. connector-gateway tra token theo user_id lấy từ phiên SSO đã xác thực, không theo tham số do LLM sinh ra; LLM không bao giờ thấy token.',
    '3. Dữ liệu đồng bộ vào index mang theo ACL gốc (người, nhóm, domain); thu hồi quyền ở SaaS → webhook cập nhật ACL → biến mất khỏi kết quả.',
    '4. Lưu lượng: ~20.000 lượt gọi/ngày (10/user); rate limit theo user + Cloud Tasks backoff khi SaaS trả 429; event lỗi 10 lần vào DLQ.',
    '5. Chi phí connectors 1,75 USD/tháng: API SaaS nằm trong license tập đoàn, worker nằm trong compute, egress nằm trong network.',
  ].forEach((t, i) => { s += label(40, 782 + i * 20, t, { size: 13 }); });
  return svgWrap(s);
}

// ============================== SLIDE 7: WORKSPACE + DATA ==============================
function workspace() {
  let s = '';
  s += label(24, 40, 'Workspace riêng từng người và kiến trúc dữ liệu: cô lập ở cả 3 tầng lưu trữ', { size: 22, bold: true });
  s += chips(1120, 24, ['database', 'vector_db', 'object_storage', 'cache_queue'], 460);

  s += box(20, 80, 260, 180, { title: 'Request của user A', lines: ['JWT từ SSO → user_id, nhóm', 'Gateway mở transaction:', 'SET LOCAL app.user_id', 'SET LOCAL app.principals', '= {user:a, group:mkt, domain}'], color: C.gke });
  s += box(20, 300, 260, 180, { title: 'Sandbox gVisor (TV4)', lines: ['Chỉ mount /workspace/A', 'Token GCS downscoped:', 'chỉ prefix user-workspaces/A/', 'hết hạn 15 phút', 'Không egress, hủy sau khi chạy'], color: C.sec, codes: ['sandbox'] });
  s += box(20, 510, 260, 170, { title: 'workspace-svc', lines: ['Service DUY NHẤT có IAM', 'trên bucket workspace', 'Cấp Signed URL / token', 'downscoped theo user_id', 'Kiểm tra quota 10 GB'], color: C.gke });

  s += box(300, 70, 1280, 620, { color: C.gcp, sw: 2 });
  s += label(316, 92, 'asia-southeast1 · chỉ Private IP (Private Service Access) · mã hóa khi lưu (CMEK cho GCS) và khi truyền (TLS)', { size: 14, bold: true, color: C.gcp[1] });

  // Cloud SQL (tren trai)
  s += box(320, 106, 610, 284, { color: C.data, title: 'Cloud SQL PostgreSQL 16 · Regional HA · 4 vCPU/16 GB · 200 GB SSD' });
  s += box(336, 144, 280, 70, { title: 'Primary · zone a', lines: ['PITR + backup 02:00 hằng ngày'] });
  s += box(636, 144, 280, 70, { title: 'Standby · zone b', lines: ['Failover tự động, RPO ≈ 0'] });
  s += line('M616,179 L632,179', { both: true });
  [
    ['chat_messages', 'lịch sử chat 12 tháng, ~84 GB', 'user_id = app.user_id'],
    ['memories', 'bộ nhớ dài hạn + vector', 'user_id = app.user_id'],
    ['workspace_files', 'metadata file, chặn quota 10 GB', 'user_id + path đúng prefix'],
    ['chunks (pgvector)', '~800k chunk × 768 chiều, HNSW', 'acl_principals && principals'],
  ].forEach((r, i) => {
    const y = 240 + i * 37;
    s += label(338, y, r[0], { size: 13, bold: true, mono: true });
    s += label(338, y + 16, r[1], { size: 12, color: C.muted });
    s += tag(640, y - 14, 'RLS: ' + r[2], C.ok[1]);
  });

  // Redis (tren phai)
  s += box(950, 106, 610, 284, { color: C.data, title: 'Memorystore Redis · Standard HA 5 GB (primary zone a, replica zone b)' });
  ['Phiên + ngữ cảnh hội thoại gần nhất: key u:{uid}:session, TTL 8 giờ',
    'Cache kết quả RAG: khóa gồm hash(principals) → khác quyền không trúng cache',
    'Bộ đếm quota/rate limit theo user, đơn vị và theo SaaS',
    'Cờ hủy tác vụ agent cancel:{task_id}',
    'AUTH + TLS trong VPC; staging dùng Redis container (nằm trong compute)',
    'Sizing: 2.000 phiên × ~200 KB + cache RAG 1–2 GB ≈ 2,5 GB → 5 GB',
    'FinOps: 5 GB (bậc M2) 273,75 USD rẻ hơn 4 GB (bậc M1) 332,88 USD']
    .forEach((t, i) => { s += label(966, 150 + i * 30, '• ' + t, { size: 13, color: i > 4 ? C.muted : C.ink }); });

  // GCS (duoi trai)
  s += box(320, 404, 610, 276, { color: C.data, title: 'Cloud Storage · bucket workspace · UBLA · chặn public · CMEK' });
  s += label(336, 452, 'gs://vbot-prod-workspaces/user-workspaces/', { size: 13, mono: true });
  s += label(356, 474, '├─ {uid A}/ uploads/ exports/ images/ sandbox-out/', { size: 13, mono: true });
  s += label(356, 496, '└─ {uid B}/ ...', { size: 13, mono: true });
  const lc = [['Standard', '0–90 ngày · 1.050 GB'], ['Nearline', '90–365 ngày · 3.150 GB'], ['Coldline', '> 365 ngày · năm 2']];
  lc.forEach((r, i) => {
    const x = 336 + i * 198;
    s += box(x, 512, 180, 58, { title: r[0], lines: [r[1]], color: C.svc });
    if (i < 2) s += line(`M${x + 180},541 L${x + 196},541`);
  });
  s += label(336, 598, 'Versioning giữ 3 bản cũ / 30 ngày · soft delete 7 ngày (khôi phục file agent ghi đè)', { size: 12.5, color: C.muted });
  s += label(336, 620, '4.200 GB = 2,1 GB/user, dưới quota 10 GB · quota chặn ở DB trước khi cấp URL upload', { size: 12.5, color: C.muted });
  s += label(336, 648, 'Chỉ workspace-svc có IAM trên bucket → sandbox/agent không liệt kê', { size: 12.5, color: C.sec[1], bold: true });
  s += label(336, 666, 'được prefix của người khác', { size: 12.5, color: C.sec[1], bold: true });

  // Cloud Tasks (duoi phai)
  s += box(950, 404, 610, 276, { color: C.data, title: 'Cloud Tasks · hàng đợi agent chạy nền (H6) và đồng bộ connector' });
  ['agent-queue: 10 dispatch/s, 50 đồng thời, retry 3 lần, tối đa 600 s',
    'Mỗi tác vụ cấp 4 tách ~6 bước, mỗi bước có idempotency key',
    'Hủy: DeleteTask + cờ cancel trong Redis, worker dừng ở bước kế',
    'Xong → thông báo Teams/email + lưu kết quả vào workspace user',
    'connector-sync-queue: 5 dispatch/s, backoff 10 s → 300 s khi 429',
    'Sizing: 132.000 tác vụ cấp 4/tháng → ~4,2 triệu operation']
    .forEach((t, i) => { s += label(966, 450 + i * 30, '• ' + t, { size: 13, color: i > 4 ? C.muted : C.ink }); });

  s += line('M280,170 L316,200');
  s += line('M280,420 L316,470', { red: true, dash: true });
  s += line('M280,590 L316,590');

  s += `<rect x="24" y="704" width="1552" height="176" rx="10" fill="${C.ok[0]}" stroke="${C.ok[1]}"/>`;
  s += label(40, 732, 'Chứng minh: user A không đọc được workspace hay kết quả vector của user B · tv3_data/run_isolation_test.sh (PostgreSQL 16 + pgvector 0.8): 7/7 PASS', { size: 15, bold: true, color: C.ok[1] });
  const tests = [
    ['T1', 'Chưa có danh tính → 0 dòng (fail-closed)'],
    ['T2', 'Alice: thấy tài liệu riêng + toàn công ty, không thấy bảng lương'],
    ['T3', 'Bob dùng ĐÚNG vector tài liệu riêng của Alice → 0 kết quả'],
    ['T4', 'Bob ghi tin nhắn mang user_id của Alice → RLS chặn'],
    ['T5', 'Bob đăng ký file trỏ sang prefix GCS của Alice → bị chặn'],
    ['T6', 'Ghi vượt quota 10 GB → bị chặn'],
    ['T7', 'Thu hồi quyền ở SaaS → Bob mất kết quả ngay'],
  ];
  tests.forEach((t, i) => {
    const x = i < 4 ? 40 : 800, y = 760 + (i % 4) * 22;
    s += label(x, y, 'PASS ' + t[0], { size: 13.5, bold: true, color: C.ok[1] });
    s += label(x + 78, y, t[1], { size: 13.5 });
  });
  s += label(800, 826, 'Lọc quyền nằm TRONG truy vấn ANN (RLS + hnsw.iterative_scan),', { size: 13.5, color: C.muted });
  s += label(800, 848, 'không lọc sau ở ứng dụng → không rò qua top-k hay cache.', { size: 13.5, color: C.muted });
  return svgWrap(s);
}

const outDir = __dirname;
const files = { 'slide06_connectors_oauth': connectors(), 'slide07_workspace_du_lieu': workspace() };
let Resvg = null;
try { ({ Resvg } = require('@resvg/resvg-js')); } catch (e) { /* chi xuat SVG */ }
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name + '.svg'), svg);
  if (Resvg) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1920 }, font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } }).render().asPng();
    fs.writeFileSync(path.join(outDir, name + '.png'), png);
  }
  console.log('Da ghi ' + name + (Resvg ? '.svg + .png' : '.svg (cai @resvg/resvg-js de xuat PNG)'));
}
