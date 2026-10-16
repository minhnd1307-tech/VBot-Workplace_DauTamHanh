// Sinh file nop G03_baogia.xlsx (sheet BaoGia + BangChung) cho VBot Workplace tren GCP.
// - Dong cua TV2/TV3/TV4: lay nguyen van tu team_rows.json (trich tu G03_baogia.xlsx cua TV2).
// - Dong cua TV1 (compute, load_balancer, network, cicd, ops_labor, licenses, contingency, TOTAL):
//   tinh lai o day theo bang sizing chinh thuc cua TV2 (TV2_SIZING_VA_MODEL_ARCHITECTURE.md).
// Don gia: Cloud Billing Catalog API (gia niem yet, USD) lay ngay 2026-10-16, region asia-southeast1.
// Dung: node build_baogia.js   -> ghi ../G03_baogia.xlsx, roi: node check_baogia.js ../G03_baogia.xlsx
const XLSX = require('xlsx');
const path = require('path');
const team = require('./team_rows.json');

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

// ---------- Sizing: lay tu bang ban giao cua TV2 (muc 1.4 va bang ban giao) ----------
const S = {
  appBaseNodes: 1,          // TV2: "dem xuong 1 node" -> 1 node chay 24/7 (committed use 1 nam)
  appOfficeNodes: 3,        // TV2: peak 3,5 RPS -> 4 node; them 1 node/zone trong gio hanh chinh
  stagingNodes: 1,          // 1 node Spot, chi gio hanh chinh
  sandboxNodeHours: 5 * HOURS_OFFICE, // TV4 (G03): 2 node x 2 AZ + 1 node staging, 220 gio -> cung gan NAT
  diskGb: 50,
  lbGb: 1500,               // TV2: bang thong In/Out ~1.500 GB/thang
  egressGb: 500,            // TV2: egress ~500 GB/thang
  natGb: 300,               // goi API SaaS connectors + dong bo index (vao + ra)
  interZoneGb: 200,         // traffic noi bo giua 3 zone (pod <-> pod, pod <-> SQL/Redis)
  armorRules: 4,            // SQLi, XSS, rate limit, default
  armorMillionReq: 15,      // ~15 trieu HTTP request/thang (1,1 trieu chat x ~10 HTTP call + asset)
  services: 10, buildsPerServicePerDay: 2, buildMinutes: 6, workDays: 22,
  registryGb: 30,           // 10 service x ~300 MB x giu 10 ban
};

const r2 = x => Math.round(x * 100) / 100;
const f = (x, d = 2) => Number(x.toFixed(d)).toString();

// ---------- Bang chung cua TV1 (danh so tiep sau E15 cua nhom) ----------
const EV_TV1 = {
  gke: ['E16', 'GKE pricing: cluster management fee 0.10 USD/giờ cho regional cluster (SKU B561-BFBD-1264)', 'https://cloud.google.com/kubernetes-engine/pricing'],
  cud: ['E17', 'Compute Engine committed use 1 năm, E2 Cpu 0.016952865 USD/giờ, E2 Ram 0.002271742 USD/GB-giờ, Singapore (SKU AA47-6F66-D143, C0B6-DC5E-4BD8)', 'https://cloud.google.com/compute/vm-instance-pricing'],
  od: ['E18', 'Compute Engine on-demand, E2 Instance Core 0.02690931 USD/giờ, Ram 0.00360594 USD/GB-giờ, Singapore (SKU 7102-B9AA-2ACF, E277-7DC2-2C7D)', 'https://cloud.google.com/compute/vm-instance-pricing'],
  spot: ['E19', 'Compute Engine Spot, E2 Core 0.01615 USD/giờ, Ram 0.002164 USD/GB-giờ, Singapore (SKU 7217-D10E-E65B, 32B3-29BC-0D1E)', 'https://cloud.google.com/spot-vms/pricing'],
  pd: ['E20', 'Persistent Disk Standard 0.044 USD/GB-tháng, Singapore (SKU 0572-568A-4FC4)', 'https://cloud.google.com/compute/disks-image-pricing'],
  lb: ['E21', 'Load Balancing: forwarding rule global 0.025 USD/giờ (5 rule đầu); data processing ALB Singapore 0.009 USD/GB (SKU DEE3-C42E-3E4D, 17FF-00DE-2217, A9BA-43D3-25AD)', 'https://cloud.google.com/vpc/network-pricing'],
  nat: ['E22', 'Cloud NAT: 0.0014 USD/VM-giờ, 0.045 USD/GB xử lý, 0.005 USD/giờ mỗi IP (SKU 32E2-4EFC-EF9F, 015F-5732-FFF0, 8515-9425-D2CE)', 'https://cloud.google.com/nat/pricing'],
  egress: ['E23', 'Internet data transfer out Premium Tier, Singapore → APAC 0.12 USD/GB bậc 0-1 TiB (SKU 400E-0B94-6FB4)', 'https://cloud.google.com/vpc/network-pricing'],
  iz: ['E24', 'Data transfer giữa các zone trong cùng region 0.01 USD/GB (SKU DE9E-AFBC-A15A)', 'https://cloud.google.com/vpc/network-pricing'],
  armor: ['E25', 'Cloud Armor Standard: 5 USD/policy-tháng, 1 USD/rule-tháng, 0.75 USD/triệu request (SKU 4B13-E64F-4A2B, A321-89BD-F5BC, 1A87-DEB9-C4BE)', 'https://cloud.google.com/armor/pricing'],
  build: ['E26', 'Cloud Build: build time e2-standard-2 0.006 USD/phút (SKU A464-9020-6404)', 'https://cloud.google.com/build/pricing'],
  ar: ['E27', 'Artifact Registry storage 0.10 USD/GB-tháng (SKU 8502-299A-ABAF)', 'https://cloud.google.com/artifact-registry/pricing'],
  support: ['E28', 'Google Cloud Customer Care Standard Support: max(29 USD; 3% chi phí cloud hằng tháng)', 'https://cloud.google.com/support'],
};
const ev = k => `${EV_TV1[k][0]}; ${EV_TV1[k][2]}`;

