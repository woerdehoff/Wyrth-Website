# -----------------------------------------------------------------------
# variables.tf — Input variables for Terraform
# -----------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Name of the S3 bucket (must be globally unique)"
  type        = string
}

variable "project_name" {
  description = "Name of the project for tagging and naming resources"
  type        = string
  default     = "wyrth-website"
}

variable "entra_tenant_id" {
  description = "Microsoft Entra ID tenant ID"
  type        = string
}

variable "entra_client_id" {
  description = "Microsoft Entra ID application (client) ID"
  type        = string
}

variable "stripe_secret_key" {
  description = "Stripe secret API key (sk_live_... or sk_test_...)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret (whsec_...)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "site_url" {
  description = "Public site URL for Stripe redirect URLs. Leave blank to auto-use the CloudFront URL."
  type        = string
  default     = ""
}

variable "google_client_id" {
  description = "Google OAuth 2.0 client ID (from console.cloud.google.com)"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Deployment environment — controls resource tags and naming"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be one of: dev, test, prod"
  }
}
