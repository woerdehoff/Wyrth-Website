#!/usr/bin/env bash
# deploy-aws.sh — Deploy Wyrth Website to AWS (S3 + CloudFront + Lambda + DynamoDB)
#
# Prerequisites:
#   - aws login / credentials configured
#   - terraform >= 1.0
#   - Node.js + npm
#   - One-time: ./scripts/bootstrap-aws-state.sh
#
# Usage:
#   ./deploy-aws.sh --env dev
#   ./deploy-aws.sh --env prod --yes
#   ./deploy-aws.sh --env dev --plan
#
# Secrets (env vars recommended):
#   JWT_SECRET=... \
#   STRIPE_SECRET_KEY=sk_... \
#   STRIPE_WEBHOOK_SECRET=whsec_... \
#   ./deploy-aws.sh --env dev
#
# Magic-link email uses Amazon SES (MAIL_FROM in *.tfvars, e.g. noreply@wyrthco.com).
# Domain must be verified in SES; production sending requires leaving the SES sandbox.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$SCRIPT_DIR/terraform/aws"
API_DIR="$SCRIPT_DIR/api"

ENV=""
PLAN_ONLY=false
AUTO_APPROVE=false
SKIP_INFRA=false
SKIP_BUILD=false
SKIP_DEPLOY=false

AWS_REGION="${AWS_REGION:-us-east-1}"
# Existing state bucket in this account (see S3 console)
TF_STATE_BUCKET="${TF_STATE_BUCKET:-wyrth-website-tfstate}"
# Optional DynamoDB lock table — only used if it exists / you create it
TF_LOCK_TABLE="${TF_LOCK_TABLE:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    --plan) PLAN_ONLY=true; shift ;;
    --yes|-y) AUTO_APPROVE=true; shift ;;
    --skip-infra) SKIP_INFRA=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-deploy) SKIP_DEPLOY=true; shift ;;
    -h|--help)
      sed -n '1,40p' "$0" | tail -n +2
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

[[ -n "$ENV" ]] || { echo "ERROR: --env is required (dev, test, prod)" >&2; exit 1; }
case "$ENV" in dev|test|prod) ;; *) echo "ERROR: invalid env" >&2; exit 1 ;; esac

case "$ENV" in
  prod)  VITE_APP_ENV=""         ; DISPLAY_ENV="PROD" ;;
  test)  VITE_APP_ENV=" · TEST"  ; DISPLAY_ENV="TEST" ;;
  dev)   VITE_APP_ENV=" · DEV"   ; DISPLAY_ENV="DEV"  ;;
esac

VAR_FILE="${ENV}.tfvars"
BACKEND_KEY="wyrth-website/${ENV}/terraform.tfstate"

echo "=================================================="
echo "Wyrth Website — AWS Deploy"
echo "  Environment : ${DISPLAY_ENV}"
echo "  Region      : ${AWS_REGION}"
echo "  Var file    : ${VAR_FILE}"
echo "  State key   : ${BACKEND_KEY}"
echo "=================================================="
echo

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ERROR: AWS credentials not available. Run: aws login" >&2
  exit 1
fi
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"

if [[ "$ENV" == "prod" && "$PLAN_ONLY" == "false" && "$AUTO_APPROVE" == "false" ]]; then
  read -rp "Type 'prod' to deploy to AWS PRODUCTION: " CONFIRM
  [[ "$CONFIRM" == "prod" ]] || { echo "Aborted."; exit 1; }
fi

cd "$TF_DIR"

TF_VAR_ARGS=("-var-file=${VAR_FILE}")

[[ -n "${JWT_SECRET:-}"             ]] && export TF_VAR_jwt_secret="$JWT_SECRET"
[[ -n "${STRIPE_SECRET_KEY:-}"      ]] && export TF_VAR_stripe_secret_key="$STRIPE_SECRET_KEY"
[[ -n "${STRIPE_WEBHOOK_SECRET:-}"  ]] && export TF_VAR_stripe_webhook_secret="$STRIPE_WEBHOOK_SECRET"

if [[ -f "secrets.tfvars" ]]; then
  TF_VAR_ARGS+=("-var-file=secrets.tfvars")
elif [[ -f "secrets-${ENV}.tfvars" ]]; then
  TF_VAR_ARGS+=("-var-file=secrets-${ENV}.tfvars")
fi

BACKEND_ARGS=(
  -backend-config="bucket=${TF_STATE_BUCKET}"
  -backend-config="key=${BACKEND_KEY}"
  -backend-config="region=${AWS_REGION}"
  -backend-config="encrypt=true"
)
if [[ -n "${TF_LOCK_TABLE}" ]]; then
  BACKEND_ARGS+=(-backend-config="dynamodb_table=${TF_LOCK_TABLE}")
fi

if $PLAN_ONLY; then
  terraform init -reconfigure "${BACKEND_ARGS[@]}"
  terraform plan "${TF_VAR_ARGS[@]}"
  exit 0
fi

if ! $SKIP_INFRA; then
  terraform init -reconfigure "${BACKEND_ARGS[@]}"
  if $AUTO_APPROVE; then
    terraform apply -auto-approve "${TF_VAR_ARGS[@]}"
  else
    terraform apply "${TF_VAR_ARGS[@]}"
  fi
else
  terraform init -reconfigure "${BACKEND_ARGS[@]}" -input=false > /dev/null
fi

SITE_BUCKET=$(terraform output -raw site_bucket)
CDN_HOST=$(terraform output -raw cloudfront_domain_name)
CF_ID=$(terraform output -raw cloudfront_distribution_id)
CONTENT_API_URL=$(terraform output -raw content_api_url)
SITE_URL=$(terraform output -raw site_url)
GOOGLE_CLIENT_ID=$(terraform output -raw google_client_id)
ENTRA_TENANT_ID=$(terraform output -raw entra_tenant_id)
ENTRA_CLIENT_ID=$(terraform output -raw entra_client_id)
LAMBDA_NAME=$(terraform output -raw lambda_function_name)
REGION=$(terraform output -raw aws_region)

