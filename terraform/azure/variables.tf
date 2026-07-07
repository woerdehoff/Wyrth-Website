# -----------------------------------------------------------------------
# variables.tf — Azure input variables
# -----------------------------------------------------------------------

variable "location" {
  description = "Azure region"
  type        = string
  default     = "centralus"
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

variable "site_url" {
  description = "Public site URL (Stripe redirects, magic links). Leave blank to use CDN hostname."
  type        = string
  default     = ""
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
  description = "M365 mailbox used to send magic-link emails (e.g. noreply@wyrthco.com)"
  type        = string
  default     = ""
}

variable "mail_client_id" {
  description = "Entra app client ID with Mail.Send application permission"
  type        = string
  default     = ""
}

variable "mail_client_secret" {
  description = "Client secret for the mail-sending Entra app"
  type        = string
  sensitive   = true
  default     = ""
}