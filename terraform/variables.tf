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
