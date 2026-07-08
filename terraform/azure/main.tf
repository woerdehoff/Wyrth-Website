# -----------------------------------------------------------------------
# main.tf — Azure infrastructure for Wyrth Website
# Parallel stack to terraform/ (AWS). Uses separate remote state.
# -----------------------------------------------------------------------

terraform {
  required_version = ">= 1.0"

  backend "azurerm" {
    resource_group_name  = "wyrth-website-tfstate"
    storage_account_name = "wyrthwebsitetfstate"
    container_name       = "tfstate"
    # key passed via: terraform init -backend-config="key=wyrth-website-azure/<env>/terraform.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

  }
}

provider "azurerm" {
  features {}
}

locals {
  site_url = var.site_url != "" ? var.site_url : (
    var.custom_domain != "" ? "https://${var.custom_domain}" : "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
  )
  api_cors_origins = compact([
    local.site_url,
    "https://${azurerm_storage_account.website.primary_web_host}",
    "http://localhost:5173",
    "http://localhost:4173",
  ])
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}