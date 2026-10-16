# ==============================================================================
# MODULE: NETWORK (VPC, Subnets, Cloud NAT, Cloud Armor WAF)
# Phụ trách: Thành viên 1 (Lead / Platform & Infra)
# ==============================================================================

resource "google_compute_network" "vpc" {
  name                    = "${var.project_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

# Subnet chính cho cụm GKE và workload ứng dụng (Multi-AZ)
resource "google_compute_subnetwork" "gke_subnet" {
  name                     = "${var.project_prefix}-gke-subnet"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  # Dải IP phụ dành riêng cho GKE VPC-native (Pods & Services)
  secondary_ip_range {
    range_name    = "pod-ranges"
    ip_cidr_range = var.pod_cidr
  }

  secondary_ip_range {
    range_name    = "service-ranges"
    ip_cidr_range = var.service_cidr
  }
}

# Cấu hình Private Service Access (Dành riêng cho Cloud SQL và Memorystore Redis)
resource "google_compute_global_address" "private_ip_address" {
  name          = "${var.project_prefix}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# Cloud Router & Cloud NAT: Cho phép Private Nodes/Pods đi ra ngoài internet an toàn (tải package, gọi SaaS)
resource "google_compute_router" "router" {
  name    = "${var.project_prefix}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.project_prefix}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Cloud Armor: WAF bảo vệ tầng ứng dụng, chống DDoS và giới hạn Rate Limiting
resource "google_compute_security_policy" "waf_policy" {
  name        = "${var.project_prefix}-waf-policy"
  description = "Cloud Armor WAF Policy chong DDoS va Rate Limiting cho VBot Gateway"

  # Quy tắc mặc định: Allow traffic hợp lệ
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  # Quy tắc 1: Rate Limiting chống Brute-force & DDoS vào API Gateway (H6)
  rule {
    action   = "rate_based_ban"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 300
    }
    description = "Gioi han 100 requests/phut tren moi IP"
  }
}
