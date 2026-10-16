output "vpc_id" {
  value       = google_compute_network.vpc.id
  description = "VPC ID"
}

output "vpc_name" {
  value       = google_compute_network.vpc.name
  description = "Ten VPC"
}

output "subnet_id" {
  value       = google_compute_subnetwork.gke_subnet.id
  description = "Subnet ID cho GKE"
}

output "subnet_name" {
  value       = google_compute_subnetwork.gke_subnet.name
  description = "Ten Subnet"
}

output "waf_policy_id" {
  value       = google_compute_security_policy.waf_policy.id
  description = "Cloud Armor WAF Policy ID"
}

output "private_vpc_connection" {
  value       = google_service_networking_connection.private_vpc_connection
  description = "Private Service Networking Connection"
}
