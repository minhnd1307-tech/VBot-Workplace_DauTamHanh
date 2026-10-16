# ==============================================================================
# ROOT MODULE MAIN: VBOT WORKPLACE PRODUCTION ARCHITECTURE (GCP)
# Phụ trách kết nối: Thành viên 1 (Lead / Platform & Infra)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. MODULE AI GATEWAY & APIS (TV2)
module "ai_gateway" {
  source         = "./modules/ai_gateway"
  project_id     = var.project_id
  project_prefix = var.project_prefix
  region         = var.region
}

# 2. MODULE NETWORK & WAF (TV1)
module "network" {
  source         = "./modules/network"
  project_prefix = var.project_prefix
  region         = var.region
}

# 3. MODULE GKE CLUSTER & APP NODES (TV1)
module "gke" {
  source         = "./modules/gke"
  project_id     = var.project_id
  project_prefix = var.project_prefix
  region         = var.region
  vpc_name       = module.network.vpc_name
  subnet_name    = module.network.subnet_name
}

# 4. MODULE SECURITY, SANDBOX (gVisor), KMS, SECRET MANAGER (TV4)
module "security_sandbox" {
  source         = "./modules/security_sandbox"
  project_id     = var.project_id
  project_prefix = var.project_prefix
  region         = var.region
  cluster_name   = module.gke.cluster_name
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
  db_password            = var.db_password
}
