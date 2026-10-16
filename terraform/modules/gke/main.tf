# ==============================================================================
# MODULE: GKE (Regional Private Cluster 3 AZ, App Node Pool, Staging Node Pool)
# Phụ trách: Thành viên 1 (Lead / Platform & Infra)
# Component báo giá: compute (+ staging của cicd)
# ==============================================================================

# Service account riêng cho node, quyền tối thiểu (không dùng default compute SA quyền Editor)
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.project_prefix}-gke-nodes"
  display_name = "VBot GKE node service account (least privilege)"
}

resource "google_project_iam_member" "gke_nodes_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader",
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_container_cluster" "primary" {
  name     = "${var.project_prefix}-gke-cluster"
  location = var.region # Regional cluster: control plane được Google nhân bản qua 3 zone (H7)

  # Node trải đều 3 Availability Zone
  node_locations = var.zones

  # Xóa default node pool ngay sau khi tạo, quản lý bằng node pool riêng
  remove_default_node_pool = true
  initial_node_count       = 1
  deletion_protection      = var.deletion_protection

  network    = var.vpc_name
  subnetwork = var.subnet_name

  release_channel {
    channel = "REGULAR"
  }

  # VPC-native networking
  ip_allocation_policy {
    cluster_secondary_range_name  = var.pod_range_name
    services_secondary_range_name = var.service_range_name
  }

  # Dataplane V2 (eBPF): thực thi Kubernetes NetworkPolicy - sandbox-network-policy.yaml của TV4
  datapath_provider = "ADVANCED_DATAPATH"

  # Private cluster: worker node không có IP public
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = var.master_ipv4_cidr
  }

  # Chỉ các dải IP được phép (VPN công ty, runner CI) mới gọi được Kubernetes API
  dynamic "master_authorized_networks_config" {
    for_each = length(var.master_authorized_cidrs) > 0 ? [1] : []
    content {
      dynamic "cidr_blocks" {
        for_each = var.master_authorized_cidrs
        content {
          cidr_block   = cidr_blocks.value.cidr_block
          display_name = cidr_blocks.value.display_name
        }
      }
    }
  }

  # Workload Identity: pod dùng IAM qua KSA, không cần service account key
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Autoscaler ưu tiên gom pod, scale down nhanh ngoài giờ hành chính (FinOps)
  cluster_autoscaling {
    autoscaling_profile = "OPTIMIZE_UTILIZATION"
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }

  # Bảo trì định kỳ ban đêm: 18:00 UTC = 01:00 GMT+7, ngoài giờ hành chính 8h-18h
  maintenance_policy {
    daily_maintenance_window {
      start_time = "18:00"
    }
  }
}

# ------------------------------------------------------------------------------
# NODE POOL 1 - PRODUCTION APP: web/API, LLM gateway, orchestrator, connector workers,
# RAG indexer, agent workers. Sizing theo bảng của TV2 (peak 3,5 RPS -> 4 node e2-standard-4).
# Giới hạn tính trên TOÀN pool (total_*), không phải mỗi zone:
#   Ngoài giờ hành chính: var.total_min_nodes = 1 node (giữ control loop, job nền)
#   Giờ hành chính: CronJob nâng replica lúc 07:45 + topologySpreadConstraints theo zone
#   -> autoscaler bật thêm 1 node mỗi zone, tổng 4 node trải 3 AZ (H7), 18:15 trả về 1 node.
# ------------------------------------------------------------------------------
resource "google_container_node_pool" "app_pool" {
  name               = "${var.project_prefix}-app-node-pool"
  location           = var.region
  cluster            = google_container_cluster.primary.name
  node_locations     = var.zones
  initial_node_count = 1

  autoscaling {
    total_min_node_count = var.total_min_nodes
    total_max_node_count = var.total_max_nodes
    location_policy      = "BALANCED"
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  node_config {
    machine_type    = var.app_node_machine_type # e2-standard-4 (4 vCPU, 16 GB RAM)
    disk_size_gb    = var.node_disk_size_gb
    disk_type       = "pd-standard"
    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    # Chặn pod đọc metadata server của node, chỉ lộ metadata của Workload Identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      role        = "application"
      environment = "production"
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }
}

# ------------------------------------------------------------------------------
# NODE POOL 2 - STAGING: dùng chung cluster với prod (không tốn thêm phí quản lý cluster),
# tách bằng namespace "staging" + taint, chạy Spot VM ở 1 zone. Ngoài giờ hành chính
# workload staging được scale về 0 nên autoscaler tắt node (min 0).
# ------------------------------------------------------------------------------
resource "google_container_node_pool" "staging_pool" {
  name               = "${var.project_prefix}-staging-pool"
  location           = var.region
  cluster            = google_container_cluster.primary.name
  node_locations     = [var.zones[0]]
  initial_node_count = 1

  autoscaling {
    min_node_count = 0
    max_node_count = var.staging_max_nodes
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type    = var.staging_node_machine_type
    disk_size_gb    = var.node_disk_size_gb
    disk_type       = "pd-standard"
    spot            = true
    service_account = google_service_account.gke_nodes.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Chỉ pod có toleration env=staging mới được xếp lên pool này
    taint {
      key    = "env"
      value  = "staging"
      effect = "NO_SCHEDULE"
    }

    labels = {
      role        = "staging"
      environment = "staging"
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }
}
