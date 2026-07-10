# -----------------------------------------------------------------------
# outputs.tf — AWS Terraform outputs
# -----------------------------------------------------------------------

output "site_bucket" {
  value = local.site_bucket_id
}

output "cloudfront_domain_name" {
  value = local.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  value = local.cloudfront_id
}

output "reusing_existing_static" {
  description = "True when S3/CloudFront were not created by this stack"
  value       = local.use_existing_site || local.use_existing_cf
}

output "reusing_existing_lambda" {
  value = local.use_existing_lambda
}

output "site_url" {
  description = "Live site URL"
  value       = local.site_url
}

output "content_api_url" {
  description = "Base URL for the content / shop API (no trailing slash)"
  value       = local.content_api_url
}

output "lambda_function_name" {
  value = local.lambda_function_name
}

output "lambda_env_json" {
  description = "Env vars deploy-aws.sh applies to the Lambda"
  value       = jsonencode(local.lambda_env)
  sensitive   = true
}

output "dynamo_table_prefix" {
  value = local.dynamo_prefix
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

output "acm_validation_records" {
  description = "DNS records to create if hosted_zone_name is not set (new CF only)"
  value = !local.use_existing_cf && var.custom_domain != "" ? [
    for dvo in aws_acm_certificate.main[0].domain_validation_options : {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  ] : []
}

output "aws_region" {
  value = var.aws_region
}
