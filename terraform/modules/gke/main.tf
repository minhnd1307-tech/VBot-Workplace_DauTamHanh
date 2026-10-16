# ==============================================================================
# MODULE: GKE (Google Kubernetes Engine - Cluster & Application Node Pool)
# Phụ trách: Thành viên 1 (Lead / Platform & Infra)
# ==============================================================================

resource "google_container_cluster" "primary" {
  name     = "${var.project_prefix}-gke-cluster"
  location = var.region # Regional cluster trai dai 3 Availability Zones (Multi-AZ dap ung H7)

  # Xoa default node pool ngay sau khi tao de quan ly bang custom node pool rieng
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = var.vpc_name
  subnetwork = var.subnet_name

  # Kich hoat VPC-native networking
  ip_allocation_policy {
    cluster_secondary_range_name  = "pod-ranges"
    services_secondary_range_name = "service-ranges"
  }

  # Cluster Private: Khong cap IP public cho cac Worker Node (Tang tinh bao mat)
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = var.master_ipv4_cidr
  }

  # Kich hoat Workload Identity (GCP Best Practice - Loai bo service account key cung)
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Kich hoat Network Policy (Calico hoac Datapath v2)
  network_policy {
    enabled  = true
    provider = "PROVIDER_UNSPECIFIED"
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }

  # Cua so bao tri dinh ky vao ban dem (tranh gio hanh chinh 8h-18h T2-T6)
  maintenance_policy {
    daily_maintenance_window {
      start_time = "18:00" # 01:00 AM gio Viet Nam (GMT+7)
    }
  }
}

# Node Pool 1: System & General Applications (Gateway, Microservices, Connectors)
resource "google_container_node_pool" "app_pool" {
  name       = "${var.project_prefix}-app-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.initial_node_count

  # Autoscaling: Co gian tu dong theo gio cao diem & gio thap diem
  autoscaling {
    min_node_count = var.min_nodes
    max_node_count = var.max_nodes
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.app_node_machine_type # e2-standard-4 (4 vCPU, 16 GB RAM)
    disk_size_gb = 50
    disk_type    = "pd-standard"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

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
