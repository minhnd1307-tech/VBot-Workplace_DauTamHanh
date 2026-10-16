# ==============================================================================
# ROOT MODULE MAIN: VBOT WORKPLACE PRODUCTION ARCHITECTURE (GCP)
# Phụ trách kết nối: Thành viên 1 (Lead / Platform & Infra)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    # google-beta: bắt buộc cho node_config.sandbox_config (GKE Sandbox gVisor) của TV4
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# 1. MODULE AI GATEWAY & APIS (TV2) - bật Vertex AI, GKE, SQL, Redis... APIs
module "ai_gateway" {
  source         = "./modules/ai_gateway"
  project_id     = var.project_id
  project_prefix = var.project_prefix
  region         = var.region
}

# 2. MODULE NETWORK, LB EDGE & WAF (TV1)
module "network" {
  source                       = "./modules/network"
  project_id                   = var.project_id
  project_prefix               = var.project_prefix
  region                       = var.region
  domains                      = var.domains
  rate_limit_per_ip_per_minute = var.rate_limit_per_ip_per_minute
}

# 3. MODULE GKE CLUSTER, APP & STAGING NODE POOLS (TV1)
module "gke" {
  source                  = "./modules/gke"
  project_id              = var.project_id
  project_prefix          = var.project_prefix
  region                  = var.region
  zones                   = var.zones
  vpc_name                = module.network.vpc_name
  subnet_name             = module.network.subnet_name
  pod_range_name          = module.network.pod_range_name
  service_range_name      = module.network.service_range_name
  master_authorized_cidrs = var.master_authorized_cidrs
  app_node_machine_type   = var.app_node_machine_type
  min_nodes               = var.app_min_nodes_per_zone
  max_nodes               = var.app_max_nodes_per_zone

  # container.googleapis.com được bật trong module ai_gateway
  depends_on = [module.ai_gateway]
}

# 4. MODULE SECURITY, SANDBOX (gVisor), KMS, SECRET MANAGER (TV4)
module "security_sandbox" {
  source         = "./modules/security_sandbox"
  project_id     = var.project_id
  project_prefix = var.project_prefix
  region         = var.region
  cluster_name   = module.gke.cluster_name

  providers = {
    google      = google
    google-beta = google-beta
  }
}

# 5. MODULE DATA (Cloud SQL HA pgvector, GCS Workspaces, Redis HA, Cloud Tasks) (TV3)
module "data" {
  source                 = "./modules/data"
  project_id             = var.project_id
  project_prefix         = var.project_prefix
  region                 = var.region
  vpc_id                 = module.network.vpc_id
  private_vpc_connection = module.network.private_vpc_connection
  kms_key_id             = module.security_sandbox.kms_key_id
  workload_identity_pool = module.gke.workload_identity_pool
  db_password            = var.db_password
}
