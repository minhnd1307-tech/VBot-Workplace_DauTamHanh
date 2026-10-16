// Sinh file Gxx_baogia.xlsx (sheet BaoGia + BangChung) cho VBot Workplace tren GCP.
// - Dong cua TV1 (compute, load_balancer, network, cicd, ops_labor, licenses, contingency) da tinh xong.
// - Dong cua TV2/TV3/TV4 de san component + y nghia, cho chu so huu dien Ghi chu, Chi phi, Bang chung.
//   Co the dien thang trong Excel (cot D cua licenses/contingency/TOTAL la cong thuc, Excel tu tinh lai)
//   hoac dien vao mang TEAM_ROWS ben duoi roi chay lai: node build_baogia.js
// Don gia: Cloud Billing Catalog API (gia niem yet, USD) lay ngay 2026-10-16, region asia-southeast1.
const XLSX = require('xlsx');
const path = require('path');

const PRICE_DATE = '2026-10-16';
const HOURS_24x7 = 730;          // de bai: 24/7 = 730 gio/thang
const HOURS_OFFICE = 220;        // de bai: 22 ngay x 10 gio

// ---------- Don gia chinh thuc (SKU ID trong ngoac) ----------
const P = {
  gkeClusterHour: 0.10,                       // Regional Kubernetes Clusters (B561-BFBD-1264)
  e2CoreOnDemand: 0.02690931,                 // E2 Instance Core running in Singapore (7102-B9AA-2ACF)
  e2RamOnDemand: 0.00360594,                  // E2 Instance Ram running in Singapore (E277-7DC2-2C7D)
  e2CoreCud1y: 0.016952865,                   // Commitment v1: E2 Cpu in Singapore for 1 Year (AA47-6F66-D143)
  e2RamCud1y: 0.002271742,                    // Commitment v1: E2 Ram in Singapore for 1 Year (C0B6-DC5E-4BD8)
  e2CoreSpot: 0.01615,                        // Spot Preemptible E2 Instance Core Singapore (7217-D10E-E65B)
  e2RamSpot: 0.002164,                        // Spot Preemptible E2 Instance Ram Singapore (32B3-29BC-0D1E)
  pdStandardGbMonth: 0.044,                   // Storage PD Capacity in Singapore (0572-568A-4FC4)
  lbRuleMinHour: 0.025,                       // Cloud Load Balancer Forwarding Rule Minimum Global (DEE3-C42E-3E4D)
  lbDataGb: 0.009,                            // Global External ALB In/Out Data Processing Singapore (17FF-00DE-2217, A9BA-43D3-25AD)
  natVmHour: 0.0014,                          // Cloud Nat Gateway Uptime, moi VM (32E2-4EFC-EF9F)
  natIpHour: 0.005,                           // Cloud NAT IP Usage (8515-9425-D2CE)
  natDataGb: 0.045,                           // Cloud Nat Data Processing (015F-5732-FFF0)
  egressApacGb: 0.12,                         // Internet Data Transfer Out Singapore -> APAC, 0-1 TiB (400E-0B94-6FB4)
  interZoneGb: 0.01,                          // Inter Zone Data Transfer Out (DE9E-AFBC-A15A)
  armorPolicyMonth: 5,                        // Networking Cloud Armor Policy (4B13-E64F-4A2B)
  armorRuleMonth: 1,                          // Networking Cloud Armor Rule (A321-89BD-F5BC)
  armorPerMillionReq: 0.75,                   // Networking Cloud Armor Requests (1A87-DEB9-C4BE)
  buildMinute: 0.006,                         // Build time e2-standard-2 (A464-9020-6404)
  registryGbMonth: 0.10,                      // Artifact Registry Storage (8502-299A-ABAF)
  supportPct: 0.03, supportMin: 29,           // Google Cloud Standard Support: max(29 USD, 3% chi phi cloud)
  sreFteMonth: 3500,                          // 1 FTE SRE/MLOps (gia dinh cua nhom)
};
const e2s4 = (core, ram) => 4 * core + 16 * ram;   // e2-standard-4 = 4 vCPU + 16 GiB
P.e2s4OnDemand = e2s4(P.e2CoreOnDemand, P.e2RamOnDemand);
P.e2s4Cud1y = e2s4(P.e2CoreCud1y, P.e2RamCud1y);
P.e2s4Spot = e2s4(P.e2CoreSpot, P.e2RamSpot);

