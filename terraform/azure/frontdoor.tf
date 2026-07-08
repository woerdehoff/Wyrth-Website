# -----------------------------------------------------------------------
# frontdoor.tf — Azure Front Door Standard (global CDN + routing)
#
# Routes:
#   /api/*  → Azure Functions (no caching, HTTPS only)
#   /*      → Storage static website (CDN caching + compression)
# -----------------------------------------------------------------------

resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${var.project_name}-${var.environment}-fd"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Standard_AzureFrontDoor"
  tags                = local.tags
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "${var.project_name}-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  tags                     = local.tags
}

# ── Static website origin ────────────────────────────────────────────────

resource "azurerm_cdn_frontdoor_origin_group" "static" {
  name                     = "static"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }

  health_probe {
    path                = "/"
    request_type        = "HEAD"
    protocol            = "Https"
    interval_in_seconds = 100
  }
}

resource "azurerm_cdn_frontdoor_origin" "static" {
  name                           = "static"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.static.id
  enabled                        = true
  host_name                      = azurerm_storage_account.website.primary_web_host
  origin_host_header             = azurerm_storage_account.website.primary_web_host
  http_port                      = 80
  https_port                     = 443
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

# ── Azure Functions API origin ───────────────────────────────────────────

resource "azurerm_cdn_frontdoor_origin_group" "api" {
  name                     = "api"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "api" {
  name                           = "api"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.api.id
  enabled                        = true
  host_name                      = azurerm_linux_function_app.api.default_hostname
  origin_host_header             = azurerm_linux_function_app.api.default_hostname
  http_port                      = 80
  https_port                     = 443
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

# ── Custom domain (optional) ─────────────────────────────────────────────
# Requires DNS setup after apply — see outputs: custom_domain_validation_token

resource "azurerm_cdn_frontdoor_custom_domain" "main" {
  count                    = var.custom_domain != "" ? 1 : 0
  name                     = replace(var.custom_domain, ".", "-")
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  host_name                = var.custom_domain

  tls {
    certificate_type = "ManagedCertificate"
    minimum_version  = "TLS12"
  }

  # create_before_destroy ensures the new domain + route update happen before
  # the old domain is deleted, avoiding the "still associated with a route" error
  lifecycle {
    create_before_destroy = true
  }
}

# ── SPA fallback — serve index.html for client-side routes (e.g. /auth/verify) ──

resource "azurerm_cdn_frontdoor_rule_set" "spa" {
  name                     = "spaFallback"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

resource "azurerm_cdn_frontdoor_rule" "spa_rewrite" {
  depends_on = [azurerm_cdn_frontdoor_origin.static, azurerm_cdn_frontdoor_origin_group.static]

  name                      = "spaRewrite"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.spa.id
  order                     = 1
  behavior_on_match         = "Stop"

  conditions {
    url_path_condition {
      operator         = "RegEx"
      negate_condition = false
      match_values     = ["^[^.]*$"]
    }
  }

  actions {
    url_rewrite_action {
      source_pattern          = "/"
      destination             = "/index.html"
      preserve_unmatched_path = false
    }
  }
}

# ── Routes ───────────────────────────────────────────────────────────────

resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "api-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.api.id]
  enabled                       = true

  patterns_to_match      = ["/api/*"]
  supported_protocols    = ["Http", "Https"]
  https_redirect_enabled = true
  forwarding_protocol    = "HttpsOnly"
  link_to_default_domain = true

  cdn_frontdoor_custom_domain_ids = var.custom_domain != "" ? [azurerm_cdn_frontdoor_custom_domain.main[0].id] : []
}

resource "azurerm_cdn_frontdoor_route" "static" {
  name                          = "static-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.static.id]
  cdn_frontdoor_rule_set_ids    = [azurerm_cdn_frontdoor_rule_set.spa.id]
  enabled                       = true

  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]
  https_redirect_enabled = true
  forwarding_protocol    = "HttpsOnly"
  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "text/html",
      "text/css",
      "application/javascript",
      "application/json",
      "image/svg+xml",
    ]
  }

  cdn_frontdoor_custom_domain_ids = var.custom_domain != "" ? [azurerm_cdn_frontdoor_custom_domain.main[0].id] : []
}
