# -----------------------------------------------------------------------
# test.tfvars — AWS test
# -----------------------------------------------------------------------

aws_region   = "us-east-1"
project_name = "wyrth-website"
environment  = "test"

existing_cloudfront_distribution_id = "E762JKC0VIOMO"
existing_site_bucket                = "wyrthco-website-test"
existing_lambda_function_name       = "wyrth-website-test-content-api"
existing_content_api_url            = "https://1wt8vfooa7.execute-api.us-east-1.amazonaws.com"

custom_domain = "test.wyrthco.com"
site_url      = "https://test.wyrthco.com"

manage_dynamodb     = false
dynamo_table_prefix = "wyrth-website-test"

entra_tenant_id  = "4c061c09-139b-4718-969f-b9b491911d8a"
entra_client_id  = "8938c729-223c-4481-8a20-34a5694b825f"
google_client_id = "775161725783-6ttorf72d49ahohp6ci8oc7bed88k650.apps.googleusercontent.com"

# Must match a verified SES identity (domain wyrthco.com is verified in us-east-1)
mail_from = "noreply@wyrthco.com"

admin_emails = ""