// ---------- Gia dinh sizing (TV1; cap nhat khi TV2 chot bang sizing) ----------
const S = {
  appBaseNodes: 3,          // 1 node/zone x 3 AZ, chay 24/7
  appBurstNodes: 3,         // them 1 node/zone trong gio hanh chinh (peak 6 node)
  stagingNodes: 1,          // 1 node Spot, chi gio hanh chinh
  sandboxNodesForNat: 3,    // sandbox pool cua TV4 (1 node/zone) cung duoc gan NAT
  diskGb: 50,
  lbInGb: 70,               // 1,1 trieu request/thang x 20 KB + upload file ~44 GB
  lbOutGb: 200,             // response 55 GB + static asset 88 GB + tai file sinh ra 44 GB, lam tron
  natGb: 300,               // goi API SaaS connectors + dong bo index (vao + ra)
  egressGb: 220,            // 200 GB qua LB + 20 GB request ra SaaS qua NAT
  interZoneGb: 200,         // traffic noi bo giua 3 zone (pod <-> pod, pod <-> SQL/Redis)
  armorRules: 4,            // SQLi, XSS, rate limit, default
  armorMillionReq: 15,      // ~15 trieu HTTP request/thang (1,1 trieu chat x ~10 HTTP call + asset)
  services: 10, buildsPerServicePerDay: 2, buildMinutes: 6, workDays: 22,
  registryGb: 30,           // 10 service x ~300 MB x giu 10 ban
};

const r2 = x => Math.round(x * 100) / 100;
const f = (x, d = 2) => Number(x.toFixed(d)).toString();

// ---------- Dong cua TV1 ----------
const nodeHoursNat = S.appBaseNodes * HOURS_24x7 + S.appBurstNodes * HOURS_OFFICE
  + S.stagingNodes * HOURS_OFFICE + S.sandboxNodesForNat * HOURS_24x7;
const diskGbMonth = S.diskGb * (S.appBaseNodes + (S.appBurstNodes + S.stagingNodes) * HOURS_OFFICE / HOURS_24x7);
const buildMin = S.services * S.buildsPerServicePerDay * S.workDays * S.buildMinutes;

