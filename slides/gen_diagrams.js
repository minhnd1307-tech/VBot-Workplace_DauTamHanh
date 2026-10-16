// Sinh so do Slide 2 (kien truc tong the) va Slide 3 (luong 1 request) dang SVG + PNG 16:9.
// Dung: npm install && node gen_diagrams.js
const fs = require('fs');
const path = require('path');

const W = 1600, H = 900;
const FONT = "Segoe UI, Arial, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";
const C = {
  ink: '#202124', muted: '#5F6368',
  gcp: ['#F5F9FF', '#4285F4'], vpc: ['#F3FBF5', '#34A853'], gke: ['#EAF2FE', '#1A73E8'],
  svc: ['#FFFFFF', '#9AA0A6'], data: ['#FFF8E6', '#F9AB00'], ai: ['#F3E8FD', '#9334E6'],
  sec: ['#FCE8E6', '#D93025'], ops: ['#F1F3F4', '#5F6368'], zone: ['#FFFFFF', '#8AB4F8'],
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
    s += `<text x="${x + 12}" y="${y + ts + 29 + i * 17}" font-family="${FONT}" font-size="12.5" fill="${C.muted}">${esc(l)}</text>`;
  });
  if (o.codes) s += chips(x + 12, y + h - 26, o.codes, w - 24);
  return s;
}

function label(x, y, text, o = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size || 13}" font-weight="${o.bold ? 700 : 400}" fill="${o.color || C.ink}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(text)}</text>`;
}

const DEFS = `<defs>
  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.ink}"/></marker>
</defs>`;
const line = (d, o = {}) => `<path d="${d}" fill="none" stroke="${o.color || C.ink}" stroke-width="${o.sw || 2}"${o.dash ? ' stroke-dasharray="7 5"' : ''} marker-end="url(#arr)"${o.both ? ' marker-start="url(#arr)"' : ''}/>`;
const svgWrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}<rect width="${W}" height="${H}" fill="#FFFFFF"/>${body}</svg>`;

