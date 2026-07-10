# -----------------------------------------------------------------------
# cloudfront.tf — CDN (create new OR reuse existing distribution)
# -----------------------------------------------------------------------

# ── Existing (legacy Wyrth CloudFront — already has certs + domains) ────

data "aws_cloudfront_distribution" "main" {
  count = local.use_existing_cf ? 1 : 0
  id    = var.existing_cloudfront_distribution_id
}

# ── New distribution (only when existing_cloudfront_distribution_id empty)

resource "aws_acm_certificate" "main" {
  count    = !local.use_existing_cf && var.custom_domain != "" ? 1 : 0
  provider = aws.us_east_1

  domain_name       = var.custom_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_route53_zone" "main" {
  count        = !local.use_existing_cf && var.hosted_zone_name != "" ? 1 : 0
  name         = var.hosted_zone_name
  private_zone = false
}

resource "aws_route53_record" "acm_validation" {
  for_each = !local.use_existing_cf && var.custom_domain != "" && var.hosted_zone_name != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

resource "aws_acm_certificate_validation" "main" {
  count    = !local.use_existing_cf && var.custom_domain != "" && var.hosted_zone_name != "" ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for r in aws_route53_record.acm_validation : r.fqdn]
}

resource "aws_cloudfront_distribution" "main" {
  count = local.use_existing_cf ? 0 : 1

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} website"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = var.custom_domain != "" ? [var.custom_domain] : []

  origin {
    domain_name              = local.site_bucket_regional_domain
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site[0].id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain == ""
    acm_certificate_arn = var.custom_domain != "" ? (
      var.hosted_zone_name != "" ? aws_acm_certificate_validation.main[0].certificate_arn : aws_acm_certificate.main[0].arn
    ) : null
    ssl_support_method       = var.custom_domain != "" ? "sni-only" : null
    minimum_protocol_version = var.custom_domain != "" ? "TLSv1.2_2021" : null
  }
}

resource "aws_route53_record" "site_a" {
  count   = !local.use_existing_cf && var.custom_domain != "" && var.hosted_zone_name != "" && var.create_dns_records ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.custom_domain
  type    = "A"

  alias {
    name                   = local.cloudfront_domain_name
    zone_id                = local.cloudfront_hosted_zone
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "site_aaaa" {
  count   = !local.use_existing_cf && var.custom_domain != "" && var.hosted_zone_name != "" && var.create_dns_records ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.custom_domain
  type    = "AAAA"

  alias {
    name                   = local.cloudfront_domain_name
    zone_id                = local.cloudfront_hosted_zone
    evaluate_target_health = false
  }
}
