# -----------------------------------------------------------------------
# example.tfvars — Copy values into dev.tfvars / prod.tfvars
# -----------------------------------------------------------------------

location         = "eastus"
project_name     = "wyrth-website"
environment      = "dev"

entra_tenant_id  = "YOUR_TENANT_ID"
entra_client_id  = "YOUR_ADMIN_APP_CLIENT_ID"
google_client_id = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"

mail_from        = "noreply@wyrthco.com"
mail_client_id   = "58467458-ad88-486b-abd4-46c2c32b1e07"  # Wyrth Website Mail (Graph Mail.Send)
# mail_client_secret — pass at deploy: MAIL_CLIENT_SECRET=... ./deploy-azure.sh
# jwt_secret         — pass at deploy: JWT_SECRET=... ./deploy-azure.sh

custom_domain = ""  # e.g. wyrthco.com — leave blank to use azurefd.net hostname