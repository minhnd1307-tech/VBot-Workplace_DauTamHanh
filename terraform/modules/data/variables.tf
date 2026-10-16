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
  description = "VPC Network ID"
}

variable "private_vpc_connection" {
  description = "Dependency to ensure Private Service Connection is ready"
}

variable "kms_key_id" {
  type        = string
  description = "Cloud KMS CryptoKey ID dung de ma hoa GCS Bucket"
}

variable "db_tier" {
  type        = string
  description = "Tier may chu Cloud SQL (vi du: db-custom-4-16384)"
  default     = "db-custom-4-16384"
}

variable "db_disk_size_gb" {
  type        = number
  description = "Dung luong o cung SSD khoi tao cho Cloud SQL"
  default     = 100
}

variable "db_password" {
  type        = string
  description = "Mat khau database user"
  sensitive   = true
  default     = "VBotStrongPass2026!Secured"
}

variable "redis_memory_size_gb" {
  type        = number
  description = "Dung luong RAM Redis Cache (GB)"
  default     = 4
}
