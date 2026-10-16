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

variable "cluster_name" {
  type        = string
  description = "Ten GKE Cluster can attach Sandbox Node Pool"
}

variable "sandbox_machine_type" {
  type        = string
  description = "Loai may cho Sandbox Node Pool"
  default     = "c2-standard-4"
}

variable "sandbox_initial_nodes" {
  type        = number
  description = "So node sandbox ban dau moi zone (khoi dong 0 node, co ve 0 ngoai gio)"
  default     = 0
}

variable "sandbox_min_nodes" {
  type        = number
  description = "So node sandbox toi thieu moi zone (scale ve 0 khi khong co job de tiet kiem)"
  default     = 0
}

variable "sandbox_max_nodes" {
  type        = number
  description = "So node sandbox toi da moi zone"
  default     = 2
}
