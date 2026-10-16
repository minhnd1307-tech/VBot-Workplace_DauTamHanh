output "db_instance_name" {
  value       = google_sql_database_instance.postgres_ha.name
  description = "Ten Cloud SQL Instance"
}

output "db_private_ip" {
  value       = google_sql_database_instance.postgres_ha.private_ip_address
  description = "Dia chi IP noi bo cua Cloud SQL"
}

output "workspace_bucket_name" {
  value       = google_storage_bucket.workspace_bucket.name
  description = "Ten Cloud Storage Bucket chua workspace cua user"
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
