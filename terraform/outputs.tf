# ==============================================================================
# ROOT MODULE OUTPUTS: VBOT WORKPLACE
# ==============================================================================

output "vpc_id" {
  value       = module.network.vpc_id
  description = "VPC Network ID"
}

output "gke_cluster_name" {
  value       = module.gke.cluster_name
  description = "GKE Cluster Name"
}

output "gke_cluster_endpoint" {
  value       = module.gke.cluster_endpoint
  description = "GKE Cluster Endpoint"
}

output "cloud_sql_private_ip" {
  value       = module.data.db_private_ip
  description = "Cloud SQL Private IP"
}

output "workspace_bucket_name" {
  value       = module.data.workspace_bucket_name
  description = "Cloud Storage Workspace Bucket Name"
}

output "redis_host" {
  value       = module.data.redis_host
  description = "Memorystore Redis Host IP"
}

output "kms_key_id" {
  value       = module.security_sandbox.kms_key_id
  description = "Cloud KMS CryptoKey ID"
}

output "oauth_vault_secret_id" {
  value       = module.security_sandbox.oauth_vault_secret_id
  description = "Secret Manager Secret ID cho OAuth Token Vault"
}

output "artifact_registry_repo" {
  value       = module.ai_gateway.artifact_registry_repo_id
  description = "Artifact Registry Repository cho CI/CD Container Images"
}

output "lb_ip_address" {
  value       = module.network.lb_ip_address
  description = "IP anycast cua Global External Application Load Balancer"
}

output "waf_policy_name" {
  value       = module.network.waf_policy_name
  description = "Ten Cloud Armor policy gan vao backend cua LB"
}

output "gke_node_service_account" {
  value       = module.gke.node_service_account_email
  description = "Service account quyen toi thieu cua GKE node"
}

output "ai_gateway_endpoint" {
  value       = module.ai_gateway.ai_gateway_endpoint_id
  description = "Vertex AI Private Endpoint ID cho AI Gateway"
}

