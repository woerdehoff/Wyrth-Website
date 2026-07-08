# -----------------------------------------------------------------------
# function.tf — Azure Functions API
# -----------------------------------------------------------------------

resource "azurerm_service_plan" "api" {
  name                = "${var.project_name}-${var.environment}-plan"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"
  tags                = local.tags
}

resource "azurerm_application_insights" "api" {
  name                = "${var.project_name}-${var.environment}-insights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  tags                = local.tags
}

resource "azurerm_linux_function_app" "api" {
  name                       = "${var.project_name}-${var.environment}-api"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  service_plan_id            = azurerm_service_plan.api.id
  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key
  https_only                 = true
  tags                       = local.tags

  site_config {
    application_stack {
      node_version = "22"
    }

    application_insights_connection_string = azurerm_application_insights.api.connection_string
    application_insights_key               = azurerm_application_insights.api.instrumentation_key

    cors {
      allowed_origins     = local.api_cors_origins
      support_credentials = false
    }
  }

  app_settings = {
    FUNCTIONS_EXTENSION_VERSION              = "~4"
    FUNCTIONS_WORKER_RUNTIME                 = "node"
    AzureWebJobsFeatureFlags                 = "EnableWorkerIndexing"
    WEBSITE_NODE_DEFAULT_VERSION             = "~22"
    # WEBSITE_RUN_FROM_PACKAGE and SCM_DO_BUILD_DURING_DEPLOYMENT are managed by deploy-azure.sh zip deploy
    AzureWebJobsStorage             = azurerm_storage_account.functions.primary_connection_string
    COSMOS_ENDPOINT                 = azurerm_cosmosdb_account.main.endpoint
    COSMOS_KEY                      = azurerm_cosmosdb_account.main.primary_key
    COSMOS_DATABASE                 = azurerm_cosmosdb_sql_database.main.name
    STORAGE_ACCOUNT_NAME            = azurerm_storage_account.website.name
    STORAGE_ACCOUNT_KEY             = azurerm_storage_account.website.primary_access_key
    STORAGE_CDN_HOST                = azurerm_storage_account.website.primary_web_host
    SITE_URL                        = local.site_url
    ENTRA_TENANT_ID                 = var.entra_tenant_id
    ENTRA_CLIENT_ID                 = var.entra_client_id
    GOOGLE_CLIENT_ID                = var.google_client_id
    STRIPE_SECRET_KEY               = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET           = var.stripe_webhook_secret
    JWT_SECRET                      = var.jwt_secret
    MAIL_FROM                       = var.mail_from
    MAIL_CLIENT_ID                  = var.mail_client_id
    MAIL_CLIENT_SECRET              = var.mail_client_secret
    ADMIN_EMAILS                    = var.admin_emails
  }

  identity {
    type = "SystemAssigned"
  }
}

# Function code is deployed via deploy-azure.sh (az functionapp deployment source config-zip)