// ============================== SLIDE 2: KIEN TRUC ==============================
function architecture() {
  let s = '';
  s += label(24, 40, 'VBot Workplace trên Google Cloud · asia-southeast1 (Singapore) · 3 AZ · prod + staging', { size: 22, bold: true });
  s += chips(1340, 24, ['code'], 60) + label(1404, 38, '= mã component trong báo giá', { size: 13, color: C.muted });

  // Ngoai GCP: nguoi dung, IdP
  s += box(20, 120, 180, 120, { title: 'Người dùng', lines: ['2.000 nhân viên (DAU)', 'Web, Teams, Outlook', 'Giờ hành chính 8–18h'] });
  s += box(20, 275, 180, 125, { title: 'IdP tập đoàn', lines: ['SSO OIDC / SAML 2.0', 'MFA bắt buộc'], codes: ['authn'], color: C.sec });

  // GCP project
  s += box(220, 95, 1160, 790, { color: C.gcp, sw: 2 });
  s += label(236, 117, 'Google Cloud · project vbot-prod · region asia-southeast1', { size: 14, bold: true, color: C.gcp[1] });

  // Edge
  s += box(240, 140, 180, 120, { title: 'Cloud Armor WAF', lines: ['OWASP SQLi / XSS', 'Rate limit theo IP'], codes: ['network'], color: C.sec });
  s += box(240, 285, 180, 150, { title: 'Global External ALB', lines: ['Anycast, đa zone', 'TLS 1.2+, cert Google', 'Health check từng pod'], codes: ['load_balancer'] });

  // VPC
  s += box(440, 135, 720, 545, { color: C.vpc, dash: true, sw: 2 });
  s += label(456, 157, 'VPC vbot-prod-vpc · subnet regional 10.10.0.0/20 · Private Google Access', { size: 13, bold: true, color: '#188038' });
  s += chips(1086, 144, ['network'], 70);

  // GKE
  s += box(456, 170, 688, 330, { color: C.gke });
  s += label(470, 192, 'GKE regional private cluster · Dataplane V2 · Workload Identity', { size: 13.5, bold: true, color: C.gke[1] });
  s += chips(1068, 178, ['compute'], 70);
  const col = i => 472 + i * 168;
  s += box(col(0), 206, 152, 92, { title: 'Web / API', lines: ['UI + REST, stream SSE'], codes: ['compute'] });
  s += box(col(1), 206, 152, 92, { title: 'Orchestrator', lines: ['Agent runtime, RAG'], codes: ['compute'] });
  s += box(col(2), 206, 152, 92, { title: 'Policy & ACL', lines: ['RBAC/ABAC, ACL gốc'], codes: ['authz'] });
  s += box(col(3), 206, 152, 92, { title: 'LLM Gateway', lines: ['Routing 5 cấp, quota'], codes: ['gateway'] });
  s += box(col(0), 310, 152, 92, { title: 'Guardrail + DLP', lines: ['Prompt injection, PII'], codes: ['governance'], color: C.sec });
  s += box(col(1), 310, 152, 92, { title: 'Sandbox gVisor', lines: ['Không egress, hủy pod'], codes: ['sandbox'], color: C.sec });
  s += box(col(2), 310, 152, 92, { title: 'Staging', lines: ['Namespace + pool Spot'], codes: ['cicd'] });
  s += box(col(3), 310, 152, 92, { title: 'Connector workers', lines: ['OAuth ủy nhiệm user'], codes: ['connectors'] });
  const zx = i => 472 + i * 224;
  ['a', 'b', 'c'].forEach((z, i) => {
    s += box(zx(i), 414, 208, 74, { title: `Zone asia-southeast1-${z}`, titleSize: 13, color: C.zone,
      lines: i === 0 ? ['app: 1 node 24/7 + 1 giờ HC', '+ staging 1 node Spot'] : ['app: 1 node giờ hành chính', 'sandbox gVisor (TV4)'] });
  });

  // Data trong VPC (Private IP)
  s += label(472, 518, 'Private Service Access (chỉ Private IP)', { size: 12.5, color: C.muted });
  s += box(zx(0), 526, 208, 140, { title: 'Cloud SQL PostgreSQL HA', titleSize: 14, lines: ['pgvector, lịch sử chat', 'Primary zone a ↔ standby b'], codes: ['database', 'vector_db'], color: C.data });
  s += box(zx(1), 526, 208, 140, { title: 'Memorystore Redis HA', titleSize: 14, lines: ['Cache phiên, kết quả', 'Replica ở zone khác'], codes: ['cache_queue'], color: C.data });
  s += box(zx(2), 526, 208, 140, { title: 'Cloud NAT + Router', titleSize: 14, lines: ['Egress có kiểm soát', 'IP cố định cho SaaS'], codes: ['network'] });

  // Dich vu managed ngoai VPC
  s += box(1176, 140, 190, 200, { title: 'Vertex AI', lines: ['Gemini Flash · cấp 1–3', 'Gemini Pro · cấp 4', 'Imagen · cấp 5', 'text-embedding', 'Không train trên data'], codes: ['llm', 'embedding'], color: C.ai });
  s += box(1176, 380, 190, 104, { title: 'Cloud Storage', lines: ['Workspace riêng/user', 'CMEK, lifecycle'], codes: ['object_storage'], color: C.data });
  s += box(1176, 496, 190, 80, { title: 'Cloud Tasks', lines: ['Hàng đợi agent nền'], codes: ['cache_queue'], color: C.data });
  s += box(1176, 588, 190, 92, { title: 'KMS + Secret Manager', lines: ['Token vault OAuth'], codes: ['secrets_kms'], color: C.sec });

  // Ops
  const ox = i => 240 + i * 286;
  s += box(ox(0), 700, 268, 165, { title: 'Cloud Logging + Monitoring', lines: ['Metric, trace, token theo user', 'Audit log lưu 12 tháng', 'Cảnh báo SLO và ngân sách'], codes: ['monitoring'], color: C.ops });
  s += box(ox(1), 700, 268, 165, { title: 'Cloud DLP API', lines: ['Inspect template PII', 'Che PII trước LLM và log'], codes: ['governance'], color: C.sec });
  s += box(ox(2), 700, 268, 165, { title: 'Backup & DR', lines: ['PITR Cloud SQL, RPO ≤ 1 giờ', 'Bản sao sang asia-southeast2', 'RTO ≤ 4 giờ, diễn tập hằng quý'], codes: ['backup_dr'], color: C.ops });
  s += box(ox(3), 700, 268, 165, { title: 'CI/CD + IaC', lines: ['Cloud Build → Artifact Registry', 'Terraform 5 module', 'Deploy staging → production'], codes: ['cicd'], color: C.ops });

  // SaaS ben ngoai
  s += box(1396, 300, 186, 250, { title: 'SaaS bên ngoài', lines: ['Google Workspace', 'Microsoft 365', 'Notion', 'Jira', 'Confluence', 'API + webhook'], codes: ['connectors'], dash: true });

  // Mui ten
  s += line('M200,190 L238,190');
  s += line('M110,240 L110,273', { both: true }) + label(118, 262, 'SSO', { size: 12, color: C.muted });
  s += line('M330,260 L330,283');
  s += line('M420,345 L446,345 L446,252 L470,252');
  s += line('M1128,250 L1174,250', { dash: true, color: C.ai[1] });
  s += line('M1128,600 L1152,600 L1152,360 L1394,360', { dash: true });
  s += label(1188, 354, 'egress qua NAT', { size: 12, color: C.muted });
  return svgWrap(s);
}