const TV1_CLOUD = [
  ['compute', 'Phí quản lý GKE regional cluster (control plane 3 AZ, prod + staging dùng chung 1 cluster)',
    `GKE Regional Kubernetes Clusters, SKU B561-BFBD-1264: 1 cluster × ${HOURS_24x7} giờ × ${P.gkeClusterHour} USD/giờ. Staging chạy trong cùng cluster (namespace + node pool riêng) nên không thêm phí cluster`,
    1 * HOURS_24x7 * P.gkeClusterHour, 'E01; https://cloud.google.com/kubernetes-engine/pricing'],
  ['compute', 'Node pool app production, phần nền 24/7: web/API, LLM gateway, orchestrator, connector & agent workers',
    `e2-standard-4 (4 vCPU, 16 GB), asia-southeast1, ${S.appBaseNodes} node (1 node/zone × 3 zone, multi-AZ) × ${HOURS_24x7} giờ × ${f(P.e2s4Cud1y, 6)} USD/giờ. Committed use 1 năm cho 12 vCPU + 48 GB: 4 × ${P.e2CoreCud1y} + 16 × ${P.e2RamCud1y} (SKU AA47-6F66-D143, C0B6-DC5E-4BD8)`,
    S.appBaseNodes * HOURS_24x7 * P.e2s4Cud1y, 'E02; https://cloud.google.com/compute/vm-instance-pricing'],
  ['compute', 'Node pool app production, scale-out giờ cao điểm (autoscaler 1 → 2 node/zone)',
    `e2-standard-4 on-demand, asia-southeast1, +${S.appBurstNodes} node (1 node/zone) × ${HOURS_OFFICE} giờ hành chính × ${f(P.e2s4OnDemand, 6)} USD/giờ = 4 × ${P.e2CoreOnDemand} + 16 × ${P.e2RamOnDemand} (SKU 7102-B9AA-2ACF, E277-7DC2-2C7D). Ngoài giờ scale về 3 node`,
    S.appBurstNodes * HOURS_OFFICE * P.e2s4OnDemand, 'E03; https://cloud.google.com/compute/vm-instance-pricing'],
  ['compute', 'Node pool staging (môi trường staging): 1 node Spot, chạy giờ hành chính, ngoài giờ scale về 0',
    `e2-standard-4 Spot, asia-southeast1-a, ${S.stagingNodes} node × ${HOURS_OFFICE} giờ × ${f(P.e2s4Spot, 6)} USD/giờ = 4 × ${P.e2CoreSpot} + 16 × ${P.e2RamSpot} (SKU 7217-D10E-E65B, 32B3-29BC-0D1E, giá Spot ngày ${PRICE_DATE})`,
    S.stagingNodes * HOURS_OFFICE * P.e2s4Spot, 'E04; https://cloud.google.com/compute/vm-instance-pricing'],
  ['compute', 'Boot disk cho node app và staging',
    `PD Standard, asia-southeast1, SKU 0572-568A-4FC4: ${S.diskGb} GB × (${S.appBaseNodes} node 24/7 + ${S.appBurstNodes + S.stagingNodes} node × ${HOURS_OFFICE}/${HOURS_24x7}) = ${f(diskGbMonth, 1)} GB-tháng × ${P.pdStandardGbMonth} USD`,
    diskGbMonth * P.pdStandardGbMonth, 'E05; https://cloud.google.com/compute/disks-image-pricing'],

  ['load_balancer', 'Global External Application Load Balancer (anycast, đa zone, TLS 1.2+, chứng chỉ Google-managed) trước GKE Gateway',
    `Forwarding rule global, SKU DEE3-C42E-3E4D: mức tối thiểu cho tới 5 rule (HTTPS + redirect HTTP) × ${HOURS_24x7} giờ × ${P.lbRuleMinHour} USD/giờ. LB là dịch vụ managed, không có SPOF (HA)`,
    HOURS_24x7 * P.lbRuleMinHour, 'E06; https://cloud.google.com/vpc/network-pricing'],
  ['load_balancer', 'Data processing của Load Balancer tại Singapore (vào + ra)',
    `SKU 17FF-00DE-2217 / A9BA-43D3-25AD: (${S.lbInGb} GB vào + ${S.lbOutGb} GB ra) × ${P.lbDataGb} USD/GB. Vào: 1,1 triệu request/tháng × 20 KB + upload file; ra: response stream + asset + file DOCX/XLSX/PPTX`,
    (S.lbInGb + S.lbOutGb) * P.lbDataGb, 'E06; https://cloud.google.com/vpc/network-pricing'],

  ['network', 'Cloud NAT gateway cho node private gọi API SaaS connectors (kiểm soát egress)',
    `SKU 32E2-4EFC-EF9F: ${P.natVmHour} USD/VM-giờ × ${nodeHoursNat} VM-giờ (app ${S.appBaseNodes}×${HOURS_24x7} + ${S.appBurstNodes}×${HOURS_OFFICE}, staging ${S.stagingNodes}×${HOURS_OFFICE}, sandbox ${S.sandboxNodesForNat}×${HOURS_24x7}). Vertex AI đi qua Private Google Access, không qua NAT`,
    nodeHoursNat * P.natVmHour, 'E07; https://cloud.google.com/nat/pricing'],
  ['network', 'IP public của Cloud NAT (IP cố định để SaaS whitelist)',
    `SKU 8515-9425-D2CE: 1 IP × ${HOURS_24x7} giờ × ${P.natIpHour} USD/giờ`,
    1 * HOURS_24x7 * P.natIpHour, 'E07; https://cloud.google.com/nat/pricing'],
  ['network', 'Dữ liệu qua Cloud NAT: gọi API Google Workspace, M365, Notion, Jira, Confluence và đồng bộ index',
    `SKU 015F-5732-FFF0: ${S.natGb} GB/tháng (vào + ra) × ${P.natDataGb} USD/GB`,
    S.natGb * P.natDataGb, 'E07; https://cloud.google.com/nat/pricing'],
  ['network', 'Internet egress Premium Tier từ Singapore tới người dùng tại Việt Nam (APAC)',
    `SKU 400E-0B94-6FB4 (Singapore → APAC, bậc 0-1 TiB): ${S.egressGb} GB × ${P.egressApacGb} USD/GB (${S.lbOutGb} GB response qua LB + 20 GB request ra SaaS)`,
    S.egressGb * P.egressApacGb, 'E08; https://cloud.google.com/vpc/network-pricing'],
  ['network', 'Lưu lượng giữa các zone (multi-AZ): pod ↔ pod, pod ↔ Cloud SQL/Redis',
    `Inter-zone data transfer cùng region, SKU DE9E-AFBC-A15A: ${S.interZoneGb} GB × ${P.interZoneGb} USD/GB`,
    S.interZoneGb * P.interZoneGb, 'E09; https://cloud.google.com/vpc/network-pricing'],
  ['network', 'Cloud Armor Standard WAF: chặn SQLi/XSS (OWASP CRS), rate limit theo IP',
    `1 policy × ${P.armorPolicyMonth} USD + ${S.armorRules} rule × ${P.armorRuleMonth} USD + ${S.armorMillionReq} triệu request × ${P.armorPerMillionReq} USD/triệu (SKU 4B13-E64F-4A2B, A321-89BD-F5BC, 1A87-DEB9-C4BE)`,
    P.armorPolicyMonth + S.armorRules * P.armorRuleMonth + S.armorMillionReq * P.armorPerMillionReq, 'E10; https://cloud.google.com/armor/pricing'],

  ['cicd', 'Cloud Build: pipeline build/test/deploy lên staging rồi production (IaC Terraform)',
    `Build time e2-standard-2, SKU A464-9020-6404: ${S.services} service × ${S.buildsPerServicePerDay} build/ngày × ${S.workDays} ngày × ${S.buildMinutes} phút = ${buildMin} phút × ${P.buildMinute} USD/phút (tính toàn bộ số phút theo đơn giá niêm yết)`,
    buildMin * P.buildMinute, 'E11; https://cloud.google.com/build/pricing'],
  ['cicd', 'Artifact Registry: lưu container image cho staging và production',
    `SKU 8502-299A-ABAF: ${S.registryGb} GB (10 service × ~300 MB × giữ 10 phiên bản, cleanup policy) × ${P.registryGbMonth} USD/GB-tháng`,
    S.registryGb * P.registryGbMonth, 'E12; https://cloud.google.com/artifact-registry/pricing'],
].map(r => [r[0], r[1], r[2], r2(r[3]), r[4]]);

