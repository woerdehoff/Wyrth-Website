# -----------------------------------------------------------------------
# main.tf — AWS infrastructure for Wyrth Website
# -----------------------------------------------------------------------

terraform {
  required_version = ">= 1.0"

  # Bucket/region/encrypt are fixed for this account. State object key is
  # still set at init (per env) by deploy-aws.sh / Command Center:
  #   -backend-config="key=wyrth-website/<env>/terraform.tfstate"
  backend "s3" {
    bucket  = "wyrth-website-tfstate"
    region  = "us-east-1"
    encrypt = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}

# CloudFront ACM certificates must live in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# When reusing CloudFront, the S3 origin bucket must also be set (avoid orphan buckets).
check "existing_static_pair" {
  assert {
    condition = (
      (var.existing_cloudfront_distribution_id == "" && var.existing_site_bucket == "") ||
      (var.existing_cloudfront_distribution_id != "" && var.existing_site_bucket != "")
    )
    error_message = "Set both existing_cloudfront_distribution_id and existing_site_bucket together (or neither)."
  }
}

check "existing_lambda_needs_api_url" {
  assert {
    condition     = var.existing_lambda_function_name == "" || var.existing_content_api_url != ""
    error_message = "When existing_lambda_function_name is set, also set existing_content_api_url (Function URL or API Gateway base URL, no trailing slash)."
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  account_id  = data.aws_caller_identity.current.account_id

  use_existing_site = var.existing_site_bucket != ""
  use_existing_cf   = var.existing_cloudfront_distribution_id != ""

  site_bucket_id              = local.use_existing_site ? data.aws_s3_bucket.site[0].id : aws_s3_bucket.site[0].id
  site_bucket_arn             = local.use_existing_site ? data.aws_s3_bucket.site[0].arn : aws_s3_bucket.site[0].arn
  site_bucket_regional_domain = local.use_existing_site ? data.aws_s3_bucket.site[0].bucket_regional_domain_name : aws_s3_bucket.site[0].bucket_regional_domain_name

  cloudfront_domain_name = local.use_existing_cf ? data.aws_cloudfront_distribution.main[0].domain_name : aws_cloudfront_distribution.main[0].domain_name
  cloudfront_id          = local.use_existing_cf ? data.aws_cloudfront_distribution.main[0].id : aws_cloudfront_distribution.main[0].id
  cloudfront_arn         = local.use_existing_cf ? data.aws_cloudfront_distribution.main[0].arn : aws_cloudfront_distribution.main[0].arn
  cloudfront_hosted_zone = local.use_existing_cf ? data.aws_cloudfront_distribution.main[0].hosted_zone_id : aws_cloudfront_distribution.main[0].hosted_zone_id

  public_cdn_host = var.custom_domain != "" ? var.custom_domain : local.cloudfront_domain_name

  site_url = var.site_url != "" ? var.site_url : (
    var.custom_domain != "" ? "https://${var.custom_domain}" : "https://${local.cloudfront_domain_name}"
  )

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    "wyrth-billing" = "true"
  }
}
