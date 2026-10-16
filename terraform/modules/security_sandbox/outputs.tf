output "sandbox_node_pool_id" {
  value       = google_container_node_pool.sandbox_pool.id
  description = "GKE Sandbox Node Pool ID"
}

output "kms_key_id" {
  value       = google_kms_crypto_key.vbot_key.id
  description = "Cloud KMS CryptoKey ID"
}

output "kms_keyring_id" {
  value       = google_kms_key_ring.keyring.id
  description = "Cloud KMS KeyRing ID"
}

output "oauth_vault_secret_id" {
  value       = google_secret_manager_secret.oauth_token_vault.id
  description = "Secret Manager Secret ID cho OAuth Token Vault"
}

output "dlp_template_id" {
  value       = google_data_loss_prevention_inspect_template.pii_inspect_template.id
  description = "Cloud DLP Inspect Template ID"
}