// ---------- Dong cua TV2/TV3/TV4: chu so huu dien Ghi chu, Chi phi, Bang chung ----------
// Dien [component, y_nghia, ghi_chu, chi_phi (so), bang_chung]; de chi_phi = null neu chua co.
const TODO = who => `CHỜ ${who} điền: dịch vụ/SKU, region, đơn giá × số lượng`;
const TEAM_ROWS = [
  ['llm', 'Gemini Flash cho tác vụ cấp 1–3 (chat, email, tài liệu)', TODO('TV2'), null, ''],
  ['llm', 'Gemini Pro cho tác vụ cấp 4 (agent dự án, reasoning)', TODO('TV2'), null, ''],
  ['llm', 'Imagen cho tác vụ cấp 5 (mockup, sơ đồ, ảnh minh họa)', TODO('TV2'), null, ''],
  ['embedding', 'Embedding tài liệu cho RAG (index lần đầu + hằng ngày)', TODO('TV2'), null, ''],
  ['gateway', 'LLM gateway: routing 5 cấp, quota theo user/đơn vị, fallback, log token', TODO('TV2'), null, ''],
  ['connectors', 'Connectors Google Workspace, M365, Notion, Jira, Confluence', TODO('TV3'), null, ''],
  ['database', 'Cloud SQL PostgreSQL HA (regional) cho metadata, lịch sử chat', TODO('TV3'), null, ''],
  ['vector_db', 'pgvector trên Cloud SQL, lọc kết quả theo ACL gốc', TODO('TV3'), null, ''],
  ['object_storage', 'GCS workspace riêng từng user (prefix + CMEK, lifecycle)', TODO('TV3'), null, ''],
  ['cache_queue', 'Memorystore Redis HA + Cloud Tasks cho agent chạy nền', TODO('TV3'), null, ''],
  ['sandbox', 'GKE Sandbox node pool (gVisor) chạy code của agent', TODO('TV4'), null, ''],
  ['authn', 'SSO tập đoàn (OIDC/SAML) + MFA', TODO('TV4'), null, ''],
  ['authz', 'RBAC/ABAC, ACL tài liệu, scope OAuth tối thiểu', TODO('TV4'), null, ''],
  ['secrets_kms', 'Cloud KMS + Secret Manager (token vault OAuth)', TODO('TV4'), null, ''],
  ['governance', 'Cloud DLP che PII, guardrail, eval gate', TODO('TV4'), null, ''],
  ['backup_dr', 'Backup Cloud SQL/GCS, cross-region, RTO 4h / RPO 1h', TODO('TV4'), null, ''],
  ['monitoring', 'Cloud Logging/Monitoring, audit log 12 tháng, LLM observability', TODO('TV4'), null, ''],
];

