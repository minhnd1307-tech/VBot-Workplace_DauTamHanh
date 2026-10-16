# ==============================================================================
# ROOT MODULE VARIABLES: VBOT WORKPLACE
# ==============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID thuc te cua nhom"
  default     = "vbot-workplace-capstone"
}

variable "project_prefix" {
  type        = string
  description = "Tien to dat ten tai nguyen"
  default     = "vbot-prod"
}

variable "region" {
  type        = string
  description = "Region Google Cloud chinh (Singapore)"
  default     = "asia-southeast1"
}

variable "zones" {
  type        = list(string)
  description = "3 Availability Zone cho GKE (Multi-AZ - H7)"
  default     = ["asia-southeast1-a", "asia-southeast1-b", "asia-southeast1-c"]
}

variable "domains" {
  type        = list(string)
  description = "Ten mien public cua VBot (chung chi TLS Google-managed)"
  default     = ["vbot.example.com"]
}

variable "rate_limit_per_ip_per_minute" {
  type        = number
  description = "Nguong Cloud Armor rate limit moi IP/phut"
  default     = 6000
}

variable "master_authorized_cidrs" {
  type = list(object({
    cidr_block   = string
    display_name = string
  }))
  description = "Dai IP duoc truy cap Kubernetes API"
  default     = []
}

# --- Sizing compute (cap nhat theo bang sizing cua TV2 / so pod cua TV3, TV4) ---
variable "app_node_machine_type" {
  type        = string
  description = "Loai may node pool ung dung"
  default     = "e2-standard-4"
}

variable "app_min_nodes_per_zone" {
  type        = number
  description = "So node toi thieu moi zone (ngoai gio)"
  default     = 1
}

variable "app_max_nodes_per_zone" {
  type        = number
  description = "So node toi da moi zone (gio cao diem)"
  default     = 2
}

# Khong de mat khau mac dinh trong code: truyen qua terraform.tfvars (khong commit)
# hoac bien moi truong TF_VAR_db_password
variable "db_password" {
  type        = string
  description = "Mat khau cho Cloud SQL Database"
  sensitive   = true
}
