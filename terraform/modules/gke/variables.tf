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

variable "vpc_name" {
  type        = string
  description = "Ten VPC"
}

variable "subnet_name" {
  type        = string
  description = "Ten Subnet"
}

variable "master_ipv4_cidr" {
  type        = string
  description = "CIDR block cho GKE Master control plane"
  default     = "172.16.0.0/28"
}

variable "app_node_machine_type" {
  type        = string
  description = "Loai may cho Node Pool ung dung"
  default     = "e2-standard-4"
}

variable "initial_node_count" {
  type        = number
  description = "So node ban dau moi zone"
  default     = 1
}

variable "min_nodes" {
  type        = number
  description = "So node toi thieu moi zone (Scale down ban dem)"
  default     = 1
}

variable "max_nodes" {
  type        = number
  description = "So node toi da moi zone (Scale up gio cao diem)"
  default     = 3
}
