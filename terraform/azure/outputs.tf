# -----------------------------------------------------------------------
# outputs.tf — Azure Terraform outputs
# -----------------------------------------------------------------------

output "resource_group_name" {
  value = data.azurerm_resource_group.main.name
}

output "storage_account_name" {
  value = azurerm_storage_account.website.name
}

output "cdn_hostname" {
  description = "Storage static website origin hostname (not the public URL — use site_url)"
  value       = azurerm_storage_account.website.primary_web_host
}

output "front_door_hostname" {
  description = "Azure Front Door endpoint URL"
  value       = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
}

output "custom_domain_validation_token" {
  description = "Add this as a DNS TXT record at _dnsauth.<custom_domain> to validate ownership for managed TLS"
  value       = var.custom_domain != "" ? azurerm_cdn_frontdoor_custom_domain.main[0].validation_token : null
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