// ---------- Ghep sheet BaoGia ----------
const HEADER = ['Component', 'Ý nghĩa', 'Ghi chú', 'Chi phí/tháng (USD)', 'Bằng chứng'];
const body = [...TEAM_ROWS, ...TV1_CLOUD];
const firstRow = 2, lastCloudRow = firstRow + body.length - 1;   // so dong Excel (1-based)
const opsRow = lastCloudRow + 1, licRow = opsRow + 1, contRow = licRow + 1, totalRow = contRow + 1;
const cloudSum = body.reduce((a, r) => a + (r[3] || 0), 0);
const sumComp = c => body.filter(r => r[0] === c).reduce((a, r) => a + (r[3] || 0), 0);
const licVal = r2(Math.max(P.supportMin, P.supportPct * cloudSum));
const contVal = r2(0.10 * (sumComp('llm') + sumComp('embedding')));
const totalVal = r2(cloudSum + P.sreFteMonth + licVal + contVal);
const rng = `D${firstRow}:D${lastCloudRow}`, arng = `A${firstRow}:A${lastCloudRow}`;

const aoa = [HEADER, ...body.map(r => [r[0], r[1], r[2], r[3] === null ? '' : r[3], r[4]])];
aoa.push(['ops_labor', 'Nhân sự vận hành: 1 FTE SRE/MLOps (trực giờ hành chính, on-call sự cố)',
  `1 FTE × ${P.sreFteMonth} USD/tháng (lương + bảo hiểm + phụ cấp on-call); phụ trách GKE, CI/CD, Terraform, backup, cảnh báo`, P.sreFteMonth, 'NA']);
aoa.push(['licenses', 'Gói Google Cloud Customer Care - Standard Support (hỗ trợ kỹ thuật 24/7 cho production)',
  `max(${P.supportMin} USD; ${P.supportPct * 100}% × tổng chi phí cloud các dòng ${firstRow}-${lastCloudRow}), công thức tự cập nhật khi nhóm điền đủ`, licVal,
  'E13; https://cloud.google.com/support']);
aoa.push(['contingency', 'Dự phòng cho phần biến động theo lượng dùng (token LLM, embedding)',
  '10% × (tổng dòng llm + embedding): token/user là ước lượng nên dễ lệch nhất; công thức tự cập nhật', contVal, 'NA']);
aoa.push(['TOTAL', '', '', totalVal, '']);

const ws = XLSX.utils.aoa_to_sheet(aoa);
ws[`D${licRow}`] = { t: 'n', v: licVal, f: `MAX(${P.supportMin},${P.supportPct}*(SUM(${rng})))` };
ws[`D${contRow}`] = { t: 'n', v: contVal, f: `0.1*(SUMIF(${arng},"llm",${rng})+SUMIF(${arng},"embedding",${rng}))` };
ws[`D${totalRow}`] = { t: 'n', v: totalVal, f: `SUM(D${firstRow}:D${contRow})` };
ws['!cols'] = [{ wch: 15 }, { wch: 55 }, { wch: 95 }, { wch: 20 }, { wch: 55 }];
ws['!autofilter'] = { ref: `A1:E${totalRow}` };

