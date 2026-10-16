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

variable "db_password" {
  type        = string
  description = "Mat khau cho Cloud SQL Database"
  sensitive   = true
  default     = "VBotSecurePassword2026!GCP"
}
