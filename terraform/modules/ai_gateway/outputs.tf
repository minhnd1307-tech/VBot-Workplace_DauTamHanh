output "artifact_registry_repo_id" {
  value       = google_artifact_registry_repository.vbot_repo.id
  description = "Artifact Registry Repository ID"
}

output "audit_log_bucket_id" {
  value       = google_logging_project_bucket_config.audit_log_bucket.id
  description = "Audit Log Storage Bucket ID (luu 365 ngay)"
}

output "budget_alert_policy_id" {
  value       = google_monitoring_alert_policy.llm_budget_alert.id
  description = "Cloud Monitoring Alert Policy ID"
}