// ---------- Dong cua TV1 ----------
const appNodeHours = S.appBaseNodes * HOURS_24x7 + S.appOfficeNodes * HOURS_OFFICE;
const nodeHoursNat = appNodeHours + S.stagingNodes * HOURS_OFFICE + S.sandboxNodeHours;
const diskGbMonth = S.diskGb * (S.appBaseNodes + (S.appOfficeNodes + S.stagingNodes) * HOURS_OFFICE / HOURS_24x7);
const buildMin = S.services * S.buildsPerServicePerDay * S.workDays * S.buildMinutes;

const TV1_CLOUD = [
  ['compute', 'Phí quản lý GKE regional cluster (control plane 3 AZ, prod + staging dùng chung 1 cluster)',
    `GKE Regional Kubernetes Clusters, SKU B561-BFBD-1264: 1 cluster × ${HOURS_24x7} giờ × ${P.gkeClusterHour} USD/giờ. Staging chạy trong cùng cluster (namespace + node pool riêng) nên không thêm phí cluster`,
    1 * HOURS_24x7 * P.gkeClusterHour, ev('gke')],
  ['compute', 'Node pool app production, node nền 24/7 (ngoài giờ hành chính chỉ giữ 1 node)',
    `e2-standard-4 (4 vCPU, 16 GB), asia-southeast1-a, ${S.appBaseNodes} node × ${HOURS_24x7} giờ × ${f(P.e2s4Cud1y, 6)} USD/giờ. Committed use 1 năm cho 4 vCPU + 16 GB: 4 × ${P.e2CoreCud1y} + 16 × ${P.e2RamCud1y} (SKU AA47-6F66-D143, C0B6-DC5E-4BD8)`,
    S.appBaseNodes * HOURS_24x7 * P.e2s4Cud1y, ev('cud')],
  ['compute', 'Node pool app production giờ hành chính: thêm 1 node mỗi zone, tổng 4 node trải 3 AZ (sizing TV2: peak 3,5 RPS)',
    `e2-standard-4 on-demand, asia-southeast1-a/b/c, ${S.appOfficeNodes} node × ${HOURS_OFFICE} giờ × ${f(P.e2s4OnDemand, 6)} USD/giờ = 4 × ${P.e2CoreOnDemand} + 16 × ${P.e2RamOnDemand} (SKU 7102-B9AA-2ACF, E277-7DC2-2C7D). Multi-AZ: mỗi zone ≥ 1 node trong giờ SLA 99,5%`,
    S.appOfficeNodes * HOURS_OFFICE * P.e2s4OnDemand, ev('od')],
  ['compute', 'Node pool staging (môi trường staging): 1 node Spot, chạy giờ hành chính, ngoài giờ scale về 0',
    `e2-standard-4 Spot, asia-southeast1-a, ${S.stagingNodes} node × ${HOURS_OFFICE} giờ × ${f(P.e2s4Spot, 6)} USD/giờ = 4 × ${P.e2CoreSpot} + 16 × ${P.e2RamSpot} (SKU 7217-D10E-E65B, 32B3-29BC-0D1E, giá Spot ngày ${PRICE_DATE})`,
    S.stagingNodes * HOURS_OFFICE * P.e2s4Spot, ev('spot')],
  ['compute', 'Boot disk cho node app và staging',
    `PD Standard, asia-southeast1, SKU 0572-568A-4FC4: ${S.diskGb} GB × (${S.appBaseNodes} node 24/7 + ${S.appOfficeNodes + S.stagingNodes} node × ${HOURS_OFFICE}/${HOURS_24x7}) = ${f(diskGbMonth, 1)} GB-tháng × ${P.pdStandardGbMonth} USD`,
    diskGbMonth * P.pdStandardGbMonth, ev('pd')],

  ['load_balancer', 'Global External Application Load Balancer (anycast, đa zone, TLS 1.2+, chứng chỉ Google-managed) trước GKE Gateway',
    `Forwarding rule global, SKU DEE3-C42E-3E4D: mức tối thiểu cho tới 5 rule (HTTPS + redirect HTTP) × ${HOURS_24x7} giờ × ${P.lbRuleMinHour} USD/giờ. LB là dịch vụ managed, không có SPOF (HA)`,
    HOURS_24x7 * P.lbRuleMinHour, ev('lb')],
  ['load_balancer', 'Data processing của Load Balancer tại Singapore (vào + ra)',
    `SKU 17FF-00DE-2217 / A9BA-43D3-25AD: ${S.lbGb} GB vào + ra/tháng (sizing TV2) × ${P.lbDataGb} USD/GB`,
    S.lbGb * P.lbDataGb, ev('lb')],

  ['network', 'Cloud NAT gateway (1 gateway regional, managed, tự HA qua 3 zone) cho node private gọi API SaaS',
    `SKU 32E2-4EFC-EF9F: ${P.natVmHour} USD/VM-giờ × ${nodeHoursNat} VM-giờ (app ${S.appBaseNodes}×${HOURS_24x7} + ${S.appOfficeNodes}×${HOURS_OFFICE}, staging ${S.stagingNodes}×${HOURS_OFFICE}, sandbox ${S.sandboxNodeHours}). Vertex AI đi qua Private Google Access, không qua NAT`,
    nodeHoursNat * P.natVmHour, ev('nat')],
  ['network', 'IP public của Cloud NAT (IP cố định để SaaS whitelist)',
    `SKU 8515-9425-D2CE: 1 IP × ${HOURS_24x7} giờ × ${P.natIpHour} USD/giờ`,
    1 * HOURS_24x7 * P.natIpHour, ev('nat')],
  ['network', 'Dữ liệu qua Cloud NAT: gọi API Google Workspace, M365, Notion, Jira, Confluence và đồng bộ index',
    `SKU 015F-5732-FFF0: ${S.natGb} GB/tháng (vào + ra) × ${P.natDataGb} USD/GB`,
    S.natGb * P.natDataGb, ev('nat')],
  ['network', 'Internet egress Premium Tier từ Singapore tới người dùng tại Việt Nam (APAC)',
    `SKU 400E-0B94-6FB4 (Singapore → APAC, bậc 0-1 TiB): ${S.egressGb} GB/tháng (sizing TV2) × ${P.egressApacGb} USD/GB`,
    S.egressGb * P.egressApacGb, ev('egress')],
  ['network', 'Lưu lượng giữa các zone (multi-AZ): pod ↔ pod, pod ↔ Cloud SQL/Redis',
    `Inter-zone data transfer cùng region, SKU DE9E-AFBC-A15A: ${S.interZoneGb} GB × ${P.interZoneGb} USD/GB`,
    S.interZoneGb * P.interZoneGb, ev('iz')],
  ['network', 'Cloud Armor Standard WAF: chặn SQLi/XSS (OWASP CRS), rate limit theo IP',
    `1 policy × ${P.armorPolicyMonth} USD + ${S.armorRules} rule × ${P.armorRuleMonth} USD + ${S.armorMillionReq} triệu request × ${P.armorPerMillionReq} USD/triệu (SKU 4B13-E64F-4A2B, A321-89BD-F5BC, 1A87-DEB9-C4BE)`,
    P.armorPolicyMonth + S.armorRules * P.armorRuleMonth + S.armorMillionReq * P.armorPerMillionReq, ev('armor')],

  ['cicd', 'Cloud Build: pipeline build/test/deploy lên staging rồi production (IaC Terraform)',
    `Build time e2-standard-2, SKU A464-9020-6404: ${S.services} service × ${S.buildsPerServicePerDay} build/ngày × ${S.workDays} ngày × ${S.buildMinutes} phút = ${buildMin} phút × ${P.buildMinute} USD/phút (tính toàn bộ số phút theo đơn giá niêm yết)`,
    buildMin * P.buildMinute, ev('build')],
  ['cicd', 'Artifact Registry: lưu container image cho staging và production',
    `SKU 8502-299A-ABAF: ${S.registryGb} GB (10 service × ~300 MB × giữ 10 phiên bản, cleanup policy) × ${P.registryGbMonth} USD/GB-tháng`,
    S.registryGb * P.registryGbMonth, ev('ar')],
].map(r => [r[0], r[1], r[2], r2(r[3]), r[4]]);

