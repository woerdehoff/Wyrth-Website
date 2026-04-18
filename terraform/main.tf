# -----------------------------------------------------------------------
# main.tf — Terraform configuration for Wyrth Website
# -----------------------------------------------------------------------

terraform {
  required_version = ">= 1.0"

  # ── Remote state backend — required for multi-environment CI/CD ─────────
  # One-time setup (run once before using the Jenkins pipeline):
  #
  #   aws s3 mb s3://wyrth-website-tfstate --region us-east-1
  #   aws s3api put-bucket-versioning \
  #     --bucket wyrth-website-tfstate \
  #     --versioning-configuration Status=Enabled
  #
  # Then migrate existing local state:
  #   terraform init -migrate-state
  #
  # Jenkins passes the env-specific key via:
  #   terraform init -backend-config="key=wyrth-website/<env>/terraform.tfstate"
  #
  backend "s3" {
    bucket  = "wyrth-website-tfstate"
    region  = "us-east-1"
    encrypt = true
    # key is intentionally omitted — passed via -backend-config in Jenkins
    # For local use: terraform init -backend-config="key=wyrth-website/prod/terraform.tfstate"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
