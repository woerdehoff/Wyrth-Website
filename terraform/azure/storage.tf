# -----------------------------------------------------------------------
# storage.tf — Static website hosting + uploads container
# -----------------------------------------------------------------------

resource "azurerm_storage_account" "website" {
  name                     = replace("${var.project_name}${var.environment}web", "-", "")
  resource_group_name      = data.azurerm_resource_group.main.name
  location                 = data.azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.tags

  blob_properties {
    cors_rule {
      allowed_headers    = ["Content-Type", "x-ms-blob-type", "x-ms-version"]
      allowed_methods    = ["PUT", "OPTIONS"]
      allowed_origins    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }
}

resource "azurerm_storage_account_static_website" "website" {
  storage_account_id = azurerm_storage_account.website.id
  index_document     = "index.html"
  error_404_document = "index.html"
}

resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_id    = azurerm_storage_account.website.id
  container_access_type = "blob"
}

# Runtime storage required by Azure Functions
resource "azurerm_storage_account" "functions" {
  name                     = replace("${var.project_name}${var.environment}fn", "-", "")
  resource_group_name      = data.azurerm_resource_group.main.name
  location                 = data.azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.tags
}