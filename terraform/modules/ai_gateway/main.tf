# ==============================================================================
# MODULE: AI GATEWAY & OBSERVABILITY (APIs Enablement, Artifact Registry, Monitoring)
# Phụ trách: Thành viên 2 (AI, Model & Gateway Specialist)
# ==============================================================================

# 1. KÍCH HOẠT CÁC API DỊCH VỤ CỐT LÕI TRÊN GOOGLE CLOUD
locals {
  services = [
    "aiplatform.googleapis.com",        # Vertex AI (Gemini 3.8 Flash, Gemini Pro, Imagen 3, text-embedding-004)
    "dlp.googleapis.com",               # Cloud Sensitive Data Protection (DLP API)
    "cloudkms.googleapis.com",          # Cloud KMS
    "secretmanager.googleapis.com",     # Secret Manager
    "container.googleapis.com",         # Google Kubernetes Engine
    "sqladmin.googleapis.com",          # Cloud SQL Admin
    "redis.googleapis.com",             # Cloud Memorystore Redis
    "cloudtasks.googleapis.com",        # Cloud Tasks
    "monitoring.googleapis.com",        # Cloud Monitoring
    "logging.googleapis.com",           # Cloud Logging
    "artifactregistry.googleapis.com",  # Artifact Registry (CI/CD)
    "cloudbuild.googleapis.com"         # Cloud Build (CI/CD)
  ]
}

resource "google_project_service" "enabled_apis" {
  for_each           = toset(local.services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# 2. ARTIFACT REGISTRY - Lưu trữ Container Images cho CI/CD & Staging (Component: cicd)
resource "google_artifact_registry_repository" "vbot_repo" {
  depends_on    = [google_project_service.enabled_apis]
  location      = var.region
  repository_id = "${var.project_prefix}-container-repo"
  description   = "Docker repository chua cac ban build microservice cua VBot"
  format        = "DOCKER"
}

# 3. CLOUD MONITORING ALERT POLICY - THỎA MÃN RÀNG BUỘC H8 (QUOTA & BUDGETING)
# Cảnh báo tức thì khi chi phí token hoặc lưu lượng request vượt ngưỡng ngân sách
resource "google_monitoring_alert_policy" "llm_budget_alert" {
  depends_on   = [google_project_service.enabled_apis]
  display_name = "VBot - Canh bao Ngan sach Token vuot nguong"
  combiner     = "OR"

  conditions {
    display_name = "Vertex AI API Request Count Spike"
    condition_threshold {
      filter          = "metric.type=\"serviceruntime.googleapis.com/api/request_count\" resource.type=\"consumed_api\" resource.label.service=\"aiplatform.googleapis.com\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1000 # Canh bao khi request tang dot bien (>1000 req/5phut)
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [] # Co the gan webhook Slack/Teams hoac Email SRE
}

# 4. CLOUD LOGGING BUCKET CHO AUDIT LOG - THỎA MÃN RÀNG BUỘC H5 (LƯU TRỮ 12 THÁNG)
resource "google_logging_project_bucket_config" "audit_log_bucket" {
  depends_on     = [google_project_service.enabled_apis]
  project        = var.project_id
  location       = var.region
  bucket_id      = "${var.project_prefix}-audit-log-12m"
  retention_days = 365 # LƯU TRỮ ĐÚNG 365 NGÀY (12 THÁNG) THEO RÀNG BUỘC CỨNG H5
  description    = "Luu tru toan bo Audit Log truy cap va hanh vi cua Agent trong 12 thang"
}

# 5. VERTEX AI ENDPOINT - Private Endpoint phục vụ AI Gateway routing và Vertex AI model deployment
resource "google_vertex_ai_endpoint" "ai_gateway_endpoint" {
  depends_on   = [google_project_service.enabled_apis]
  project      = var.project_id
  name         = "${var.project_prefix}-ai-gateway-endpoint"
  display_name = "VBot AI Gateway Vertex AI Private Endpoint"
  description  = "Private endpoint cho LLM Gateway routing Gemini 3.8 Flash, Gemini Pro va Embeddings"
  location     = var.region
  region       = var.region
}

