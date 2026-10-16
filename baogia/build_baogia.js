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

// ---------- Dong cua TV3 (connectors, database, vector_db, object_storage, cache_queue) ----------
// Don gia: Cloud Billing Catalog API ngay 2026-10-16, ban ghi SKU goc o tv3_data/pricing/tv3_skus_2026-10-16.json
// Sizing chi tiet: TV3_DATA_WORKSPACE_CONNECTORS.md muc 2
const P3 = {
  sqlRegVcpu: 0.1156,        // Cloud SQL for PostgreSQL: Regional - vCPU in Singapore (0152-2835-C929)
  sqlRegRam: 0.0196,         // Cloud SQL for PostgreSQL: Regional - RAM in Singapore (37B4-B2B7-C640)
  sqlRegSsd: 0.476,          // Cloud SQL for PostgreSQL: Regional - Standard storage in Singapore (83A6-DA61-7797)
  sqlZonVcpu: 0.0578,        // Zonal - vCPU in Singapore (DE86-B401-E60F)
  sqlZonRam: 0.0098,         // Zonal - RAM in Singapore (EF83-F6A8-8EA7)
  sqlZonSsd: 0.238,          // Zonal - Standard storage in Singapore (45B3-606F-EE91)
  sqlCud1y: 0.75,            // Commitment dollar based v1: Cloud SQL asia-southeast1 1 year = 0.0075/0.01 => tra 75% (B4F3-4753-84D8)
  gcsStd: 0.020,             // Standard Storage Singapore (76BA-5CAD-4338)
  gcsNearline: 0.010,        // Nearline Storage Singapore (4453-FEE4-941B)
  gcsClassA: 0.000005,       // Regional Standard Class A Operations, 0.05 USD/10.000 (4DBF-185F-A415)
  gcsClassB: 0.0000004,      // Regional Standard Class B Operations, 0.004 USD/10.000 (7870-010B-2763)
  gcsNearlineClassA: 0.00001,// Regional Nearline Class A Operations (9559-D2EC-1D33), lifecycle chuyen lop
  gcsNearlineRetrieval: 0.01,// Nearline Data Retrieval (8D92-97F6-DDF3)
  redisStdM2: 0.075,         // Redis Capacity Standard M2 Singapore, 5-10 GB (A728-AD0D-27B4)
  redisStdM1: 0.114,         // Redis Capacity Standard M1 Singapore, 1-4 GB (ABC0-67FF-FCAD), de so sanh
  tasksPerMillion: 0.40,     // Cloud Tasks Operations (378A-D762-1F74)
  pubsubPerTiB: 40,          // Pub/Sub Message Delivery Basic (027D-B6C7-CCA2)
  schedulerJobMonth: 0.10,   // Cloud Scheduler Jobs (A5D6-43A2-28A7): 0.003225806 USD/job-ngay x 31
};
const S3 = {
  dbVcpu: 4, dbRamGb: 16, dbSsdGb: 200,          // db-custom-4-16384 regional HA
  stgVcpu: 1, stgRamGb: 3.75, stgSsdGb: 20,      // db-custom-1-3840 zonal, chay 220 gio
  gcsStdGb: 1050,           // 3 thang gan nhat x 350 GB moi/thang (Standard <= 90 ngay)
  gcsNearlineGb: 3150,      // thang 4-12 x 350 GB (Nearline); tong 4.200 GB = 2,1 GB/user < quota 10 GB
  gcsClassAM: 1.32,         // trieu thao tac ghi/list: 2.000 user x 30/ngay x 22 ngay
  gcsClassBM: 4.4,          // trieu thao tac doc: 2.000 x 100/ngay x 22
  gcsLifecycleObjK: 440,    // nghin object chuyen Nearline/thang (2.000 x 10 object/ngay x 22)
  gcsRetrievalGb: 160,      // ~5% du lieu Nearline duoc mo lai moi thang
  gcsStagingGb: 50,
  redisGb: 5,
  tasksOpsM: 4.2,           // trieu operation Cloud Tasks (agent 1,58 + sync theo webhook 2,2 + delta tick 0,35, lam tron)
  pubsubGb: 4.4,            // 2,2 trieu event x 1 KB (muc tinh toi thieu) x (publish + delivery)
  syncJobs: 5, stagingDbJobs: 2,
  ingestGbMonth: 15, ingestClassAK: 150,
};
const sqlRegHour = S3.dbVcpu * P3.sqlRegVcpu + S3.dbRamGb * P3.sqlRegRam;
const sqlStgHour = S3.stgVcpu * P3.sqlZonVcpu + S3.stgRamGb * P3.sqlZonRam;
const TV3_ROWS = [
  ['connectors', 'Gọi API SaaS (Gmail, Drive, Calendar, Outlook, OneDrive, SharePoint, Teams, Notion, Jira, Confluence) bằng OAuth ủy nhiệm của từng user',
    'Phí gọi API của Google Workspace, Microsoft Graph, Notion, Jira, Confluence nằm trong license SaaS tập đoàn đang trả; connector worker chạy trên GKE nằm trong dòng compute, lưu lượng ra SaaS qua Cloud NAT nằm trong dòng network. Rate limit từng SaaS theo link bằng chứng; ~20.000 lượt gọi/ngày',
    0, 'https://developers.google.com/workspace/gmail/api/reference/quota; https://learn.microsoft.com/en-us/graph/throttling; https://developer.atlassian.com/cloud/jira/platform/rate-limiting/'],
  ['connectors', 'Pub/Sub nhận thông báo thay đổi (Gmail/Drive watch, webhook M365/Jira/Confluence/Notion) cho đồng bộ index theo sự kiện',
    `Pub/Sub Message Delivery, SKU 027D-B6C7-CCA2: 2,2 triệu event/tháng × 1 KB × 2 (publish + delivery) = ${S3.pubsubGb} GB = ${f(S3.pubsubGb / 1024, 4)} TiB × ${P3.pubsubPerTiB} USD/TiB, cộng lưu 1 ngày ~0,1 GB × 0,27 USD (F9EB-D3E1-ABDF). Tính toàn bộ theo đơn giá niêm yết`,
    S3.pubsubGb / 1024 * P3.pubsubPerTiB + 0.1 * 0.27, 'E35; https://cloud.google.com/pubsub/pricing'],
  ['connectors', 'Cloud Scheduler: delta sync 15 phút/lần trong giờ hành chính cho 5 nhóm connector',
    `Cloud Scheduler Jobs, SKU A5D6-43A2-28A7: ${S3.syncJobs} job × ${P3.schedulerJobMonth} USD/job-tháng (0,003225806 USD/job-ngày × 31)`,
    S3.syncJobs * P3.schedulerJobMonth, 'E36; https://cloud.google.com/scheduler/pricing'],
  ['connectors', 'Bucket tạm connector-ingest (file tải từ Drive/SharePoint để tách chunk, tự xóa sau 7 ngày, CMEK)',
    `GCS Standard Singapore: ${S3.ingestGbMonth} GB-tháng × ${P3.gcsStd} USD + ${S3.ingestClassAK}.000 thao tác ghi × ${P3.gcsClassA} USD (SKU 76BA-5CAD-4338, 4DBF-185F-A415)`,
    S3.ingestGbMonth * P3.gcsStd + S3.ingestClassAK * 1000 * P3.gcsClassA, 'E32; https://cloud.google.com/storage/pricing'],

  ['database', 'Cloud SQL PostgreSQL 16 Regional HA (primary + standby khác zone, failover tự động): user, ACL, lịch sử chat 12 tháng, memory, metadata workspace',
    `db-custom-4-16384, asia-southeast1, REGIONAL (multi-AZ): (${S3.dbVcpu} vCPU × ${P3.sqlRegVcpu} + ${S3.dbRamGb} GB × ${P3.sqlRegRam}) = ${f(sqlRegHour, 4)} USD/giờ × ${HOURS_24x7} giờ = ${f(sqlRegHour * HOURS_24x7)} USD, committed use 1 năm trả ${P3.sqlCud1y * 100}% (giảm 25%, SKU B4F3-4753-84D8). SKU 0152-2835-C929, 37B4-B2B7-C640`,
    sqlRegHour * HOURS_24x7 * P3.sqlCud1y, 'E30; E31; https://cloud.google.com/sql/pricing'],
  ['database', 'Ổ SSD Cloud SQL Regional HA 200 GB (chat 12 tháng ~84 GB, vector ~8 GB, memory + metadata ~4 GB, ×1,5 WAL/bloat, dư IOPS)',
    `Regional Standard storage Singapore, SKU 83A6-DA61-7797: ${S3.dbSsdGb} GB × ${P3.sqlRegSsd} USD/GB-tháng (giá regional đã gồm bản sao ở zone standby). Tự tăng tối đa 500 GB`,
    S3.dbSsdGb * P3.sqlRegSsd, 'E30; https://cloud.google.com/sql/pricing'],
  ['database', 'Cloud SQL staging (môi trường staging): zonal, chỉ bật giờ hành chính bằng Cloud Scheduler',
    `db-custom-1-3840 zonal: (${S3.stgVcpu} × ${P3.sqlZonVcpu} + ${S3.stgRamGb} × ${P3.sqlZonRam}) × ${HOURS_OFFICE} giờ = ${f(sqlStgHour * HOURS_OFFICE)} USD; SSD ${S3.stgSsdGb} GB × ${P3.sqlZonSsd} = ${f(S3.stgSsdGb * P3.sqlZonSsd)} USD; ${S3.stagingDbJobs} job Scheduler bật/tắt × ${P3.schedulerJobMonth} USD (SKU DE86-B401-E60F, EF83-F6A8-8EA7, 45B3-606F-EE91, A5D6-43A2-28A7)`,
    sqlStgHour * HOURS_OFFICE + S3.stgSsdGb * P3.sqlZonSsd + S3.stagingDbJobs * P3.schedulerJobMonth, 'E30; E36; https://cloud.google.com/sql/pricing'],

  ['vector_db', 'pgvector (HNSW, 768 chiều) trong Cloud SQL: ~800.000 chunk knowledge base + memory, lọc theo ACL gốc bằng Row-Level Security ngay trong truy vấn ANN',
    'Nằm trong dòng database (Cloud SQL Regional HA ở trên): vector ~8 GB đã tính vào ổ 200 GB, HNSW index ~3 GB nằm trong RAM 16 GB. Không thuê thêm dịch vụ vector riêng; RLS lọc theo acl_principals nên user không thấy chunk mình không có quyền',
    0, 'E30; E37; https://cloud.google.com/sql/docs/postgres/work-with-vectors'],

  ['object_storage', 'GCS workspace riêng từng user (prefix user-workspaces/{user_id}/, UBLA, CMEK, quota 10 GB): dữ liệu ≤ 90 ngày ở lớp Standard',
    `Standard Storage Singapore, SKU 76BA-5CAD-4338: ${S3.gcsStdGb} GB (350 GB mới/tháng × 3 tháng; 2.000 user × ~160 MB/tháng gồm upload, file agent xuất, ảnh cấp 5, kết quả sandbox, +10% phiên bản cũ) × ${P3.gcsStd} USD/GB-tháng`,
    S3.gcsStdGb * P3.gcsStd, 'E32; https://cloud.google.com/storage/pricing'],
  ['object_storage', 'GCS workspace: file cũ hơn 90 ngày tự chuyển Nearline bằng lifecycle rule',
    `Nearline Storage Singapore, SKU 4453-FEE4-941B: ${S3.gcsNearlineGb} GB (tháng 4-12 × 350 GB) × ${P3.gcsNearline} USD/GB-tháng. Tổng workspace 4.200 GB = 2,1 GB/user, dưới quota 10 GB`,
    S3.gcsNearlineGb * P3.gcsNearline, 'E32; https://cloud.google.com/storage/pricing'],
  ['object_storage', 'Thao tác GCS workspace: ghi, đọc, chuyển lớp lifecycle, đọc lại file Nearline',
    `Class A ${S3.gcsClassAM} triệu × ${P3.gcsClassA} + Class B ${S3.gcsClassBM} triệu × ${P3.gcsClassB} + chuyển lớp ${S3.gcsLifecycleObjK}.000 object × ${P3.gcsNearlineClassA} + retrieval ${S3.gcsRetrievalGb} GB × ${P3.gcsNearlineRetrieval} USD (SKU 4DBF-185F-A415, 7870-010B-2763, 9559-D2EC-1D33, 8D92-97F6-DDF3); tính toàn bộ số thao tác theo đơn giá niêm yết`,
    S3.gcsClassAM * 1e6 * P3.gcsClassA + S3.gcsClassBM * 1e6 * P3.gcsClassB + S3.gcsLifecycleObjK * 1000 * P3.gcsNearlineClassA + S3.gcsRetrievalGb * P3.gcsNearlineRetrieval,
    'E32; https://cloud.google.com/storage/pricing'],
  ['object_storage', 'Bucket workspace cho staging (dữ liệu giả, tự xóa sau 30 ngày)',
    `Standard Storage Singapore, SKU 76BA-5CAD-4338: ${S3.gcsStagingGb} GB × ${P3.gcsStd} USD/GB-tháng`,
    S3.gcsStagingGb * P3.gcsStd, 'E32; https://cloud.google.com/storage/pricing'],

  ['cache_queue', 'Memorystore for Redis Standard HA 5 GB (primary + replica khác zone, failover tự động): phiên, ngữ cảnh hội thoại, cache RAG, bộ đếm quota, cờ hủy tác vụ agent',
    `Redis Capacity Standard M2 Singapore, SKU A728-AD0D-27B4: ${S3.redisGb} GB × ${HOURS_24x7} giờ × ${P3.redisStdM2} USD/GB-giờ. Chọn 5 GB vì bậc M2 rẻ hơn: 4 GB bậc M1 = 4 × 730 × ${P3.redisStdM1} = ${f(4 * HOURS_24x7 * P3.redisStdM1)} USD. Staging dùng Redis container trên node staging, nằm trong compute`,
    S3.redisGb * HOURS_24x7 * P3.redisStdM2, 'E33; https://cloud.google.com/memorystore/docs/redis/pricing'],
  ['cache_queue', 'Cloud Tasks: hàng đợi agent chạy nền cấp 4 (retry tối đa 10 phút) và hàng đợi đồng bộ connector',
    `Cloud Tasks Operations, SKU 378A-D762-1F74: ${S3.tasksOpsM} triệu operation (132.000 tác vụ agent × 6 bước × 2 = 1,58 triệu; sync theo webhook 2,2 triệu; delta tick 0,35 triệu) × ${P3.tasksPerMillion} USD/triệu, tính toàn bộ theo đơn giá niêm yết`,
    S3.tasksOpsM * P3.tasksPerMillion, 'E34; https://cloud.google.com/tasks/pricing'],
].map(r => [r[0], r[1], r[2], r2(r[3]), r[4]]);

