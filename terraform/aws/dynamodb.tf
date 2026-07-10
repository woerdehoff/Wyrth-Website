# -----------------------------------------------------------------------
# dynamodb.tf — Shop / cart / analytics tables
# -----------------------------------------------------------------------

resource "aws_dynamodb_table" "products" {
  count        = var.manage_dynamodb ? 1 : 0
  name         = "${local.dynamo_prefix}-products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "productId"

  attribute {
    name = "productId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "orders" {
  count        = var.manage_dynamodb ? 1 : 0
  name         = "${local.dynamo_prefix}-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "carts" {
  count        = var.manage_dynamodb ? 1 : 0
  name         = "${local.dynamo_prefix}-carts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "magic_tokens" {
  count        = var.manage_dynamodb ? 1 : 0
  name         = "${local.dynamo_prefix}-magic-tokens"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "token"

  attribute {
    name = "token"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "analytics" {
  count        = var.manage_dynamodb ? 1 : 0
  name         = "${local.dynamo_prefix}-analytics"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
