# -----------------------------------------------------------------------
# ses.tf — SES domain identity for magic-link sign-in emails
#
# SES identities are account-level. Only prod manages them (manage_ses_identity)
# so dev/test applies don't fight over the same resource.
# -----------------------------------------------------------------------

locals {
  ses_domain = var.ses_from_email != "" ? element(split("@", var.ses_from_email), 1) : ""
}

resource "aws_sesv2_email_identity" "domain" {
  count          = var.manage_ses_identity && local.ses_domain != "" ? 1 : 0
  email_identity = local.ses_domain

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }
}