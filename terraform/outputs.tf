# -----------------------------------------------------------------------
# outputs.tf — Terraform outputs for easy reference
# -----------------------------------------------------------------------

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.website.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.website.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution (used for invalidations)"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_url" {
  description = "Live URL of the site"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "content_api_url" {
  description = "Base URL for the content admin API"
  value       = aws_apigatewayv2_stage.content_api.invoke_url
}

output "google_client_id" {
  description = "Google OAuth client ID passed to the React build"
  value       = var.google_client_id
}

output "entra_tenant_id" {
  description = "Microsoft Entra tenant ID (for frontend MSAL config)"
  value       = var.entra_tenant_id
}

output "entra_client_id" {
  description = "Microsoft Entra client ID (for frontend MSAL config)"
  value       = var.entra_client_id
}

output "ses_from_email" {
  description = "SES from address"
  value       = var.ses_from_email
}

output "ses_domain" {
  description = "SES verified sending domain"
  value       = local.ses_domain
}

output "ses_dkim_records" {
  description = "CNAME records to add in DNS (GoDaddy) to verify the domain and enable DKIM"
  value = var.manage_ses_identity && length(aws_sesv2_email_identity.domain) > 0 ? [
    for token in aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens : {
      type  = "CNAME"
      name  = "${token}._domainkey.${local.ses_domain}"
      value = "${token}.dkim.amazonses.com"
    }
  ] : []
}