// ---------- Dong cua TV2/TV4: chu so huu dien Ghi chu, Chi phi, Bang chung ----------
// Dien [component, y_nghia, ghi_chu, chi_phi (so), bang_chung]; de chi_phi = null neu chua co.
const TODO = who => `CHỜ ${who} điền: dịch vụ/SKU, region, đơn giá × số lượng`;
const TEAM_ROWS = [
  ['llm', 'Gemini Flash cho tác vụ cấp 1–3 (chat, email, tài liệu)', TODO('TV2'), null, ''],
  ['llm', 'Gemini Pro cho tác vụ cấp 4 (agent dự án, reasoning)', TODO('TV2'), null, ''],
  ['llm', 'Imagen cho tác vụ cấp 5 (mockup, sơ đồ, ảnh minh họa)', TODO('TV2'), null, ''],
  ['embedding', 'Embedding tài liệu cho RAG (index lần đầu + hằng ngày)', TODO('TV2'), null, ''],
  ['gateway', 'LLM gateway: routing 5 cấp, quota theo user/đơn vị, fallback, log token', TODO('TV2'), null, ''],
  ...TV3_ROWS,
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
  // TV3: E30-E37 (ban ghi SKU goc: tv3_data/pricing/tv3_skus_2026-10-16.json)
  ['E30', 'Cloud SQL for PostgreSQL, Singapore: Regional vCPU 0.1156 USD/giờ, RAM 0.0196 USD/GB-giờ, storage 0.476 USD/GB-tháng; Zonal vCPU 0.0578, RAM 0.0098, storage 0.238 (SKU 0152-2835-C929, 37B4-B2B7-C640, 83A6-DA61-7797, DE86-B401-E60F, EF83-F6A8-8EA7, 45B3-606F-EE91)', 'https://cloud.google.com/sql/pricing'],
  ['E31', 'Cloud SQL committed use 1 năm, asia-southeast1: 0.0075 USD cho mỗi 0.01 USD/giờ cam kết, tức giảm 25% vCPU + RAM (SKU B4F3-4753-84D8)', 'https://cloud.google.com/sql/cud'],
  ['E32', 'Cloud Storage Singapore: Standard 0.020, Nearline 0.010 USD/GB-tháng; Class A 0.05 USD/10.000, Class B 0.004 USD/10.000; Nearline Class A 0.10 USD/10.000; Nearline retrieval 0.01 USD/GB (SKU 76BA-5CAD-4338, 4453-FEE4-941B, 4DBF-185F-A415, 7870-010B-2763, 9559-D2EC-1D33, 8D92-97F6-DDF3)', 'https://cloud.google.com/storage/pricing'],
  ['E33', 'Memorystore for Redis Standard tier, Singapore: M2 (5-10 GB) 0.075 USD/GB-giờ, M1 (1-4 GB) 0.114 USD/GB-giờ (SKU A728-AD0D-27B4, ABC0-67FF-FCAD)', 'https://cloud.google.com/memorystore/docs/redis/pricing'],
  ['E34', 'Cloud Tasks: 0.40 USD/triệu operation (SKU 378A-D762-1F74)', 'https://cloud.google.com/tasks/pricing'],
  ['E35', 'Pub/Sub: message delivery 40 USD/TiB, lưu message 0.27 USD/GB-tháng (SKU 027D-B6C7-CCA2, F9EB-D3E1-ABDF)', 'https://cloud.google.com/pubsub/pricing'],
  ['E36', 'Cloud Scheduler: 0.10 USD/job-tháng = 0.003225806 USD/job-ngày (SKU A5D6-43A2-28A7)', 'https://cloud.google.com/scheduler/pricing'],
  ['E37', 'Cloud SQL for PostgreSQL hỗ trợ extension pgvector (CREATE EXTENSION vector), không tính phí riêng ngoài instance', 'https://cloud.google.com/sql/docs/postgres/work-with-vectors'],
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
