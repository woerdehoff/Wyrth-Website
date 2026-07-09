# Shared across dev/test/prod — created manually, not managed by Terraform.
data "azurerm_resource_group" "main" {
  name = var.project_name
}