// ---------- Ghep sheet BaoGia ----------
const HEADER = ['Component', 'Ý nghĩa', 'Ghi chú', 'Chi phí/tháng (USD)', 'Bằng chứng'];
const TEAM_ROWS = team.rows.map(r => [r.component, r.y_nghia, r.ghi_chu, r.chi_phi, r.bang_chung]);
const body = [...TEAM_ROWS, ...TV1_CLOUD];
const firstRow = 2, lastCloudRow = firstRow + body.length - 1;   // so dong Excel (1-based)
const opsRow = lastCloudRow + 1, licRow = opsRow + 1, contRow = licRow + 1, totalRow = contRow + 1;
const cloudSum = body.reduce((a, r) => a + (r[3] || 0), 0);
const sumComp = c => body.filter(r => r[0] === c).reduce((a, r) => a + (r[3] || 0), 0);
const licVal = r2(Math.max(P.supportMin, P.supportPct * cloudSum));
const contVal = r2(0.10 * (sumComp('llm') + sumComp('embedding')));
const totalVal = r2(cloudSum + P.sreFteMonth + licVal + contVal);
const rng = `D${firstRow}:D${lastCloudRow}`, arng = `A${firstRow}:A${lastCloudRow}`;

const aoa = [HEADER, ...body];
aoa.push(['ops_labor', 'Nhân sự vận hành: 1 FTE SRE/MLOps (trực giờ hành chính, on-call sự cố)',
  `1 FTE × ${P.sreFteMonth} USD/tháng (lương + bảo hiểm + phụ cấp on-call); phụ trách GKE, CI/CD, Terraform, backup, cảnh báo`, P.sreFteMonth, 'NA']);
