# ==============================================================================
# MODULE: NETWORK (VPC, Subnet, Private Service Access, Cloud NAT, LB edge, Cloud Armor WAF)
# Phụ trách: Thành viên 1 (Lead / Platform & Infra)
# Component báo giá: network, load_balancer
# ==============================================================================

# 0. Bật các API mạng mà module này cần (Compute, Service Networking cho Private IP của Cloud SQL/Redis)
resource "google_project_service" "network_apis" {
  for_each           = toset(["compute.googleapis.com", "servicenetworking.googleapis.com"])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_compute_network" "vpc" {
  name                    = "${var.project_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  depends_on = [google_project_service.network_apis]
}

# Subnet chính cho GKE. Trên GCP subnet là tài nguyên REGIONAL: 1 subnet phủ cả 3 zone
# asia-southeast1-a/b/c, nên node ở 3 AZ dùng chung dải IP này (Multi-AZ - H7).
resource "google_compute_subnetwork" "gke_subnet" {
  name          = "${var.project_prefix}-gke-subnet"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id

  # Private Google Access: node không có IP public vẫn gọi được Vertex AI, Artifact Registry,
  # Cloud Storage... qua mạng nội bộ Google, không đi qua NAT/Internet (H1 - kênh private tới API model).
  private_ip_google_access = true

  # Dải IP phụ cho GKE VPC-native (Pods & Services)
  secondary_ip_range {
    range_name    = "pod-ranges"
    ip_cidr_range = var.pod_cidr
  }

  secondary_ip_range {
    range_name    = "service-ranges"
    ip_cidr_range = var.service_cidr
  }
}

# Private Service Access (dùng cho Cloud SQL và Memorystore Redis của TV3 - chỉ có Private IP)
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

# Firewall: cho phép health check của Google Front End tới node (LB của GKE Ingress/Gateway)
resource "google_compute_firewall" "allow_health_checks" {
  name      = "${var.project_prefix}-allow-health-checks"
  network   = google_compute_network.vpc.id
  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
  }

  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
}

# Firewall: chỉ cho phép lưu lượng nội bộ trong subnet/pod/service range
resource "google_compute_firewall" "allow_internal" {
  name      = "${var.project_prefix}-allow-internal"
  network   = google_compute_network.vpc.id
  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
  }
  allow {
    protocol = "udp"
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = [var.subnet_cidr, var.pod_cidr, var.service_cidr]
}

# Cloud Router & Cloud NAT: node/pod private đi ra internet có kiểm soát (gọi API SaaS connectors:
# Google Workspace, Microsoft 365, Notion, Jira, Confluence). Cloud NAT là dịch vụ managed regional,
# không phải SPOF (H7).
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
  min_ports_per_vm                   = 256

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ------------------------------------------------------------------------------
# EDGE CHO GLOBAL EXTERNAL APPLICATION LOAD BALANCER
# LB được GKE Gateway/Ingress controller tạo; Terraform giữ trước IP tĩnh, chứng chỉ TLS,
# SSL policy và Cloud Armor policy để manifest Kubernetes tham chiếu theo tên.
# ------------------------------------------------------------------------------

# IP anycast toàn cầu cho LB (không tính phí riêng khi đã gắn vào forwarding rule)
resource "google_compute_global_address" "lb_ip" {
  name = "${var.project_prefix}-lb-ip"
}

# Chứng chỉ TLS do Google quản lý, tự gia hạn
resource "google_compute_managed_ssl_certificate" "lb_cert" {
  name = "${var.project_prefix}-lb-cert"

  managed {
    domains = var.domains
  }
}

# Mã hóa lúc truyền (H5): bắt buộc TLS 1.2 trở lên
resource "google_compute_ssl_policy" "tls_policy" {
  name            = "${var.project_prefix}-tls12-policy"
  profile         = "MODERN"
  min_tls_version = "TLS_1_2"
}

# Cloud Armor Standard: WAF (OWASP SQLi/XSS) + rate limiting trước LB
resource "google_compute_security_policy" "waf_policy" {
  name        = "${var.project_prefix}-waf-policy"
  description = "Cloud Armor WAF chong SQLi/XSS va rate limiting cho VBot frontend/gateway"

  # Quy tắc 1: Chặn SQL injection (OWASP CRS)
  rule {
    action   = "deny(403)"
    priority = 900
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})"
      }
    }
    description = "OWASP CRS - SQL injection"
  }

  # Quy tắc 2: Chặn XSS (OWASP CRS)
  rule {
    action   = "deny(403)"
    priority = 910
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': 1})"
      }
    }
    description = "OWASP CRS - Cross-site scripting"
  }

  # Quy tắc 3: Rate limit theo IP. Nhân viên đi ra từ vài IP NAT văn phòng nên ngưỡng đặt cao;
  # quota theo từng user/đơn vị được áp ở LLM gateway (H8 - TV2).
  rule {
    action   = "rate_based_ban"
    priority = 1000
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
        count        = var.rate_limit_per_ip_per_minute
        interval_sec = 60
      }
      ban_duration_sec = 300
    }
    description = "Rate limit theo IP, chong DDoS tang ung dung va brute-force"
  }

  # Quy tắc mặc định: cho phép traffic hợp lệ
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }
}
