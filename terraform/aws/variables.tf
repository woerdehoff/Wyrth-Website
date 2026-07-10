# -----------------------------------------------------------------------
# variables.tf — AWS input variables
# -----------------------------------------------------------------------

variable "aws_region" {
  description = "Primary AWS region for S3, Lambda, DynamoDB, API Gateway"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Resource naming prefix"
  type        = string
  default     = "wyrth-website"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be dev, test, or prod"
  }
}

# ── Reuse existing static hosting (legacy Wyrth CloudFront + S3) ────────

variable "existing_site_bucket" {
  description = "If set, reuse this S3 bucket for the static site (do not create a new one). Find via CloudFront origin."
  type        = string
  default     = ""
}

variable "existing_cloudfront_distribution_id" {
  description = "If set, reuse this CloudFront distribution (do not create a new one). e.g. EJTKH2O123SKG"
  type        = string
  default     = ""
}

variable "existing_lambda_function_name" {
  description = "If set, reuse this Lambda (do not create). e.g. wyrth-website-dev-content-api"
  type        = string
  default     = ""
}

variable "existing_content_api_url" {
  description = "Public base URL of the existing API (Function URL or API Gateway). Required when reusing Lambda. No trailing slash."
  type        = string
  default     = ""
}

variable "manage_dynamodb" {
  description = "Create DynamoDB tables in this stack. Set false if tables already exist and are managed elsewhere."
  type        = bool
  default     = true
}

variable "dynamo_table_prefix" {
  description = "Prefix for DynamoDB table names (default: project-environment). Must match Lambda DYNAMO_TABLE_PREFIX."
  type        = string
  default     = ""
}

variable "site_url" {
  description = "Public site URL (Stripe redirects, magic links). Leave blank to derive from custom_domain or CloudFront."
  type        = string
  default     = ""
}

variable "custom_domain" {
  description = "Custom domain already on CloudFront or to attach (e.g. www.wyrthco.com / dev.wyrthco.com)"
  type        = string
  default     = ""
}

variable "hosted_zone_name" {
  description = "Route53 public hosted zone for ACM DNS validation / alias records (only when creating a new distribution)"
  type        = string
  default     = ""
}

variable "create_dns_records" {
  description = "If true and hosted_zone_name is set, create A/AAAA alias records for custom_domain (new CF only)"
  type        = bool
  default     = false
}

variable "entra_tenant_id" {
  description = "Microsoft Entra tenant ID"
  type        = string
}

variable "entra_client_id" {
  description = "Entra app client ID for admin JWT verification (MSAL app)"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth client ID for customer cart auth"
  type        = string
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "HMAC secret for magic-link session JWTs (min 32 chars)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "mail_from" {
  description = "Verified SES From address for magic-link emails (must be on a verified SES domain, e.g. noreply@wyrthco.com)"
  type        = string
  default     = ""
}

variable "admin_emails" {
  description = "Comma-separated Entra UPNs / preferred_usernames allowed to hit admin endpoints. If empty the API rejects all admin calls."
  type        = string
  default     = ""
}
