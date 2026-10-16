import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = openpyxl.Workbook()

# Sheet 1: BaoGia
ws_quote = wb.active
ws_quote.title = "BaoGia"

# Sheet 2: BangChung
ws_evid = wb.create_sheet("BangChung")

# Headers
quote_headers = ["Component", "Ý nghĩa", "Ghi chú", "Chi phí/tháng (USD)", "Bằng chứng"]
ws_quote.append(quote_headers)

evid_headers = ["evidence_id", "mo_ta", "link", "ngay_chup"]
ws_evid.append(evid_headers)

# Evidence entries (All used in BaoGia)
evidences = [
    ("E01", "Vertex AI Gemini 3.8 Flash, Pro va Imagen 3 Pricing", "https://cloud.google.com/vertex-ai/generative-ai/pricing", "2026-10-15"),
    ("E02", "Vertex AI text-embedding-004 va Vector Search Pricing", "https://cloud.google.com/vertex-ai/pricing", "2026-10-15"),
    ("E03", "Google Cloud Run serverless container cho AI Gateway", "https://cloud.google.com/run/pricing", "2026-10-15"),
    ("E04", "Google Compute Engine va GKE Node Pricing (asia-southeast1)", "https://cloud.google.com/compute/all-pricing", "2026-10-15"),
    ("E05", "Google Cloud Load Balancing Pricing", "https://cloud.google.com/vpc/network-pricing", "2026-10-15"),
    ("E06", "Google Cloud VPC, Cloud NAT va Cloud Armor WAF Pricing", "https://cloud.google.com/vpc/network-pricing", "2026-10-15"),
    ("E07", "Google Cloud Identity Premium SSO va MFA Pricing", "https://cloud.google.com/identity/pricing", "2026-10-15"),
    ("E08", "Google Cloud SQL PostgreSQL HA Multi-AZ Pricing", "https://cloud.google.com/sql/pricing", "2026-10-15"),
    ("E09", "Google Cloud Storage Multi-AZ Standard Bucket Pricing", "https://cloud.google.com/storage/pricing", "2026-10-15"),
    ("E10", "Google Cloud Memorystore Redis Standard HA va Cloud Tasks", "https://cloud.google.com/memorystore/docs/redis/pricing", "2026-10-15"),
    ("E11", "Google Cloud KMS va Secret Manager Pricing", "https://cloud.google.com/kms/pricing", "2026-10-15"),
    ("E12", "Google Cloud Monitoring va Logging Retention 12 thang Pricing", "https://cloud.google.com/stackdriver/pricing", "2026-10-15"),
    ("E13", "Google Cloud Sensitive Data Protection (Cloud DLP API) Pricing", "https://cloud.google.com/sensitive-data-protection/pricing", "2026-10-15"),
    ("E14", "Google Cloud Build va Artifact Registry CI/CD Pricing", "https://cloud.google.com/build/pricing", "2026-10-15"),
    ("E15", "Google Cloud Enhanced Support Pricing", "https://cloud.google.com/support/pricing", "2026-10-15")
]

for row in evidences:
    ws_evid.append(list(row))

# Quote items
# Rule reminders:
# - Cost is a pure number (no USD, no comma).
# - If cost == 0, Ghi chu MUST contain 'nằm trong'.
# - Ghi chu >= 15 chars, must contain digits.
# - No forbidden words: free tier, trial, dùng thử, khuyến mãi, credits.
# - Must mention staging and HA (multi-az, replica).
# - No item > 60% of total.
# - Evidence must be valid E01..E15 or http url or NA for ops_labor / contingency.

