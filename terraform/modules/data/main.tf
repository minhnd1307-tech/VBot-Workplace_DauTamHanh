# ==============================================================================
# MODULE: DATA & STORAGE (Cloud SQL PostgreSQL HA + pgvector, GCS, Redis, Cloud Tasks)
# Phụ trách: Thành viên 3 (Data, Workspace & Connectors Specialist)
# ==============================================================================

# 1. CLOUD SQL FOR POSTGRESQL (Multi-AZ HA & pgvector) - Thỏa mãn H7 & H3
# Cung cấp CSDL quan hệ chính (metadata, chat history, authz ACL) và Vector DB
resource "google_sql_database_instance" "postgres_ha" {
  name             = "${var.project_prefix}-pg-ha"
  database_version = "POSTGRES_15"
  region           = var.region

  depends_on = [var.private_vpc_connection]

  settings {
    tier              = var.db_tier # db-custom-4-16384 (4 vCPU, 16 GB RAM)
    availability_type = "REGIONAL"  # BẬT MULTI-AZ HIGH AVAILABILITY (Tự động failover sang Zone khác nếu mất điện)
    disk_size         = var.db_disk_size_gb
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    # Cờ bật extension pgvector để lưu trữ và tìm kiếm vector trực tiếp trong PostgreSQL
    database_flags {
      name  = "cloudsql.enable_pgvector"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled    = false # Hoàn toàn dùng Private IP trong mạng nội bộ
      private_network = var.vpc_id
    }

    # Backup tự động hàng ngày, bật Point-In-Time-Recovery (PITR) cam kết RPO <= 1h (H7)
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "19:00" # 02:00 AM giờ Việt Nam
      transaction_log_retention_days = 7
    }

    maintenance_window {
      day          = 7 # Chủ Nhật
      hour         = 20
      update_track = "stable"
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "vbot_db" {
  name     = "vbot_production"
  instance = google_sql_database_instance.postgres_ha.name
}

resource "google_sql_user" "vbot_user" {
  name     = "vbot_app"
  instance = google_sql_database_instance.postgres_ha.name
  password = var.db_password
}

# 2. CLOUD STORAGE (GCS) - KHÔNG GIAN RIÊNG TƯ TỪNG USER (H3)
# Quota 10GB/user, mã hóa bằng KMS (CMEK), cô lập dữ liệu theo Prefix user-workspaces/{user_id}/
resource "google_storage_bucket" "workspace_bucket" {
  name                        = "${var.project_prefix}-workspaces-${var.project_id}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  # Mã hóa dữ liệu lưu trữ bằng khóa Cloud KMS riêng biệt (H5)
  encryption {
    default_kms_key_name = var.kms_key_id
  }

  # Lifecycle Rules: Tự động chuyển file cũ không truy cập sau 90 ngày sang Nearline để tiết kiệm chi phí
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 3
    }
    action {
      type = "Delete"
    }
  }
}

# 3. MEMORYSTORE FOR REDIS (Cache hội thoại & Agent Session State)
resource "google_redis_instance" "redis_ha" {
  name           = "${var.project_prefix}-redis-cache"
  tier           = "STANDARD_HA" # Multi-AZ High Availability với replica dự phòng nóng (H7)
  memory_size_gb = var.redis_memory_size_gb

  region                  = var.region
  authorized_network      = var.vpc_id
  connect_mode            = "PRIVATE_SERVICE_ACCESS"
  transit_encryption_mode = "DISABLED"

  redis_version = "REDIS_7_0"
  display_name  = "VBot Redis Cache HA"

  depends_on = [var.private_vpc_connection]
}

# 4. CLOUD TASKS QUEUE (Hàng đợi tác vụ bất đồng bộ cho Agent chạy nền)
# Quản lý hàng đợi tác vụ Cấp 4, giới hạn tốc độ và retry, cam kết xong trong 10 phút (H6)
resource "google_cloud_tasks_queue" "agent_task_queue" {
  name     = "${var.project_prefix}-agent-queue"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 50
    max_concurrent_dispatches = 100
  }

  retry_config {
    max_attempts       = 3
    max_retry_duration = "600s" # Tối đa 10 phút theo đúng Ràng buộc H6
    min_backoff        = "5s"
    max_backoff        = "30s"
  }
}
