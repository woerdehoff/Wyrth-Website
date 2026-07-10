# -----------------------------------------------------------------------
# s3.tf — Static site origin bucket (create new OR reuse existing)
# -----------------------------------------------------------------------

# ── Existing (legacy Wyrth hosting) ─────────────────────────────────────

data "aws_s3_bucket" "site" {
  count  = local.use_existing_site ? 1 : 0
  bucket = var.existing_site_bucket
}

# ── New bucket (only when existing_site_bucket is empty) ────────────────

resource "aws_s3_bucket" "site" {
  count  = local.use_existing_site ? 0 : 1
  bucket = "${local.name_prefix}-site-${local.account_id}"
}

resource "aws_s3_bucket_public_access_block" "site" {
  count                   = local.use_existing_site ? 0 : 1
  bucket                  = aws_s3_bucket.site[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  count  = local.use_existing_site ? 0 : 1
  bucket = aws_s3_bucket.site[0].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "site" {
  count  = local.use_existing_site ? 0 : 1
  bucket = aws_s3_bucket.site[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "site" {
  count  = local.use_existing_site ? 0 : 1
  bucket = aws_s3_bucket.site[0].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT"]
    allowed_origins = compact([
      local.site_url,
      "http://localhost:5173",
      "http://localhost:4173",
    ])
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# OAC + bucket policy only for newly created CF + bucket pairs
resource "aws_cloudfront_origin_access_control" "site" {
  count                             = local.use_existing_cf ? 0 : 1
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for ${local.name_prefix} site bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "site_bucket" {
  count = local.use_existing_site || local.use_existing_cf ? 0 : 1

  statement {
    sid    = "AllowCloudFrontRead"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${local.site_bucket_arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [local.cloudfront_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  count  = local.use_existing_site || local.use_existing_cf ? 0 : 1
  bucket = local.site_bucket_id
  policy = data.aws_iam_policy_document.site_bucket[0].json
}
