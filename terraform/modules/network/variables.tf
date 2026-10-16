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
  description = "Dai IP Subnet chinh"
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
