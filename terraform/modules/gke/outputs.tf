output "cluster_name" {
  value       = google_container_cluster.primary.name
  description = "Ten cum GKE Cluster"
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
