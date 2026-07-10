# -----------------------------------------------------------------------
# lambda.tf — API Lambda + HTTP API Gateway
# Create new OR point at existing content-api Lambdas
# -----------------------------------------------------------------------

locals {
  use_existing_lambda = var.existing_lambda_function_name != ""
  dynamo_prefix       = var.dynamo_table_prefix != "" ? var.dynamo_table_prefix : local.name_prefix

  lambda_env = {
    SITE_URL              = local.site_url
    SITE_BUCKET           = local.site_bucket_id
    UPLOADS_BUCKET        = local.site_bucket_id
    CDN_HOST              = local.public_cdn_host
    STORAGE_CDN_HOST      = local.public_cdn_host
    DYNAMO_TABLE_PREFIX   = local.dynamo_prefix
    ENTRA_TENANT_ID       = var.entra_tenant_id
    ENTRA_CLIENT_ID       = var.entra_client_id
    GOOGLE_CLIENT_ID      = var.google_client_id
    STRIPE_SECRET_KEY     = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET = var.stripe_webhook_secret
    JWT_SECRET            = var.jwt_secret
    MAIL_FROM             = var.mail_from
    SES_FROM_EMAIL        = var.mail_from
    ADMIN_EMAILS          = var.admin_emails
    ALLOWED_ORIGINS       = local.site_url
  }

  lambda_function_name = local.use_existing_lambda ? var.existing_lambda_function_name : aws_lambda_function.api[0].function_name
  content_api_url      = local.use_existing_lambda ? var.existing_content_api_url : aws_apigatewayv2_api.api[0].api_endpoint
}

# ── Existing Lambda (code + env updated by deploy-aws.sh, not Terraform) ─

data "aws_lambda_function" "api" {
  count         = local.use_existing_lambda ? 1 : 0
  function_name = var.existing_lambda_function_name
}

# ── New Lambda (only when existing_lambda_function_name is empty) ───────

data "archive_file" "api_placeholder" {
  count       = local.use_existing_lambda ? 0 : 1
  type        = "zip"
  output_path = "${path.module}/api-placeholder.zip"

  source {
    content  = <<-JS
      export const handler = async () => ({
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API not deployed yet — run deploy-aws.sh' }),
      })
    JS
    filename = "lambda.mjs"
  }
}

resource "aws_iam_role" "api_lambda" {
  count = local.use_existing_lambda ? 0 : 1
  name  = "${local.name_prefix}-api-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "api_lambda_basic" {
  count      = local.use_existing_lambda ? 0 : 1
  role       = aws_iam_role.api_lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "api_lambda" {
  count = local.use_existing_lambda ? 0 : 1
  name  = "${local.name_prefix}-api-lambda-data"
  role  = aws_iam_role.api_lambda[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDB"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query",
        ]
        Resource = var.manage_dynamodb ? [
          aws_dynamodb_table.products[0].arn,
          aws_dynamodb_table.orders[0].arn,
          aws_dynamodb_table.carts[0].arn,
          aws_dynamodb_table.magic_tokens[0].arn,
          aws_dynamodb_table.analytics[0].arn,
        ] : ["arn:aws:dynamodb:${var.aws_region}:${local.account_id}:table/${local.dynamo_prefix}-*"]
      },
      {
        Sid    = "S3"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          local.site_bucket_arn,
          "${local.site_bucket_arn}/*",
        ]
      },
      {
        Sid    = "SES"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        Resource = ["*"]
      },
    ]
  })
}

resource "aws_lambda_function" "api" {
  count = local.use_existing_lambda ? 0 : 1

  function_name = "${local.name_prefix}-content-api"
  role          = aws_iam_role.api_lambda[0].arn
  handler       = "src/lambda.handler"
  runtime       = "nodejs22.x"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.api_placeholder[0].output_path
  source_code_hash = data.archive_file.api_placeholder[0].output_base64sha256

  environment {
    variables = local.lambda_env
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_cloudwatch_log_group" "api" {
  count             = local.use_existing_lambda ? 0 : 1
  name              = "/aws/lambda/${aws_lambda_function.api[0].function_name}"
  retention_in_days = 14
}

# ── HTTP API (new only — existing Lambdas keep their current trigger) ───

resource "aws_apigatewayv2_api" "api" {
  count         = local.use_existing_lambda ? 0 : 1
  name          = "${local.name_prefix}-http"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Content-Type", "Authorization", "Stripe-Signature"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_origins = compact([
      local.site_url,
      "http://localhost:5173",
      "http://localhost:4173",
    ])
    max_age = 3600
  }
}

resource "aws_apigatewayv2_stage" "api" {
  count       = local.use_existing_lambda ? 0 : 1
  api_id      = aws_apigatewayv2_api.api[0].id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "api" {
  count                  = local.use_existing_lambda ? 0 : 1
  api_id                 = aws_apigatewayv2_api.api[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api[0].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  count     = local.use_existing_lambda ? 0 : 1
  api_id    = aws_apigatewayv2_api.api[0].id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.api[0].id}"
}

resource "aws_apigatewayv2_route" "root" {
  count     = local.use_existing_lambda ? 0 : 1
  api_id    = aws_apigatewayv2_api.api[0].id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.api[0].id}"
}

resource "aws_lambda_permission" "api_gw" {
  count         = local.use_existing_lambda ? 0 : 1
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api[0].execution_arn}/*/*"
}