// ============================== SLIDE 3: LUONG REQUEST ==============================
function flow() {
  let s = '';
  s += label(24, 40, 'Luồng một request: chat có RAG, connector, sandbox và xác nhận của người dùng', { size: 22, bold: true });
  const lanes = [
    ['Người dùng', []], ['IdP SSO + MFA', ['authn']], ['Armor + ALB', ['network', 'load_balancer']],
    ['Web / API', ['compute', 'authz']], ['Guardrail + DLP', ['governance']], ['Orchestrator', ['compute', 'cache_queue']],
    ['pgvector + SQL', ['vector_db', 'database']], ['Connector + Vault', ['connectors', 'secrets_kms']],
    ['LLM GW → Vertex', ['gateway', 'llm']], ['Sandbox gVisor', ['sandbox', 'object_storage']],
  ];
  const lx = i => 88 + i * 158;
  const top = 64, hh = 92, bottom = 800;
  lanes.forEach(([t, codes], i) => {
    const x = lx(i) - 72;
    s += `<line x1="${lx(i)}" y1="${top + hh}" x2="${lx(i)}" y2="${bottom}" stroke="#BDC1C6" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    s += `<rect x="${x}" y="${top}" width="144" height="${hh}" rx="10" fill="${i === 0 ? '#F1F3F4' : '#EAF2FE'}" stroke="${i === 0 ? C.muted : C.gke[1]}" stroke-width="1.5"/>`;
    s += label(lx(i), top + 24, t, { size: 13.5, bold: true, anchor: 'middle' });
    // chip can giua
    let row = [], rows = [], wsum = 0;
    codes.forEach(c => { const w = chipW(c); if (wsum + w > 130 && row.length) { rows.push(row); row = []; wsum = 0; } row.push(c); wsum += w + 6; });
    if (row.length) rows.push(row);
    rows.forEach((r, ri) => {
      const tw = r.reduce((a, c) => a + chipW(c) + 6, -6);
      s += chips(lx(i) - tw / 2, top + 36 + ri * 24, r, 200);
    });
  });

  const steps = [
    [0, 1, 'Đăng nhập SSO (OIDC/SAML) + MFA, nhận ID token'],
    [0, 2, 'HTTPS /chat · WAF OWASP + rate limit · TLS 1.2+'],
    [2, 3, 'ALB chuyển tới pod khỏe ở 1 trong 3 zone'],
    [3, 4, 'Xác thực JWT, RBAC → guardrail đầu vào, DLP che PII'],
    [4, 5, 'Prompt đã làm sạch + ngữ cảnh của user'],
    [5, 6, 'RAG: vector search, lọc theo ACL gốc của user'],
    [5, 7, 'Dữ liệu SaaS mới: OAuth token của chính user, qua Cloud NAT'],
    [5, 8, 'Routing theo cấp tác vụ, quota user → Vertex AI (Private Google Access)'],
    [8, 5, 'Stream token về (p95 TTFT ≤ 3 s)', true],
    [5, 9, 'Cần chạy code: pod gVisor, không egress, chỉ mount workspace của user'],
    [5, 0, 'Hành động ghi ra ngoài (gửi email, tạo ticket) → người dùng xác nhận', true],
    [3, 0, 'Guardrail đầu ra → stream SSE về trình duyệt · ghi audit log + token log', true],
  ];
  steps.forEach(([a, b, text, back], k) => {
    const y = 196 + k * 50;
    const x1 = lx(a), x2 = lx(b), dir = x2 > x1 ? 1 : -1;
    s += line(`M${x1 + dir * 4},${y} L${x2 - dir * 6},${y}`, { dash: !!back, color: back ? C.muted : C.ink });
    const tw = text.length * 6.7 + 34;
    let tx = Math.min(x1, x2) + 10;
    if (tx + tw > W - 10) tx = W - 10 - tw;
    s += `<rect x="${tx - 4}" y="${y - 25}" width="${tw}" height="20" rx="4" fill="#FFFFFF"/>`;
    s += `<circle cx="${tx + 8}" cy="${y - 15}" r="9" fill="${back ? C.muted : C.gke[1]}"/>` +
      label(tx + 8, y - 11, String(k + 1), { size: 11, bold: true, color: '#fff', anchor: 'middle' });
    s += label(tx + 22, y - 10, text, { size: 13 });
  });

  s += `<rect x="24" y="818" width="1552" height="62" rx="10" fill="#F1F3F4"/>`;
  s += label(40, 844, 'H6: chat/email/tài liệu p95 TTFT ≤ 3 s giờ cao điểm · Tác vụ dài (cấp 4) đẩy vào Cloud Tasks, worker xử lý xong ≤ 10 phút và gửi thông báo', { size: 14 });
  s += label(40, 866, 'H3/H4: user A không đọc được workspace, vector hay token của user B · Mọi bước ghi audit log 12 tháng (monitoring) · Nét đứt = chiều trả về', { size: 14, color: C.muted });
  return svgWrap(s);
}

// ============================== SLIDE 11: CHI PHI ==============================
// Doc so truc tiep tu G03_baogia.xlsx de khop 100% voi dong TOTAL.
function costSlide() {
  const XLSX = require('xlsx');
  const rows = XLSX.utils.sheet_to_json(XLSX.readFile(path.join(__dirname, '..', 'G03_baogia.xlsx')).Sheets.BaoGia, { header: 1 }).slice(1);
  const total = rows.find(r => r[0] === 'TOTAL')[3];
  const by = {};
  rows.filter(r => r[0] !== 'TOTAL').forEach(r => { by[r[0]] = (by[r[0]] || 0) + Number(r[3]); });
  const sorted = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5), rest = sorted.slice(5).reduce((a, x) => a + x[1], 0);
  const bars = [...top, ['17 component còn lại', rest]];
  const usd = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Don gia e2-standard-4 Singapore (cung nguon voi baogia/build_baogia.js)
  const od = 4 * 0.02690931 + 16 * 0.00360594, cud = 4 * 0.016952865 + 16 * 0.002271742, spot = 4 * 0.01615 + 16 * 0.002164;
  const levers = [
    ['Autoscale theo giờ hành chính (4 node → 1 node ngoài giờ)', 3 * (730 - 220) * od, 'TV1'],
    ['Committed use 1 năm cho node nền 24/7 (−37%)', 730 * (od - cud), 'TV1'],
    ['Staging chạy Spot, chỉ giờ hành chính', 730 * od - 220 * spot, 'TV1'],
    ['Staging chung cluster với prod (không thêm phí GKE)', 73, 'TV1'],
    ['Vertex AI Context Caching (−75% token input lặp lại)', 350, 'TV2'],
    ['Routing 5 cấp: 85% tác vụ chạy Gemini Flash', 2800, 'TV2'],
  ];
  const levTotal = levers.reduce((a, l) => a + l[1], 0);

  let s = '';
  s += label(40, 62, `Chi phí hằng tháng: ${usd(total)} USD`, { size: 38, bold: true });
  s += label(40, 100, `${usd(total / 2000)} USD / DAU / tháng · 2.000 DAU · GCP asia-southeast1 · giá niêm yết, USD chưa VAT`, { size: 18, color: C.muted });

  // Bieu do cot ngang: 5 hang muc lon nhat
  s += label(40, 160, '5 hạng mục lớn nhất', { size: 20, bold: true });
  const max = bars[0][1], bx = 300, bw = 420;
  bars.forEach(([name, v], i) => {
    const y = 185 + i * 78, w = Math.max(4, v / max * bw), last = i === bars.length - 1;
    s += label(40, y + 30, name, { size: 17, bold: !last, color: last ? C.muted : C.ink });
    s += `<rect x="${bx}" y="${y + 8}" width="${w}" height="34" rx="6" fill="${last ? '#BDC1C6' : C.gke[1]}"/>`;
    s += label(bx + w + 12, y + 31, `${usd(v)}  ·  ${(v / total * 100).toFixed(1)}%`, { size: 16 });
  });

  // Bang don bay FinOps
  const tx = 900;
  s += `<rect x="${tx - 20}" y="130" width="700" height="${110 + levers.length * 62}" rx="14" fill="#F1F3F4"/>`;
  s += label(tx, 168, 'Đòn bẩy tiết kiệm (USD/tháng)', { size: 20, bold: true });
  levers.forEach(([t, v, who], i) => {
    const y = 215 + i * 62;
    s += label(tx, y, t, { size: 16 });
    s += label(tx, y + 22, who === 'TV1' ? 'Hạ tầng · có trong Terraform' : 'Model · số của TV2', { size: 13, color: C.muted });
    s += label(tx + 660, y + 8, '−' + usd(v), { size: 18, bold: true, anchor: 'end', color: '#188038' });
  });
  const ly = 215 + levers.length * 62;
  s += `<line x1="${tx}" y1="${ly - 28}" x2="${tx + 660}" y2="${ly - 28}" stroke="#BDC1C6"/>`;
  s += label(tx, ly, 'Tổng tiết kiệm so với cấu hình chạy 24/7, 1 model', { size: 16, bold: true });
  s += label(tx + 660, ly, '−' + usd(levTotal), { size: 20, bold: true, anchor: 'end', color: '#188038' });

  s += `<rect x="40" y="800" width="1520" height="64" rx="10" fill="#EAF2FE"/>`;
  s += label(60, 828, `Số tổng khớp dòng TOTAL trong G03_baogia.xlsx (validator: ĐẠT). Cố định: phí GKE, LB, Cloud Armor, 1 FTE vận hành.`, { size: 15 });
  s += label(60, 850, `Tăng theo lượng dùng: token LLM, egress, NAT. Chi tiết khi DAU gấp đôi ở Slide 12.`, { size: 15, color: C.muted });
  return svgWrap(s);
}

const outDir = __dirname;
const files = { 'slide02_kien_truc': architecture(), 'slide03_luong_request': flow(), 'slide11_chi_phi': costSlide() };
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
