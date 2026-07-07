# -----------------------------------------------------------------------
# outputs.tf — Azure Terraform outputs
# -----------------------------------------------------------------------

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "storage_account_name" {
  value = azurerm_storage_account.website.name
}

output "cdn_hostname" {
  description = "Public hostname for the static site (storage static website)"
  value       = azurerm_storage_account.website.primary_web_host
}

output "site_url" {
  description = "Live site URL"
  value       = local.site_url
}

output "content_api_url" {
  description = "Base URL for the content / shop API"
  value       = "https://${azurerm_linux_function_app.api.default_hostname}"
}

output "function_app_name" {
  value = azurerm_linux_function_app.api.name
}

output "cosmos_endpoint" {
  value = azurerm_cosmosdb_account.main.endpoint
}

output "google_client_id" {
  value = var.google_client_id
}

output "entra_tenant_id" {
  value = var.entra_tenant_id
}

output "entra_client_id" {
  value = var.entra_client_id
}

output "mail_from" {
  value = var.mail_from
}