// ---------- Sheet BangChung ----------
const EV = [
  ['E01', 'GKE pricing: cluster management fee 0.10 USD/giờ cho regional cluster (SKU B561-BFBD-1264)', 'https://cloud.google.com/kubernetes-engine/pricing'],
  ['E02', 'Compute Engine committed use 1 năm, E2 Cpu 0.016952865 USD/giờ, E2 Ram 0.002271742 USD/GB-giờ, Singapore (SKU AA47-6F66-D143, C0B6-DC5E-4BD8)', 'https://cloud.google.com/compute/vm-instance-pricing'],
  ['E03', 'Compute Engine on-demand, E2 Instance Core 0.02690931 USD/giờ, Ram 0.00360594 USD/GB-giờ, Singapore (SKU 7102-B9AA-2ACF, E277-7DC2-2C7D)', 'https://cloud.google.com/compute/vm-instance-pricing'],
  ['E04', 'Compute Engine Spot, E2 Core 0.01615 USD/giờ, Ram 0.002164 USD/GB-giờ, Singapore (SKU 7217-D10E-E65B, 32B3-29BC-0D1E)', 'https://cloud.google.com/spot-vms/pricing'],
  ['E05', 'Persistent Disk Standard 0.044 USD/GB-tháng, Singapore (SKU 0572-568A-4FC4)', 'https://cloud.google.com/compute/disks-image-pricing'],
  ['E06', 'Load Balancing: forwarding rule global 0.025 USD/giờ (5 rule đầu); data processing ALB Singapore 0.009 USD/GB (SKU DEE3-C42E-3E4D, 17FF-00DE-2217, A9BA-43D3-25AD)', 'https://cloud.google.com/vpc/network-pricing'],
  ['E07', 'Cloud NAT: 0.0014 USD/VM-giờ, 0.045 USD/GB xử lý, 0.005 USD/giờ mỗi IP (SKU 32E2-4EFC-EF9F, 015F-5732-FFF0, 8515-9425-D2CE)', 'https://cloud.google.com/nat/pricing'],
  ['E08', 'Internet data transfer out Premium Tier, Singapore → APAC 0.12 USD/GB bậc 0-1 TiB (SKU 400E-0B94-6FB4)', 'https://cloud.google.com/vpc/network-pricing'],
  ['E09', 'Data transfer giữa các zone trong cùng region 0.01 USD/GB (SKU DE9E-AFBC-A15A)', 'https://cloud.google.com/vpc/network-pricing'],
  ['E10', 'Cloud Armor Standard: 5 USD/policy-tháng, 1 USD/rule-tháng, 0.75 USD/triệu request (SKU 4B13-E64F-4A2B, A321-89BD-F5BC, 1A87-DEB9-C4BE)', 'https://cloud.google.com/armor/pricing'],
  ['E11', 'Cloud Build: build time e2-standard-2 0.006 USD/phút (SKU A464-9020-6404)', 'https://cloud.google.com/build/pricing'],
  ['E12', 'Artifact Registry storage 0.10 USD/GB-tháng (SKU 8502-299A-ABAF)', 'https://cloud.google.com/artifact-registry/pricing'],
  ['E13', 'Google Cloud Customer Care Standard Support: max(29 USD; 3% chi phí cloud hằng tháng)', 'https://cloud.google.com/support'],
];
const wsEv = XLSX.utils.aoa_to_sheet([['evidence_id', 'Mô tả', 'Link', 'Ngày chụp', 'Ảnh chụp màn hình (dán vào ô cùng dòng)'],
  ...EV.map(e => [...e, PRICE_DATE, ''])]);
wsEv['!cols'] = [{ wch: 12 }, { wch: 110 }, { wch: 55 }, { wch: 12 }, { wch: 45 }];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'BaoGia');
XLSX.utils.book_append_sheet(wb, wsEv, 'BangChung');
const out = path.join(__dirname, process.argv[2] || 'Gxx_baogia.xlsx');
XLSX.writeFile(wb, out);

const tv1 = TV1_CLOUD.reduce((a, r) => a + r[3], 0) + P.sreFteMonth + licVal;
const byComp = {};
TV1_CLOUD.forEach(r => { byComp[r[0]] = r2((byComp[r[0]] || 0) + r[3]); });
console.log('Da ghi ' + out);
console.log('TV1 theo component:', byComp, '| ops_labor', P.sreFteMonth, '| licenses', licVal);
console.log('TV1 cloud:', r2(TV1_CLOUD.reduce((a, r) => a + r[3], 0)), '| TV1 tong (gom labor + support):', r2(tv1), '| TOTAL hien tai:', totalVal);
