#!/usr/bin/env bash
# deploy.sh — Build the React app and deploy it to S3 + CloudFront
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - Terraform has been applied at least once (terraform/ state exists)
#   - jq installed (brew install jq)
#
# Usage: ./deploy.sh

set -euo pipefail

echo "Reading Terraform outputs..."
cd "$(dirname "$0")/terraform"

BUCKET=$(terraform output -raw s3_bucket_name)
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
SITE_URL=$(terraform output -raw cloudfront_url)
CONTENT_API_URL=$(terraform output -raw content_api_url)

cd ..

echo ""
echo "Building React app..."
VITE_CONTENT_API_URL="$CONTENT_API_URL" npm run build

echo ""
echo "Uploading to S3 bucket: $BUCKET"
aws s3 sync dist/ "s3://$BUCKET" --delete

echo ""
echo "Invalidating CloudFront cache (distribution: $DISTRIBUTION_ID)..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Live at: $SITE_URL"
