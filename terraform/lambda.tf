# -----------------------------------------------------------------------
# lambda.tf — Content API: Lambda + API Gateway for admin saves
# -----------------------------------------------------------------------

# ── IAM ──────────────────────────────────────────────────────────────

resource "aws_iam_role" "content_api" {
  name = "${var.project_name}-content-api-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

locals {
  site_url = var.site_url != "" ? var.site_url : "https://${aws_cloudfront_distribution.website.domain_name}"
}

resource "aws_iam_role_policy" "content_api" {
  name = "${var.project_name}-content-api-policy"
  role = aws_iam_role.content_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.website.arn}/content.json"
      },
      {
        Effect   = "Allow"
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.website.arn}/uploads/*"
      },
      {
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = "arn:aws:cloudfront::*:distribution/${aws_cloudfront_distribution.website.id}"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
        ]
        Resource = [
          aws_dynamodb_table.products.arn,
          aws_dynamodb_table.orders.arn,
          aws_dynamodb_table.carts.arn,
          aws_dynamodb_table.analytics.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
    ]
  })
}

# ── Lambda ────────────────────────────────────────────────────────────

data "archive_file" "content_api" {
  type        = "zip"
  source_file = "${path.module}/../lambda/index.mjs"
  output_path = "${path.module}/../lambda/function.zip"
}

resource "aws_lambda_function" "content_api" {
  function_name    = "${var.project_name}-content-api"
  role             = aws_iam_role.content_api.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  filename         = data.archive_file.content_api.output_path
  source_code_hash = data.archive_file.content_api.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      BUCKET_NAME                = aws_s3_bucket.website.id
      CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.website.id
      ENTRA_TENANT_ID            = var.entra_tenant_id
      ENTRA_CLIENT_ID            = var.entra_client_id
      STRIPE_SECRET_KEY          = var.stripe_secret_key
      STRIPE_WEBHOOK_SECRET      = var.stripe_webhook_secret
      PRODUCTS_TABLE             = aws_dynamodb_table.products.name
      ORDERS_TABLE               = aws_dynamodb_table.orders.name
      CARTS_TABLE                = aws_dynamodb_table.carts.name
      ANALYTICS_TABLE            = aws_dynamodb_table.analytics.name
      SITE_URL                   = local.site_url
      GOOGLE_CLIENT_ID           = var.google_client_id
      CLOUDFRONT_DOMAIN          = aws_cloudfront_distribution.website.domain_name
    }
  }
}

# ── API Gateway (HTTP API v2) ─────────────────────────────────────────

resource "aws_apigatewayv2_api" "content_api" {
  name          = "${var.project_name}-content-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "Stripe-Signature"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "content_api" {
  api_id                 = aws_apigatewayv2_api.content_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.content_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_content" {
  api_id    = aws_apigatewayv2_api.content_api.id
  route_key = "GET /content"
  target    = "integrations/${aws_apigatewayv2_integration.content_api.id}"
}

resource "aws_apigatewayv2_route" "post_content" {
  api_id    = aws_apigatewayv2_api.content_api.id
  route_key = "POST /content"
  target    = "integrations/${aws_apigatewayv2_integration.content_api.id}"
}

# Catch-all route — handles all /shop/* endpoints (explicit routes above take priority)
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.content_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.content_api.id}"
}

resource "aws_apigatewayv2_stage" "content_api" {
  api_id      = aws_apigatewayv2_api.content_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "content_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.content_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.content_api.execution_arn}/*/*"
}
