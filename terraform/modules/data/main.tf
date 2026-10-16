# ==============================================================================
# MODULE: DATA, WORKSPACE & CONNECTORS
# Cloud SQL PostgreSQL HA + pgvector, GCS workspace, Redis HA, Cloud Tasks,
# Pub/Sub + Cloud Scheduler cho connectors, staging DB
# Phụ trách: Thành viên 3 (Data, Workspace & Connectors Specialist)
# Component báo giá: database, vector_db, object_storage, cache_queue, connectors
# ==============================================================================

terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
    }
  }
}

locals {
  workspace_bucket = "${var.project_prefix}-workspaces-${var.project_id}"
  # Mọi object của user nằm dưới prefix này. Workspace service chỉ cấp token
  # downscoped (Credential Access Boundary) cho đúng prefix của user đang gọi.
  workspace_prefix = "user-workspaces/"
  wi_member        = "serviceAccount:${var.workload_identity_pool}[${var.k8s_namespace}/%s]"
  connectors       = ["google-workspace", "m365", "notion", "jira", "confluence"]
}

# Module tự bật API mình cần (sqladmin, redis, cloudtasks đã bật ở module ai_gateway)
resource "google_project_service" "apis" {
  for_each           = toset(["pubsub.googleapis.com", "cloudscheduler.googleapis.com", "storage.googleapis.com"])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

data "google_project" "this" {
  project_id = var.project_id
}

# ------------------------------------------------------------------------------
# 0. SERVICE ACCOUNT QUYỀN TỐI THIỂU CHO TẦNG DỮ LIỆU (Workload Identity, H2/H3)
# ------------------------------------------------------------------------------
# workspace-svc: service DUY NHẤT được đọc/ghi bucket workspace. Agent và sandbox
#   không có quyền bucket; chúng nhận token downscoped chỉ thấy prefix của user.
# data-api: orchestrator/RAG đọc ghi Cloud SQL (IAM auth), đẩy task vào queue.
# connector-worker: đồng bộ SaaS, đọc event từ Pub/Sub, ghi chunk vào Cloud SQL.
resource "google_service_account" "data_sa" {
  for_each     = toset(["workspace-svc", "data-api", "connector-worker"])
  account_id   = "${var.project_prefix}-${each.key}"
  display_name = "VBot ${each.key} (TV3 data layer)"
}

resource "google_service_account_iam_member" "workload_identity" {
  for_each           = google_service_account.data_sa
  service_account_id = each.value.name
  role               = "roles/iam.workloadIdentityUser"
  member             = format(local.wi_member, each.key)
}

resource "google_project_iam_member" "sql_client" {
  for_each = toset(["data-api", "connector-worker"])
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = google_service_account.data_sa[each.key].member
}

resource "google_project_iam_member" "sql_instance_user" {
  for_each = toset(["data-api", "connector-worker"])
  project  = var.project_id
  role     = "roles/cloudsql.instanceUser"
  member   = google_service_account.data_sa[each.key].member
}

# ------------------------------------------------------------------------------
# 1. CLOUD SQL FOR POSTGRESQL 16: REGIONAL HA (H7) + pgvector (vector_db)
# ------------------------------------------------------------------------------
# Dữ liệu: user/nhóm, ACL tài liệu, chunk + embedding 768 chiều (pgvector, HNSW),
# lịch sử chat 12 tháng, bộ nhớ dài hạn, metadata workspace + quota 10 GB/user.
# Cô lập dữ liệu bằng Row-Level Security: xem tv3_data/sql/001_schema.sql.
# pgvector có sẵn trên Cloud SQL, bật bằng "CREATE EXTENSION vector" trong migration
# (Cloud SQL không có database flag cho pgvector).
resource "google_sql_database_instance" "postgres_ha" {
  name             = "${var.project_prefix}-pg-ha"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [var.private_vpc_connection]

  settings {
    edition               = "ENTERPRISE"
    tier                  = var.db_tier # db-custom-4-16384: 4 vCPU, 16 GB RAM
    availability_type     = "REGIONAL"  # Primary + standby ở 2 zone khác nhau, failover tự động (H7)
    disk_type             = "PD_SSD"
    disk_size             = var.db_disk_size_gb
    disk_autoresize       = true
    disk_autoresize_limit = var.db_disk_autoresize_limit_gb

    user_labels = {
      component = "database"
      owner     = "tv3"
      env       = "prod"
    }

    database_flags {
      name  = "cloudsql.iam_authentication" # App đăng nhập bằng IAM (Workload Identity), không cần mật khẩu
      value = "on"
    }
    database_flags {
      name  = "cloudsql.enable_pgaudit" # Audit truy cập dữ liệu (H5)
      value = "on"
    }
    database_flags {
      name  = "pgaudit.log"
      value = "ddl,role"
    }
    database_flags {
      name  = "max_connections"
      value = "400" # 6 node app x pool PgBouncer, dư cho failover
    }

    ip_configuration {
      ipv4_enabled                                  = false # Chỉ Private IP trong VPC (Private Service Access)
      private_network                               = var.vpc_id
      ssl_mode                                      = "ENCRYPTED_ONLY" # Mã hóa khi truyền (H5)
      enable_private_path_for_google_cloud_services = true
    }

    # Backup hằng ngày + PITR (WAL 7 ngày) => RPO tính bằng phút, đạt RPO <= 1h (H7).
    # Bản sao backup cross-region do TV4 cấu hình trong kế hoạch DR (dòng backup_dr).
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "19:00" # 02:00 giờ Việt Nam
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 14
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = 7  # Chủ Nhật
      hour         = 19 # 02:00 giờ Việt Nam, ngoài giờ hành chính
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true # Theo dõi truy vấn vector chậm
      record_application_tags = true
      record_client_address   = false
    }
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "vbot_db" {
  name     = "vbot_production"
  instance = google_sql_database_instance.postgres_ha.name
}

# User quản trị cho migration (mật khẩu truyền qua tfvars/TF_VAR, không để trong code)
resource "google_sql_user" "vbot_admin" {
  name     = "vbot_admin"
  instance = google_sql_database_instance.postgres_ha.name
  password = var.db_password
}

# User IAM cho ứng dụng: không có mật khẩu, token ngắn hạn qua Workload Identity
resource "google_sql_user" "iam_app" {
  for_each = toset(["data-api", "connector-worker"])
  name     = trimsuffix(google_service_account.data_sa[each.key].email, ".gserviceaccount.com")
  instance = google_sql_database_instance.postgres_ha.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

# ------------------------------------------------------------------------------
# 1b. STAGING DATABASE: zonal, nhỏ, chỉ chạy giờ hành chính (FinOps)
# ------------------------------------------------------------------------------
resource "google_sql_database_instance" "postgres_staging" {
  count            = var.enable_staging ? 1 : 0
  name             = "${var.project_prefix}-pg-staging"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [var.private_vpc_connection]

  settings {
    edition           = "ENTERPRISE"
    tier              = var.staging_db_tier # db-custom-1-3840
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 20
    activation_policy = "ALWAYS" # Cloud Scheduler bật/tắt theo giờ hành chính (mục 6)

    user_labels = {
      component = "database"
      owner     = "tv3"
      env       = "staging"
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled = true
    }
  }

  # Scheduler đổi activation_policy hằng ngày, Terraform không ghi đè lại
  lifecycle {
    ignore_changes = [settings[0].activation_policy]
  }

  deletion_protection = false
}

# ------------------------------------------------------------------------------
# 2. CLOUD STORAGE: WORKSPACE RIÊNG TỪNG USER (H3, H5)
# ------------------------------------------------------------------------------
# Cô lập: 1 bucket, prefix user-workspaces/{user_id}/, Uniform Bucket-Level Access
# (không có ACL theo object), chặn public, CMEK. Chỉ workspace-svc có quyền bucket.
# Quota 10 GB/user: workspace-svc kiểm tra bảng workspace_files trước khi cấp URL upload.
data "google_storage_project_service_account" "gcs" {
  project = var.project_id
}

# GCS service agent cần quyền dùng khóa KMS của TV4 thì mới mã hóa CMEK được
resource "google_kms_crypto_key_iam_member" "gcs_cmek" {
  crypto_key_id = var.kms_key_id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs.email_address}"
}

resource "google_storage_bucket" "workspace_bucket" {
  name                        = local.workspace_bucket
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  depends_on = [google_kms_crypto_key_iam_member.gcs_cmek, google_project_service.apis]

  labels = {
    component = "object_storage"
    owner     = "tv3"
    env       = "prod"
  }

  versioning {
    enabled = true # Khôi phục file bị agent ghi đè/xóa nhầm
  }

  encryption {
    default_kms_key_name = var.kms_key_id # CMEK (H5)
  }

  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 ngày
  }

  # File không đổi sau 90 ngày -> Nearline, sau 365 ngày -> Coldline (FinOps)
  lifecycle_rule {
    condition {
      age                   = 90
      matches_storage_class = ["STANDARD"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age                   = 365
      matches_storage_class = ["NEARLINE"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # Giữ tối đa 3 phiên bản cũ, phiên bản cũ quá 30 ngày thì xóa
  lifecycle_rule {
    condition {
      num_newer_versions = 3
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      days_since_noncurrent_time = 30
      with_state                 = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }
}

# Chỉ workspace-svc được đọc/ghi object; không cấp quyền ở mức project
resource "google_storage_bucket_iam_member" "workspace_svc" {
  bucket = google_storage_bucket.workspace_bucket.name
  role   = "roles/storage.objectUser"
  member = google_service_account.data_sa["workspace-svc"].member
}

# workspace-svc tự ký token downscoped/Signed URL bằng chính service account của nó
resource "google_service_account_iam_member" "workspace_token_creator" {
  service_account_id = google_service_account.data_sa["workspace-svc"].name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = google_service_account.data_sa["workspace-svc"].member
}

# Bucket tạm cho connector ingest (file tải từ Drive/SharePoint để tách chunk), tự xóa sau 7 ngày
resource "google_storage_bucket" "connector_ingest" {
  name                        = "${var.project_prefix}-connector-ingest-${var.project_id}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  depends_on = [google_kms_crypto_key_iam_member.gcs_cmek, google_project_service.apis]

  labels = {
    component = "connectors"
    owner     = "tv3"
  }

  encryption {
    default_kms_key_name = var.kms_key_id
  }

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket_iam_member" "connector_ingest" {
  bucket = google_storage_bucket.connector_ingest.name
  role   = "roles/storage.objectUser"
  member = google_service_account.data_sa["connector-worker"].member
}

# Bucket workspace cho staging: dữ liệu giả, tự xóa sau 30 ngày
resource "google_storage_bucket" "workspace_staging" {
  count                       = var.enable_staging ? 1 : 0
  name                        = "${var.project_prefix}-workspaces-staging-${var.project_id}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = true

  labels = {
    component = "object_storage"
    owner     = "tv3"
    env       = "staging"
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

# ------------------------------------------------------------------------------
# 3. MEMORYSTORE FOR REDIS: STANDARD_HA (primary + replica khác zone, H7)
# ------------------------------------------------------------------------------
# Cache phiên (2.000 phiên đồng thời), ngữ cảnh hội thoại gần nhất, cache kết quả RAG,
# bộ đếm quota/rate limit theo user, cờ hủy tác vụ agent.
# Chọn 5 GB: bậc giá M2 (5-10 GB) rẻ hơn mỗi GB so với M1 (1-4 GB) => 5 GB rẻ hơn 4 GB.
resource "google_redis_instance" "redis_ha" {
  name           = "${var.project_prefix}-redis-cache"
  tier           = "STANDARD_HA"
  memory_size_gb = var.redis_memory_size_gb

  region                  = var.region
  authorized_network      = var.vpc_id
  connect_mode            = "PRIVATE_SERVICE_ACCESS"
  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION" # TLS trong VPC (H5)

  redis_version = "REDIS_7_2"
  display_name  = "VBot Redis Cache HA"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 19
        minutes = 0
      }
    }
  }

  labels = {
    component = "cache_queue"
    owner     = "tv3"
  }

  depends_on = [var.private_vpc_connection]
}

# ------------------------------------------------------------------------------
# 4. CLOUD TASKS: HÀNG ĐỢI AGENT CHẠY NỀN (H6) VÀ ĐỒNG BỘ CONNECTOR
# ------------------------------------------------------------------------------
# Agent cấp 4: 132.000 tác vụ/tháng, mỗi tác vụ tách ~6 bước. Mỗi bước có
# idempotency key; hủy tác vụ = DeleteTask + cờ cancel:{task_id} trong Redis.
resource "google_cloud_tasks_queue" "agent_task_queue" {
  name     = "${var.project_prefix}-agent-queue"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 10 # Peak ~3,5 RPS x 12% cấp 4 x 6 bước, dư 4x
    max_concurrent_dispatches = 50
  }

  retry_config {
    max_attempts       = 3
    max_retry_duration = "600s" # Không retry quá 10 phút (H6)
    min_backoff        = "5s"
    max_backoff        = "60s"
    max_doublings      = 3
  }

  stackdriver_logging_config {
    sampling_ratio = 1.0 # Log mọi lần dispatch để audit hành động của agent
  }
}

# Đồng bộ connector: tốc độ thấp, backoff dài để tôn trọng rate limit của SaaS (HTTP 429)
resource "google_cloud_tasks_queue" "connector_sync_queue" {
  name     = "${var.project_prefix}-connector-sync-queue"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 5
    max_concurrent_dispatches = 20
  }

  retry_config {
    max_attempts       = 5
    max_retry_duration = "3600s"
    min_backoff        = "10s"
    max_backoff        = "300s"
    max_doublings      = 5
  }

  stackdriver_logging_config {
    sampling_ratio = 0.1
  }
}

resource "google_cloud_tasks_queue_iam_member" "enqueuer" {
  for_each = {
    agent-data-api        = { queue = google_cloud_tasks_queue.agent_task_queue.name, sa = "data-api" }
    sync-connector-worker = { queue = google_cloud_tasks_queue.connector_sync_queue.name, sa = "connector-worker" }
    sync-data-api         = { queue = google_cloud_tasks_queue.connector_sync_queue.name, sa = "data-api" }
  }
  name     = each.value.queue
  location = var.region
  role     = "roles/cloudtasks.enqueuer"
  member   = google_service_account.data_sa[each.value.sa].member
}

# ------------------------------------------------------------------------------
# 5. PUB/SUB: NHẬN THÔNG BÁO THAY ĐỔI TỪ SAAS (connectors)
# ------------------------------------------------------------------------------
# Gmail/Drive push (users.watch, changes.watch) bắn vào topic này; M365 Graph,
# Jira, Confluence, Notion webhook đi qua LB -> connector-gateway rồi publish vào đây.
resource "google_pubsub_topic" "connector_events" {
  name                       = "${var.project_prefix}-connector-events"
  message_retention_duration = "86400s"
  depends_on                 = [google_project_service.apis]

  labels = {
    component = "connectors"
    owner     = "tv3"
  }
}

resource "google_pubsub_topic" "connector_events_dlq" {
  name       = "${var.project_prefix}-connector-events-dlq"
  depends_on = [google_project_service.apis]
}

resource "google_pubsub_subscription" "connector_worker" {
  name                       = "${var.project_prefix}-connector-worker-sub"
  topic                      = google_pubsub_topic.connector_events.id
  ack_deadline_seconds       = 60
  message_retention_duration = "86400s"

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.connector_events_dlq.id
    max_delivery_attempts = 10
  }
}

resource "google_pubsub_subscription_iam_member" "connector_worker" {
  subscription = google_pubsub_subscription.connector_worker.name
  role         = "roles/pubsub.subscriber"
  member       = google_service_account.data_sa["connector-worker"].member
}

resource "google_pubsub_topic_iam_member" "publishers" {
  for_each = {
    gmail-push       = "serviceAccount:gmail-api-push@system.gserviceaccount.com" # bắt buộc cho Gmail users.watch
    connector-worker = google_service_account.data_sa["connector-worker"].member
  }
  topic  = google_pubsub_topic.connector_events.name
  role   = "roles/pubsub.publisher"
  member = each.value
}

# Pub/Sub service agent cần quyền chuyển message lỗi sang DLQ
resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  topic  = google_pubsub_topic.connector_events_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.this.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_subscription_iam_member" "dlq_subscriber" {
  subscription = google_pubsub_subscription.connector_worker.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.this.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# ------------------------------------------------------------------------------
# 6. CLOUD SCHEDULER: DELTA SYNC CONNECTOR + BẬT/TẮT STAGING DB
# ------------------------------------------------------------------------------
# Delta sync 15 phút/lần trong giờ hành chính cho SaaS không có push đầy đủ
# (Notion, Confluence) và để vá event bị lỡ (Gmail/Drive/Graph/Jira).
resource "google_cloud_scheduler_job" "connector_delta_sync" {
  for_each  = toset(local.connectors)
  name      = "${var.project_prefix}-sync-${each.key}"
  region    = var.region
  schedule  = "*/15 8-17 * * 1-5"
  time_zone = "Asia/Ho_Chi_Minh"

  pubsub_target {
    topic_name = google_pubsub_topic.connector_events.id
    data       = base64encode(jsonencode({ type = "delta_sync_tick", connector = each.key }))
  }

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "scheduler_sql" {
  count        = var.enable_staging ? 1 : 0
  account_id   = "${var.project_prefix}-sched-sql"
  display_name = "Cloud Scheduler bat/tat staging Cloud SQL"
}

resource "google_project_iam_member" "scheduler_sql_editor" {
  count   = var.enable_staging ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.editor"
  member  = google_service_account.scheduler_sql[0].member
}

resource "google_cloud_scheduler_job" "staging_db_power" {
  for_each = var.enable_staging ? {
    start = { schedule = "45 7 * * 1-5", policy = "ALWAYS" }
    stop  = { schedule = "15 18 * * 1-5", policy = "NEVER" }
  } : {}
  name      = "${var.project_prefix}-staging-db-${each.key}"
  region    = var.region
  schedule  = each.value.schedule
  time_zone = "Asia/Ho_Chi_Minh"

  http_target {
    http_method = "PATCH"
    uri         = "https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${google_sql_database_instance.postgres_staging[0].name}"
    body        = base64encode(jsonencode({ settings = { activationPolicy = each.value.policy } }))
    headers     = { "Content-Type" = "application/json" }

    oauth_token {
      service_account_email = google_service_account.scheduler_sql[0].email
    }
  }

  depends_on = [google_project_service.apis]
}
