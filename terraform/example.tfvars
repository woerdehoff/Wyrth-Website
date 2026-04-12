# -----------------------------------------------------------------------
# example.tfvars — Copy to terraform.tfvars and fill in your values
# -----------------------------------------------------------------------

aws_region      = "us-east-1"
bucket_name     = "wyrthco-website-YOURNAME"   # must be globally unique
project_name    = "wyrth-website"

# Microsoft Entra ID — from your App Registration overview
entra_tenant_id = "YOUR_TENANT_ID"
entra_client_id = "YOUR_CLIENT_ID"

# Stripe — from dashboard.stripe.com/apikeys and Webhooks
stripe_secret_key     = "sk_test_YOUR_STRIPE_SECRET_KEY"
stripe_webhook_secret = "whsec_YOUR_WEBHOOK_SIGNING_SECRET"

# Google OAuth — from console.cloud.google.com → APIs & Services → Credentials
# Create an "OAuth 2.0 Client ID" (Web application), add your CloudFront URL to
# "Authorised JavaScript origins" and "Authorised redirect URIs"
google_client_id = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"

# Optional: override the Stripe redirect URL (defaults to CloudFront URL)
# site_url = "https://wyrthco.com"
