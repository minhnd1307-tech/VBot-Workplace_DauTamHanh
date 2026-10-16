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

variable "zones" {
  type        = list(string)
  description = "3 Availability Zone cua region (Multi-AZ - H7)"
  default     = ["asia-southeast1-a", "asia-southeast1-b", "asia-southeast1-c"]
}

variable "vpc_name" {
  type        = string
  description = "Ten VPC"
}

variable "subnet_name" {
  type        = string
  description = "Ten Subnet"
}

variable "pod_range_name" {
  type        = string
  description = "Ten secondary range cho Pods"
  default     = "pod-ranges"
}

variable "service_range_name" {
  type        = string
  description = "Ten secondary range cho Services"
  default     = "service-ranges"
}

variable "master_ipv4_cidr" {
  type        = string
  description = "CIDR block cho GKE control plane"
  default     = "172.16.0.0/28"
}

variable "master_authorized_cidrs" {
  type = list(object({
    cidr_block   = string
    display_name = string
  }))
  description = "Dai IP duoc goi Kubernetes API (VPN cong ty, CI runner). De trong = khong gioi han"
  default     = []
}

variable "deletion_protection" {
  type        = bool
  description = "Chan terraform destroy xoa nham cluster production"
  default     = true
}

variable "app_node_machine_type" {
  type        = string
  description = "Loai may cho Node Pool ung dung"
  default     = "e2-standard-4"
}

variable "node_disk_size_gb" {
  type        = number
  description = "Dung luong boot disk moi node (GB)"
  default     = 50
}

variable "total_min_nodes" {
  type        = number
  description = "So node toi thieu TOAN pool (ngoai gio hanh chinh)"
  default     = 1
}

variable "total_max_nodes" {
  type        = number
  description = "So node toi da TOAN pool (gio cao diem, trai 3 zone)"
  default     = 4
}

variable "staging_node_machine_type" {
  type        = string
  description = "Loai may cho Staging Node Pool (Spot)"
  default     = "e2-standard-4"
}

variable "staging_max_nodes" {
  type        = number
  description = "So node staging toi da"
  default     = 1
}
