# -----------------------------------------------------------------------
# dev.tfvars — Azure dev environment
# -----------------------------------------------------------------------

location         = "centralus"
project_name     = "wyrth-website"
environment      = "dev"

entra_tenant_id  = "4c061c09-139b-4718-969f-b9b491911d8a"
entra_client_id  = "8938c729-223c-4481-8a20-34a5694b825f"
google_client_id = "775161725783-6ttorf72d49ahohp6ci8oc7bed88k650.apps.googleusercontent.com"

mail_from      = "noreply@wyrthco.com"
mail_client_id = "58467458-ad88-486b-abd4-46c2c32b1e07"
custom_domain  = "dev.wyrthco.com"

# Comma-separated Entra UPNs allowed to hit admin endpoints. REPLACE with your
# actual admin UPN before deploying — an empty value rejects all admin calls.
admin_emails = ""

# mail_client_secret — injected at deploy time (MAIL_CLIENT_SECRET env var)
# jwt_secret         — injected at deploy time (JWT_SECRET env var)
# stripe_*           — injected at deploy time