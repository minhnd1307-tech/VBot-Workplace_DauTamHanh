output "db_instance_name" {
  value       = google_sql_database_instance.postgres_ha.name
  description = "Ten Cloud SQL Instance"
}

output "db_connection_name" {
  value       = google_sql_database_instance.postgres_ha.connection_name
  description = "Connection name cho Cloud SQL Auth Proxy / connector"
}

output "db_private_ip" {
  value       = google_sql_database_instance.postgres_ha.private_ip_address
  description = "Dia chi IP noi bo cua Cloud SQL"
}

output "staging_db_instance_name" {
  value       = try(google_sql_database_instance.postgres_staging[0].name, null)
  description = "Ten Cloud SQL staging"
}

output "workspace_bucket_name" {
  value       = google_storage_bucket.workspace_bucket.name
  description = "Ten Cloud Storage Bucket chua workspace cua user"
}

output "workspace_prefix" {
  value       = local.workspace_prefix
  description = "Prefix goc cua workspace, object cua user nam o <prefix><user_id>/"
}

output "connector_ingest_bucket_name" {
  value       = google_storage_bucket.connector_ingest.name
  description = "Bucket tam cho connector ingest (tu xoa sau 7 ngay)"
}

output "redis_host" {
  value       = google_redis_instance.redis_ha.host
  description = "IP Host cua Memorystore Redis"
}

output "redis_port" {
  value       = google_redis_instance.redis_ha.port
  description = "Port ket noi Redis"
}

output "agent_task_queue_id" {
  value       = google_cloud_tasks_queue.agent_task_queue.id
  description = "Cloud Tasks Queue ID cho Agent"
}

output "connector_sync_queue_id" {
  value       = google_cloud_tasks_queue.connector_sync_queue.id
  description = "Cloud Tasks Queue ID cho dong bo connector"
}

output "connector_events_topic" {
  value       = google_pubsub_topic.connector_events.id
  description = "Pub/Sub topic nhan thong bao thay doi tu SaaS (Gmail/Drive watch, webhook)"
}

output "data_service_accounts" {
  value       = { for k, sa in google_service_account.data_sa : k => sa.email }
  description = "Service account cua tang du lieu (gan vao K8s ServiceAccount qua Workload Identity)"
}
