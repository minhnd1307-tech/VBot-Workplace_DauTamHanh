output "cluster_name" {
  value       = google_container_cluster.primary.name
  description = "Ten cum GKE Cluster"
}

output "cluster_id" {
  value       = google_container_cluster.primary.id
  description = "ID cua GKE Cluster"
}

output "cluster_endpoint" {
  value       = google_container_cluster.primary.endpoint
  description = "Endpoint cua GKE Cluster"
}

output "cluster_ca_certificate" {
  value       = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  description = "CA Certificate cua GKE Cluster"
  sensitive   = true
}

output "workload_identity_pool" {
  value       = google_container_cluster.primary.workload_identity_config[0].workload_pool
  description = "Workload Identity Pool"
}

output "node_service_account_email" {
  value       = google_service_account.gke_nodes.email
  description = "Service account quyen toi thieu cho node (TV4 dung lai cho sandbox pool)"
}

output "app_node_pool_name" {
  value       = google_container_node_pool.app_pool.name
  description = "Ten node pool ung dung production"
}

output "staging_node_pool_name" {
  value       = google_container_node_pool.staging_pool.name
  description = "Ten node pool staging"
}
