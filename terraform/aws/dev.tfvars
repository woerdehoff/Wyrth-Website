# -----------------------------------------------------------------------
# dev.tfvars — AWS dev (reuse existing S3 + CloudFront + Lambda + API GW)
# -----------------------------------------------------------------------

aws_region   = "us-east-1"
project_name = "wyrth-website"
environment  = "dev"

existing_cloudfront_distribution_id = "EJTKH2O123SKG"
existing_site_bucket                = "wyrthco-website-dev"
existing_lambda_function_name       = "wyrth-website-dev-content-api"
existing_content_api_url            = "https://54roo7ti6d.execute-api.us-east-1.amazonaws.com"

custom_domain = "dev.wyrthco.com"
site_url      = "https://dev.wyrthco.com"

manage_dynamodb     = false
dynamo_table_prefix = "wyrth-website"

entra_tenant_id  = "4c061c09-139b-4718-969f-b9b491911d8a"
entra_client_id  = "8938c729-223c-4481-8a20-34a5694b825f"
google_client_id = "775161725783-6ttorf72d49ahohp6ci8oc7bed88k650.apps.googleusercontent.com"

# Must match a verified SES identity (domain wyrthco.com is verified in us-east-1)
mail_from = "noreply@wyrthco.com"

admin_emails = ""
