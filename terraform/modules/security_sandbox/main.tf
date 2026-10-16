# ==============================================================================
# MODULE: SECURITY & SANDBOX (GKE Sandbox gVisor, KMS, Secret Manager, Cloud DLP)
# Phụ trách: Thành viên 4 (Security, Sandbox, Governance & Reliability)
# ==============================================================================

# 1. GKE SANDBOX NODE POOL (gVisor) - Thỏa mãn Ràng buộc cứng H3
# Mỗi container chạy code của Agent được cô lập tuyệt đối ở tầng kernel bằng gVisor
resource "google_container_node_pool" "sandbox_pool" {
  provider   = google-beta # sandbox_config (gVisor) chi co trong provider google-beta
  name       = "${var.project_prefix}-sandbox-pool"
  location   = var.region
  cluster    = var.cluster_name
  node_count = var.sandbox_initial_nodes

  autoscaling {
    min_node_count = 1
    max_node_count = var.sandbox_max_nodes
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.sandbox_machine_type # c2-standard-4 (Compute-optimized chay code agent)
    disk_size_gb = 50
    disk_type    = "pd-balanced"

    # CỜ BẬT GKE SANDBOX (GVISOR RUNTIME)
    sandbox_config {
      sandbox_type = "gvisor"
    }

    # Taint de ngan khong cho cac pod thong thuong chay vao node sandbox
    taint {
      key    = "sandbox.gke.io/runtime"
      value  = "gvisor"
      effect = "NO_SCHEDULE"
    }

    labels = {
      role        = "sandbox-execution"
      environment = "production"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    metadata = {
      disable-legacy-endpoints = "true"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }
}

# 2. CLOUD KMS (Key Management Service) - Thỏa mãn Ràng buộc cứng H2 & H5
# Quản lý khóa mã hóa khách hàng (CMEK) cho Workspace GCS và Secret Manager
resource "google_kms_key_ring" "keyring" {
  name     = "${var.project_prefix}-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "vbot_key" {
  name            = "${var.project_prefix}-crypto-key"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s" # Tu dong xoay khoa dinh ky 90 ngay (Enterprise Security)

  lifecycle {
    prevent_destroy = false
  }
}

# 3. SECRET MANAGER - Lưu trữ an toàn OAuth Refresh Tokens của 2.000 User (H2)
resource "google_secret_manager_secret" "oauth_token_vault" {
  secret_id = "${var.project_prefix}-user-oauth-vault"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  labels = {
    purpose = "oauth-token-storage"
    owner   = "vbot-platform"
  }
}

# 4. CLOUD SENSITIVE DATA PROTECTION (DLP API) - Thỏa mãn Ràng buộc cứng H5
# Template tu dong phat hien va che giau PII (Email, Phone, Credit Card, ID)
resource "google_data_loss_prevention_inspect_template" "pii_inspect_template" {
  parent       = "projects/${var.project_id}/locations/${var.region}"
  description  = "DLP Template phat hien va che PII truoc khi gui prompt sang LLM hoac luu log"
  display_name = "VBot PII Masking Template"

  inspect_config {
    info_types {
      name = "EMAIL_ADDRESS"
    }
    info_types {
      name = "PHONE_NUMBER"
    }
    info_types {
      name = "CREDIT_CARD_NUMBER"
    }
    info_types {
      name = "PERSON_NAME"
    }

    min_likelihood = "LIKELY"

    limits {
      max_findings_per_item    = 10
      max_findings_per_request = 50
    }
  }
}