quote_items = [
    # --- TV2 (AI, Model & Gateway Specialist) ---
    (
        "llm",
        "LLM API serving tren Google Vertex AI (Gemini 3.8 Flash, Gemini Pro va Imagen 3)",
        "Region asia-southeast1. Gemini 3.8 Flash (Cap 1-3): 2.431M token in (35% cached) = 134,46 USD; 533,5M token out x 0,30 USD/1M = 160,05 USD. Gemini Pro (Cap 4): 1.056M token in (25% cached) = 1.072,50 USD; 198M token out x 5,00 USD/1M = 990,00 USD. Imagen 3 (Cap 5): 33.000 anh x 0,030 USD = 990,00 USD. Context cache luu tru = 22,00 USD. Tong 3.369,01 USD",
        3369.01,
        "E01; https://cloud.google.com/vertex-ai/generative-ai/pricing"
    ),
    (
        "embedding",
        "Embedding model text-embedding-004 tao vector 768 chieu cho RAG",
        "Region asia-southeast1. 600 trieu token moi thang phuc vu index tai lieu va chat query x 0,020 USD/1M token = 12,00 USD",
        12.00,
        "E02; https://cloud.google.com/vertex-ai/pricing"
    ),
    (
        "gateway",
        "AI Gateway dinh tuyen model, circuit breaker, quota va canh bao ngan sach H8",
        "2 container Cloud Run (prod va 1 staging) autoscale 220 gio hanh chinh x 0,08 USD = 35,20 USD; Cloud Monitoring API do quota va latency = 14,80 USD",
        50.00,
        "E03; https://cloud.google.com/run/pricing"
    ),

    # --- TV1 (Lead, Platform & Network) ---
    (
        "compute",
        "Cum GKE Standard Multi-AZ cho ung dung VBot va moi truong staging",
        "GKE cluster fee 73,00 USD; 4 node e2-standard-4 (16 vCPU, 64 GB RAM) trai 3 AZ x 220 gio x 0,134 USD = 117,92 USD; 1 node e2-standard-2 cho staging = 48,91 USD",
        239.83,
        "E04; https://cloud.google.com/compute/all-pricing"
    ),
    (
        "load_balancer",
        "Cloud Application Load Balancer Multi-AZ ho tro TLS va routing",
        "1 rule chuyen tiep x 730 gio x 0,025 USD = 18,25 USD; xu ly 1.500 GB du lieu x 0,008 USD = 12,00 USD",
        30.25,
        "E05; https://cloud.google.com/vpc/network-pricing"
    ),
    (
        "network",
        "VPC Network, Cloud NAT Multi-AZ va Cloud Armor WAF chong DDoS",
        "2 Cloud NAT gateway x 730 gio x 0,045 USD = 65,70 USD; Egress internet 500 GB x 0,12 USD = 60,00 USD; Cloud Armor WAF rate-limit = 25,00 USD",
        150.70,
        "E06; https://cloud.google.com/vpc/network-pricing"
    ),
    (
        "cicd",
        "Cloud Build va Artifact Registry cho pipeline tu dong hoa prod va staging",
        "Cloud Build 1.200 phut e2-standard-2 x 0,003 USD = 3,60 USD; 50 GB Artifact Registry luu container images = 5,00 USD",
        8.60,
        "E14; https://cloud.google.com/build/pricing"
    ),
    (
        "ops_labor",
        "Ky su SRE va MLOps van hanh he thong 24/7 cam ket uptime 99.5%",
        "1 FTE SRE/MLOps chuyen trach giam sat he thong prod va staging, luong thang 3.500 USD x 1 = 3.500 USD",
        3500.00,
        "NA"
    ),
    (
        "licenses",
        "Goi ho tro ky thuat Google Cloud Enhanced Support 24/7",
        "Goi ho tro ky thuat cap doanh nghiep voi SLA phan hoi duoi 1 gio cho su co he thong = 500,00 USD",
        500.00,
        "E15; https://cloud.google.com/support/pricing"
    ),
    (
        "contingency",
        "Ngan sach du phong rui ro bien dong tai va dot bien token gio cao diem",
        "Du phong khoang 5% tren tong chi phi ha tang cloud = 500,00 USD",
        500.00,
        "NA"
    ),

    # --- TV3 (Data, Workspace & Connectors) ---
    (
        "connectors",
        "Tich hop SaaS Connectors (Google Workspace, M365, Notion, Jira, Confluence)",
        "Microservices tich hop connector chay bang quyen OAuth uy nhiem 220 gio, chi phi nằm trong dong compute",
        0.00,
        "E04; https://cloud.google.com/compute/all-pricing"
    ),
    (
        "database",
        "Cloud SQL for PostgreSQL 15 Regional Multi-AZ bat pgvector",
        "Instance db-custom-4-16384 (4 vCPU, 16 GB RAM) Regional Multi-AZ 730 gio x 0,38 USD = 277,40 USD; 200 GB SSD Multi-AZ x 0,34 USD = 68,00 USD; backup snapshot = 20,00 USD",
        365.40,
        "E08; https://cloud.google.com/sql/pricing"
    ),
    (
        "vector_db",
        "Vector index luu tru 500.000 vectors tai lieu noi bo phuc vu RAG",
        "Ket hop pgvector tren Cloud SQL va Vertex AI Vector Search endpoint co so, chi phi co ban nam trong dong database kem 1 index endpoint nho 80,00 USD",
        80.00,
        "E02; https://cloud.google.com/vertex-ai/pricing"
    ),
    (
        "object_storage",
        "Cloud Storage (GCS) Standard Multi-AZ luu Workspace rieng 10GB/user",
        "2.000 user x 5 GB luu tru thuc te = 10.000 GB x 0,023 USD = 230,00 USD; thao tac Class A/B = 15,00 USD; bucket staging = 10,00 USD",
        255.00,
        "E09; https://cloud.google.com/storage/pricing"
    ),
    (
        "cache_queue",
        "Memorystore Redis Standard HA Multi-AZ va Cloud Tasks queue",
        "Instance Redis 5 GB Standard Tier HA Multi-AZ failover tu dong = 145,00 USD; Cloud Tasks 1.000.000 tac vu = 5,00 USD",
        150.00,
        "E10; https://cloud.google.com/memorystore/docs/redis/pricing"
    ),

    # --- TV4 (Security, Sandbox, Governance & Reliability) ---
    (
        "sandbox",
        "GKE Sandbox Node Pool co lap kernel bang gVisor cho Agent chay code",
        "2 node c2-standard-4 (compute-optimized) x 2 AZ x 220 gio x 0,208 USD = 183,04 USD; 1 node staging = 45,76 USD",
        228.80,
        "E04; https://cloud.google.com/compute/all-pricing"
    ),
    (
        "authn",
        "Xac thuc tap doan SSO OIDC/SAML va MFA qua Cloud Identity Premium",
        "Cloud Identity Premium bao mat SSO kem MFA cho 2.000 nguoi dung x 1,00 USD/user = 2.000,00 USD; staging dung chung",
        2000.00,
        "E07; https://cloud.google.com/identity/pricing"
    ),
    (
        "authz",
        "Policy Engine phan quyen RBAC/ABAC va Document ACL theo quyen goc",
        "He thong policy engine phan quyen 2.000 user chay tich hop trong ung dung, chi phi nằm trong dong compute",
        0.00,
        "E04; https://cloud.google.com/compute/all-pricing"
    ),
    (
        "secrets_kms",
        "Cloud KMS ma hoa du lieu va Secret Manager luu OAuth Refresh Tokens",
        "1 KMS CryptoKey ma hoa du lieu x 0,06 USD + 100.000 thao tac = 3,06 USD; 2.500 secrets Secret Manager = 15,00 USD",
        18.06,
        "E11; https://cloud.google.com/kms/pricing"
    ),
    (
        "backup_dr",
        "Kế hoạch Backup va DR Multi-AZ dap ung RTO 4 gio va RPO 1 gio",
        "Cloud SQL automated daily backup 300 GB x 0,08 USD = 24,00 USD; Cross-region replica DR sang asia-southeast2 = 35,00 USD",
        59.00,
        "E08; https://cloud.google.com/sql/pricing"
    ),
    (
        "monitoring",
        "Cloud Monitoring va Cloud Logging luu Audit Log 12 thang theo chuan H5",
        "50 GB log truy cap va audit 12 thang x 0,50 USD = 25,00 USD; custom metrics va dashboard = 15,00 USD",
        40.00,
        "E12; https://cloud.google.com/stackdriver/pricing"
    ),
    (
        "governance",
        "Cloud Sensitive Data Protection (DLP API) phat hien va mask PII",
        "Quet kiem tra va an thong tin PII (CCCD, the tin dung, email) 100 GB du lieu moi thang x 1,00 USD = 100,00 USD",
        100.00,
        "E13; https://cloud.google.com/sensitive-data-protection/pricing"
    )
]

