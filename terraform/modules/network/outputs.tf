output "vpc_id" {
  value       = google_compute_network.vpc.id
  description = "VPC ID"
}

output "vpc_name" {
  value       = google_compute_network.vpc.name
  description = "Ten VPC"
}

output "vpc_self_link" {
  value       = google_compute_network.vpc.self_link
  description = "Self link cua VPC"
}

output "subnet_id" {
  value       = google_compute_subnetwork.gke_subnet.id
  description = "Subnet ID cho GKE"
}

output "subnet_name" {
  value       = google_compute_subnetwork.gke_subnet.name
  description = "Ten Subnet"
}

output "pod_range_name" {
  value       = google_compute_subnetwork.gke_subnet.secondary_ip_range[0].range_name
  description = "Ten secondary range cho Pods"
}

output "service_range_name" {
  value       = google_compute_subnetwork.gke_subnet.secondary_ip_range[1].range_name
  description = "Ten secondary range cho Services"
}

output "private_vpc_connection" {
  value       = google_service_networking_connection.private_vpc_connection
  description = "Private Service Networking Connection"
}

output "waf_policy_id" {
  value       = google_compute_security_policy.waf_policy.id
  description = "Cloud Armor WAF Policy ID"
}

output "waf_policy_name" {
  value       = google_compute_security_policy.waf_policy.name
  description = "Ten Cloud Armor policy (gan vao GCPBackendPolicy/BackendConfig)"
}

output "lb_ip_address" {
  value       = google_compute_global_address.lb_ip.address
  description = "IP anycast toan cau cua Load Balancer"
}

output "lb_ip_name" {
  value       = google_compute_global_address.lb_ip.name
  description = "Ten IP tinh (annotation cua Gateway/Ingress)"
}

output "lb_cert_name" {
  value       = google_compute_managed_ssl_certificate.lb_cert.name
  description = "Ten chung chi TLS Google-managed"
}

output "ssl_policy_name" {
  value       = google_compute_ssl_policy.tls_policy.name
  description = "Ten SSL policy TLS 1.2+"
}
