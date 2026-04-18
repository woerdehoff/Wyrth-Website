# -----------------------------------------------------------------------
# s3.tf — S3 bucket configuration for hosting the React app
# -----------------------------------------------------------------------

resource "aws_s3_bucket" "website" {
  bucket = var.bucket_name

  tags = {
    Name        = "${var.project_name}-bucket"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Block all public access — CloudFront handles delivery
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket versioning
resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id

  versioning_configuration {
    status = "Enabled"
  }
}

# CORS — allows browser-side presigned URL uploads from any origin
resource "aws_s3_bucket_cors_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  cors_rule {
    allowed_headers = ["Content-Type"]
    allowed_methods = ["PUT"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# OAI for CloudFront to read from S3
resource "aws_cloudfront_origin_access_identity" "website" {
  comment = "OAI for ${var.project_name} S3 bucket"
}

# Bucket policy — only CloudFront can read objects
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.website.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}