total_cost = 0.0
for item in quote_items:
    ws_quote.append(list(item))
    total_cost += item[3]

total_cost = round(total_cost, 2)

# Row TOTAL
ws_quote.append(["TOTAL", "", "", total_cost, ""])

# Styling
header_fill = PatternFill(start_color="182936", end_color="182936", fill_type="solid")
header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
total_fill = PatternFill(start_color="E8EEF2", end_color="E8EEF2", fill_type="solid")
total_font = Font(name="Segoe UI", size=11, bold=True, color="0B6E99")

for cell in ws_quote[1]:
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center")

for cell in ws_evid[1]:
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center")

last_row = ws_quote.max_row
for cell in ws_quote[last_row]:
    cell.fill = total_fill
    cell.font = total_font

# Set column widths
ws_quote.column_dimensions["A"].width = 16
ws_quote.column_dimensions["B"].width = 38
ws_quote.column_dimensions["C"].width = 85
ws_quote.column_dimensions["D"].width = 22
ws_quote.column_dimensions["E"].width = 45

ws_evid.column_dimensions["A"].width = 15
ws_evid.column_dimensions["B"].width = 45
ws_evid.column_dimensions["C"].width = 55
ws_evid.column_dimensions["D"].width = 15

wb.save("G03_baogia.xlsx")
print(f"Generated G03_baogia.xlsx successfully. Total items: {len(quote_items)}, TOTAL: ${total_cost:.2f}")
