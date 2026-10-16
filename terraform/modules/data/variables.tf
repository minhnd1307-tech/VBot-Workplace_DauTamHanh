variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "project_prefix" {
  type        = string
  description = "Prefix dat ten tai nguyen"
  default     = "vbot-prod"
}

variable "region" {
  type        = string
  description = "Region Google Cloud"
  default     = "asia-southeast1"
}

variable "vpc_id" {
  type        = string
  description = "VPC Network ID (Cloud SQL, Redis chi co Private IP trong VPC nay)"
}

variable "private_vpc_connection" {
  description = "Dependency: Private Service Access phai san sang truoc khi tao Cloud SQL/Redis"
}

variable "kms_key_id" {
  type        = string
  description = "Cloud KMS CryptoKey ID (TV4) dung lam CMEK cho bucket GCS"
}

variable "workload_identity_pool" {
  type        = string
  description = "Workload Identity Pool cua GKE (vd: <project>.svc.id.goog), lay tu module gke"
}

variable "k8s_namespace" {
  type        = string
  description = "Namespace Kubernetes chua workspace-svc, data-api, connector-worker"
  default     = "vbot"
}

# --- Sizing (bang sizing TV2 + uoc luong TV3, xem TV3_DATA_WORKSPACE_CONNECTORS.md) ---
variable "db_tier" {
  type        = string
  description = "Tier Cloud SQL prod: 4 vCPU, 16 GB RAM (HNSW index ~3 GB nam tron trong RAM)"
  default     = "db-custom-4-16384"
}

variable "db_disk_size_gb" {
  type        = number
  description = "SSD Cloud SQL: chat 12 thang ~145 GB + vector ~6 GB + metadata, lam tron 200 GB"
  default     = 200
}

variable "db_disk_autoresize_limit_gb" {
  type        = number
  description = "Tran tu dong tang dung luong o dia (chan chi phi vuot kiem soat)"
  default     = 500
}

variable "staging_db_tier" {
  type        = string
  description = "Tier Cloud SQL staging (zonal)"
  default     = "db-custom-1-3840"
}

variable "enable_staging" {
  type        = bool
  description = "Tao Cloud SQL + bucket cho moi truong staging"
  default     = true
}

variable "deletion_protection" {
  type        = bool
  description = "Chan xoa nham Cloud SQL prod"
  default     = true
}

# Khong co default: truyen qua terraform.tfvars (da gitignore) hoac TF_VAR_db_password
variable "db_password" {
  type        = string
  description = "Mat khau user quan tri vbot_admin (chi dung cho migration)"
  sensitive   = true
}

variable "redis_memory_size_gb" {
  type        = number
  description = "Dung luong Redis Standard HA (GB). 5 GB thuoc bac gia M2, re hon 4 GB (bac M1)"
  default     = 5
}
