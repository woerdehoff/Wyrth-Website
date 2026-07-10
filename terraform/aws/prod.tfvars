# -----------------------------------------------------------------------
# prod.tfvars — AWS prod
# -----------------------------------------------------------------------

aws_region   = "us-east-1"
project_name = "wyrth-website"
environment  = "prod"

existing_cloudfront_distribution_id = "E18DWUHK7XG807"
existing_site_bucket                = "wyrthco-website"
existing_lambda_function_name       = "wyrth-website-content-api"
existing_content_api_url            = "https://jxc2aawsfa.execute-api.us-east-1.amazonaws.com"

custom_domain = "www.wyrthco.com"
site_url      = "https://www.wyrthco.com"

manage_dynamodb     = false
dynamo_table_prefix = "wyrth-website"

entra_tenant_id  = "4c061c09-139b-4718-969f-b9b491911d8a"
entra_client_id  = "8938c729-223c-4481-8a20-34a5694b825f"
google_client_id = "775161725783-6ttorf72d49ahohp6ci8oc7bed88k650.apps.googleusercontent.com"

# Must match a verified SES identity (domain wyrthco.com is verified in us-east-1)
mail_from = "noreply@wyrthco.com"

admin_emails = ""
