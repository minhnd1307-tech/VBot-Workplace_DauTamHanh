variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "project_prefix" {
  type        = string
  description = "Tien to dat ten tai nguyen (vi du: vbot-prod)"
  default     = "vbot-prod"
}

variable "region" {
  type        = string
  description = "Region Google Cloud (mac dinh Singapore)"
  default     = "asia-southeast1"
}

variable "subnet_cidr" {
  type        = string
  description = "Dai IP Subnet chinh (regional, phu ca 3 zone)"
  default     = "10.10.0.0/20"
}

variable "pod_cidr" {
  type        = string
  description = "Dai IP Secondary cho GKE Pods"
  default     = "10.20.0.0/16"
}

variable "service_cidr" {
  type        = string
  description = "Dai IP Secondary cho GKE Services"
  default     = "10.30.0.0/20"
}

variable "domains" {
  type        = list(string)
  description = "Ten mien cho chung chi TLS Google-managed cua Load Balancer"
  default     = ["vbot.example.com"]
}

variable "rate_limit_per_ip_per_minute" {
  type        = number
  description = "Nguong request/phut moi IP truoc khi Cloud Armor tra 429 (nhan vien di ra tu IP NAT van phong)"
  default     = 6000
}