cd "$SCRIPT_DIR"

echo "→ Enforcing AWS resource tags..."
python3 <<PY
import json, subprocess
bucket = "${SITE_BUCKET}"
project = "wyrth-website"
try:
    raw = subprocess.check_output(
        ["aws", "s3api", "get-bucket-tagging", "--bucket", bucket],
        text=True,
        stderr=subprocess.DEVNULL,
    )
    tags = json.loads(raw).get("TagSet", [])
except Exception:
    tags = []

tags = [t for t in tags if t.get("Key") != "Project"]
tags.append({"Key": "Project", "Value": project})
path = "/tmp/wyrth-site-tags.json"
with open(path, "w", encoding="utf-8") as fh:
    json.dump({"TagSet": tags}, fh)
subprocess.check_call(
    ["aws", "s3api", "put-bucket-tagging", "--bucket", bucket, "--tagging", f"file://{path}"]
)
PY

LAMBDA_ARN="$(aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" --query 'Configuration.FunctionArn' --output text)"
aws lambda tag-resource \
  --resource "$LAMBDA_ARN" \
  --tags Project=wyrth-website Environment="$ENV"

CF_ARN="arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${CF_ID}"
aws cloudfront tag-resource \
  --resource "$CF_ARN" \
  --tags "Items=[{Key=Project,Value=wyrth-website},{Key=Environment,Value=${ENV}}]"

if ! $SKIP_BUILD; then
  echo "→ Building React app..."
  VITE_CONTENT_API_URL="$CONTENT_API_URL" \
  VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  VITE_CDN_URL="https://${CDN_HOST}" \
  VITE_ENTRA_TENANT_ID="$ENTRA_TENANT_ID" \
  VITE_ENTRA_CLIENT_ID="$ENTRA_CLIENT_ID" \
  VITE_APP_ENV="$VITE_APP_ENV" \
  npm run build

  echo "→ Packaging Lambda API..."
  rm -f "$TF_DIR/api-deploy.zip"
  cd "$API_DIR"
  npm ci --omit=dev
  zip -r "$TF_DIR/api-deploy.zip" . \
    -x '*.git*' \
    -x 'local.settings.json' \
    -x '*/.DS_Store' \
    > /dev/null
  cd "$SCRIPT_DIR"
fi

if ! $SKIP_DEPLOY && ! $SKIP_BUILD; then
  echo "→ Uploading static site to S3..."
  aws s3 sync dist/ "s3://${SITE_BUCKET}/" \
    --region "$REGION" \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "index.html" \
    --exclude "content.json"

  # index.html must not be long-cached — references hashed assets
  aws s3 cp dist/index.html "s3://${SITE_BUCKET}/index.html" \
    --region "$REGION" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

  echo "→ Deploying Lambda code (${LAMBDA_NAME})..."
  aws lambda update-function-code \
    --function-name "$LAMBDA_NAME" \
    --zip-file "fileb://${TF_DIR}/api-deploy.zip" \
    --region "$REGION" \
    --output text \
    --query 'FunctionName'

  aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION"

  # Sync env vars (secrets + bucket/site URLs) without replacing the function
  if LAMBDA_ENV_JSON=$(cd "$TF_DIR" && terraform output -raw lambda_env_json 2>/dev/null); then
    echo "→ Updating Lambda environment variables..."
    # Merge with existing Lambda env so empty secrets on this run don't wipe live values
    ENV_FILE=$(mktemp)
    EXISTING_ENV=$(aws lambda get-function-configuration \
      --function-name "$LAMBDA_NAME" \
      --region "$REGION" \
      --query 'Environment.Variables' \
      --output json 2>/dev/null || echo '{}')
    python3 -c "
import json, sys
existing = json.loads(sys.argv[1]) or {}
incoming = json.loads(sys.argv[2]) or {}
# Start from what Lambda already has, then overlay non-empty terraform values
merged = dict(existing)
for k, v in incoming.items():
    if v is not None and v != '':
        merged[k] = v
# Drop retired Graph mail credentials if still present
for k in ('MAIL_CLIENT_ID', 'MAIL_CLIENT_SECRET'):
    merged.pop(k, None)
print(json.dumps({'Variables': merged}))
" "$EXISTING_ENV" "$LAMBDA_ENV_JSON" > "$ENV_FILE"
    aws lambda update-function-configuration \
      --function-name "$LAMBDA_NAME" \
      --environment "file://${ENV_FILE}" \
      --region "$REGION" \
      --output text \
      --query 'FunctionName' >/dev/null
    rm -f "$ENV_FILE"
    aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION"
  fi

  echo "→ Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id "$CF_ID" \
    --paths "/*" \
    --output text \
    --query 'Invalidation.Id' >/dev/null || true

  echo
  echo "✅ AWS deployment complete!"
  echo "🌐 Site:  ${SITE_URL}"
  echo "🔌 API:   ${CONTENT_API_URL}"
  echo "📦 Bucket:${SITE_BUCKET}"
  echo "☁️  CDN:   https://${CDN_HOST}"
  echo
  echo "Next:"
  echo "  • Set admin_emails in terraform/aws/${ENV}.tfvars and re-apply"
  echo "  • Point Stripe webhook to: ${CONTENT_API_URL}/shop/webhook"
  echo "  • When ready for custom domain, set custom_domain in tfvars and re-apply"
else
  echo "Build artifacts ready (not deployed)."
fi