aoa.push(['licenses', 'Gói Google Cloud Customer Care - Standard Support (hỗ trợ kỹ thuật cho production)',
  `max(${P.supportMin} USD; ${P.supportPct * 100}% × ${f(cloudSum)} USD chi phí cloud các dòng ${firstRow}-${lastCloudRow}) = ${f(licVal)}, công thức tự cập nhật`, licVal, ev('support')]);
aoa.push(['contingency', 'Dự phòng cho phần biến động theo lượng dùng (token LLM, embedding)',
  `10% × (llm ${f(sumComp('llm'))} + embedding ${f(sumComp('embedding'))} USD): token/user là ước lượng nên dễ lệch nhất; công thức tự cập nhật`, contVal, 'NA']);
aoa.push(['TOTAL', '', '', totalVal, '']);

const ws = XLSX.utils.aoa_to_sheet(aoa);
ws[`D${licRow}`] = { t: 'n', v: licVal, f: `MAX(${P.supportMin},${P.supportPct}*(SUM(${rng})))` };
ws[`D${contRow}`] = { t: 'n', v: contVal, f: `0.1*(SUMIF(${arng},"llm",${rng})+SUMIF(${arng},"embedding",${rng}))` };
ws[`D${totalRow}`] = { t: 'n', v: totalVal, f: `SUM(D${firstRow}:D${contRow})` };
ws['!cols'] = [{ wch: 15 }, { wch: 55 }, { wch: 95 }, { wch: 20 }, { wch: 55 }];
ws['!autofilter'] = { ref: `A1:E${totalRow}` };

// ---------- Sheet BangChung: bang chung cua nhom + cua TV1 ----------
const EV = [...team.evidence.map(e => [e.id, e.mo_ta, e.link, e.ngay]),
  ...Object.values(EV_TV1).map(e => [...e, PRICE_DATE])];
const wsEv = XLSX.utils.aoa_to_sheet([['evidence_id', 'mo_ta', 'link', 'ngay_chup', 'anh_chup (dán ảnh vào ô cùng dòng)'], ...EV]);
wsEv['!cols'] = [{ wch: 12 }, { wch: 110 }, { wch: 55 }, { wch: 12 }, { wch: 45 }];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'BaoGia');
XLSX.utils.book_append_sheet(wb, wsEv, 'BangChung');
const out = path.resolve(__dirname, process.argv[2] || '../G03_baogia.xlsx');
XLSX.writeFile(wb, out);

const byComp = {};
TV1_CLOUD.forEach(r => { byComp[r[0]] = r2((byComp[r[0]] || 0) + r[3]); });
console.log('Da ghi ' + out);
console.log('TV1 theo component:', byComp, '| ops_labor', P.sreFteMonth, '| licenses', licVal, '| contingency', contVal);
console.log('Cloud:', r2(cloudSum), '| TOTAL:', totalVal, '| USD/DAU:', (totalVal / 2000).toFixed(2));
