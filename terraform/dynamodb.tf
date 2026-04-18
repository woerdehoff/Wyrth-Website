# -----------------------------------------------------------------------
# dynamodb.tf — DynamoDB tables for the Wyrth shop (products + orders + carts)
# -----------------------------------------------------------------------

resource "aws_dynamodb_table" "products" {
  name         = "${var.project_name}-products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "productId"

  attribute {
    name = "productId"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-products"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "orders" {
  name         = "${var.project_name}-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-orders"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "carts" {
  name         = "${var.project_name}-carts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Name        = "${var.project_name}-carts"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "analytics" {
  name         = "${var.project_name}-analytics"
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

  tags = {
    Name        = "${var.project_name}-analytics"
    Project     = var.project_name
    Environment = var.environment
  }
}
