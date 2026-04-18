# -----------------------------------------------------------------------
# dev.tfvars — Development environment (branch: develop / feature/*)
# Used by Jenkins: terraform apply -var-file=dev.tfvars
# -----------------------------------------------------------------------

aws_region       = "us-east-1"
bucket_name      = "wyrthco-website-dev"
project_name     = "wyrth-website-dev"
environment      = "dev"

entra_tenant_id  = "4c061c09-139b-4718-969f-b9b491911d8a"
entra_client_id  = "8938c729-223c-4481-8a20-34a5694b825f"
google_client_id = "775161725783-6ttorf72d49ahohp6ci8oc7bed88k650.apps.googleusercontent.com"
ses_from_email   = "noreply@wyrth.co"

# stripe_secret_key     — injected by Jenkins (stripe-secret-key-dev credential)
# stripe_webhook_secret — injected by Jenkins (stripe-webhook-secret-dev credential)
# jwt_secret            — injected by Jenkins (jwt-secret-dev credential)
# Use sk_test_... / whsec_... test keys for this environment.
