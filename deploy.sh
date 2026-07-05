#!/usr/bin/env bash
# deploy.sh — Multi-environment deploy for Wyrth Website (terminal / no Jenkins)
#
# This script replaces the previous Jenkins-based pipeline.
# It supports dev, test, and prod environments using the same Terraform
# remote state backend and build variable injection that Jenkins used to do.
#
# Prerequisites:
#   - AWS CLI configured with sufficient permissions
#   - Terraform >= 1.0
#   - Node.js + npm
#
# Usage:
#   ./deploy.sh --env dev                 # Deploy to dev environment
#   ./deploy.sh --env test                # Deploy to test
#   ./deploy.sh --env prod --yes          # Deploy to prod (skip confirmation)
#   ./deploy.sh --env dev --plan          # Only run terraform plan
#
# Secrets (recommended):
#   STRIPE_SECRET_KEY=sk_... \
#   STRIPE_WEBHOOK_SECRET=whsec_... \
#   JWT_SECRET=... \
#   ./deploy.sh --env prod
#
# You can also create terraform/secrets.tfvars (gitignored) with the secret values.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"

ENV=""
PLAN_ONLY=false
AUTO_APPROVE=false
SKIP_INFRA=false
SKIP_BUILD=false
SKIP_DEPLOY=false

# --- Parse arguments ----------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV="$2"
      shift 2
      ;;
    --plan)
      PLAN_ONLY=true
      shift
      ;;
    --yes|-y)
      AUTO_APPROVE=true
      shift
      ;;
    --skip-infra)
      SKIP_INFRA=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-deploy)
      SKIP_DEPLOY=true
      shift
      ;;
    -h|--help)
      sed -n '1,40p' "$0" | tail -n +2
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Run './deploy.sh --help' for usage." >&2
      exit 1
      ;;
  esac
done

# --- Validate environment ----------------------------------------------
if [[ -z "$ENV" ]]; then
  echo "ERROR: --env is required (one of: dev, test, prod)" >&2
  exit 1
fi

case "$ENV" in
  dev|test|prod) ;;
  *) echo "ERROR: Invalid env '$ENV'. Must be dev, test, or prod." >&2; exit 1 ;;
esac

# Map to Terraform environment key and display name
TF_ENV="$ENV"
case "$ENV" in
  prod)  VITE_APP_ENV=""           ; DISPLAY_ENV="PROD"  ;;
  test)  VITE_APP_ENV=" · TEST"    ; DISPLAY_ENV="TEST"  ;;
  dev)   VITE_APP_ENV=" · DEV"     ; DISPLAY_ENV="DEV"   ;;
esac

VAR_FILE="${TF_ENV}.tfvars"
BACKEND_KEY="wyrth-website/${TF_ENV}/terraform.tfstate"

echo "=================================================="
echo "Wyrth Website — Terminal Deploy"
echo "  Environment : ${DISPLAY_ENV}"
echo "  Var file    : ${VAR_FILE}"
echo "  Backend key : ${BACKEND_KEY}"
if $PLAN_ONLY; then echo "  Mode        : PLAN ONLY (no apply, no build/deploy)"; fi
echo "=================================================="
echo

# --- Safety prompt for production --------------------------------------
if [[ "$ENV" == "prod" && "$PLAN_ONLY" == "false" && "$AUTO_APPROVE" == "false" ]]; then
  echo "⚠️  You are about to deploy to PRODUCTION."
  read -rp "Type 'prod' to continue: " CONFIRM
  if [[ "$CONFIRM" != "prod" ]]; then
    echo "Aborted."
    exit 1
  fi
  echo
fi

cd "$TERRAFORM_DIR"

# --- Prepare Terraform variables & secrets -----------------------------
TF_VAR_ARGS=("-var-file=${VAR_FILE}")

# Support secrets via environment variables (TF_VAR_*)
# This matches exactly how the old Jenkins pipeline injected them.
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  export TF_VAR_stripe_secret_key="$STRIPE_SECRET_KEY"
  echo "✓ Using STRIPE_SECRET_KEY from environment"
fi
if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  export TF_VAR_stripe_webhook_secret="$STRIPE_WEBHOOK_SECRET"
  echo "✓ Using STRIPE_WEBHOOK_SECRET from environment"
fi
if [[ -n "${JWT_SECRET:-}" ]]; then
  export TF_VAR_jwt_secret="$JWT_SECRET"
  echo "✓ Using JWT_SECRET from environment"
fi

# Optional local secrets file (never committed)
if [[ -f "secrets.tfvars" ]]; then
  TF_VAR_ARGS+=("-var-file=secrets.tfvars")
  echo "✓ Including secrets.tfvars"
elif [[ -f "secrets-${TF_ENV}.tfvars" ]]; then
  TF_VAR_ARGS+=("-var-file=secrets-${TF_ENV}.tfvars")
  echo "✓ Including secrets-${TF_ENV}.tfvars"
fi

echo

# --- Handle PLAN mode early (never build or deploy) --------------------
if $PLAN_ONLY; then
  if ! $SKIP_INFRA; then
    echo "→ Initializing Terraform (remote state)..."
    terraform init -reconfigure -backend-config="key=${BACKEND_KEY}"
    echo
    echo "→ Running terraform plan for ${DISPLAY_ENV}..."
    terraform plan "${TF_VAR_ARGS[@]}"
  else
    echo "→ Skipping Terraform ( --skip-infra ) — nothing to plan."
  fi
  echo
  echo "✅ Plan complete. No apply or frontend deploy performed."
  exit 0
fi

# --- Terraform Init + Apply (only for real deployments) ---------------
if ! $SKIP_INFRA; then
  echo "→ Initializing Terraform (remote state)..."
  terraform init -reconfigure -backend-config="key=${BACKEND_KEY}"
  echo

  echo "→ Running terraform apply..."
  if $AUTO_APPROVE; then
    terraform apply -auto-approve "${TF_VAR_ARGS[@]}"
  else
    terraform apply "${TF_VAR_ARGS[@]}"
  fi
  echo
else
  echo "→ Skipping Terraform ( --skip-infra )"
fi

# --- Capture outputs for the React build -------------------------------
if ! $SKIP_BUILD; then
  echo "→ Reading Terraform outputs for build..."
  CONTENT_API_URL=$(terraform output -raw content_api_url 2>/dev/null || echo "")
  GOOGLE_CLIENT_ID=$(terraform output -raw google_client_id 2>/dev/null || echo "")
  CLOUDFRONT_URL=$(terraform output -raw cloudfront_url 2>/dev/null || echo "")
  ENTRA_TENANT_ID=$(terraform output -raw entra_tenant_id 2>/dev/null || echo "")
  ENTRA_CLIENT_ID=$(terraform output -raw entra_client_id 2>/dev/null || echo "")

  echo "   CONTENT_API_URL     = ${CONTENT_API_URL:-<empty>}"
  echo "   GOOGLE_CLIENT_ID    = ${GOOGLE_CLIENT_ID:-<empty>}"
  echo "   CLOUDFRONT_URL      = ${CLOUDFRONT_URL:-<empty>}"
  echo "   VITE_APP_ENV        = '${VITE_APP_ENV}'"
  echo
fi

cd "$SCRIPT_DIR"

# --- Build React app ---------------------------------------------------
if ! $SKIP_BUILD; then
  echo "→ Building React app..."
  VITE_CONTENT_API_URL="$CONTENT_API_URL" \
  VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  VITE_CLOUDFRONT_URL="$CLOUDFRONT_URL" \
  VITE_ENTRA_TENANT_ID="$ENTRA_TENANT_ID" \
  VITE_ENTRA_CLIENT_ID="$ENTRA_CLIENT_ID" \
  VITE_APP_ENV="$VITE_APP_ENV" \
  npm run build
  echo "   Build complete → dist/"
  echo
else
  echo "→ Skipping build ( --skip-build )"
fi

# --- Deploy to S3 + CloudFront invalidation ----------------------------
if ! $SKIP_DEPLOY && ! $SKIP_BUILD; then
  echo "→ Reading final Terraform outputs for deployment..."
  cd "$TERRAFORM_DIR"
  BUCKET=$(terraform output -raw s3_bucket_name)
  DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
  SITE_URL=$(terraform output -raw cloudfront_url)
  cd "$SCRIPT_DIR"

  echo "→ Uploading to S3: s3://${BUCKET}"
  aws s3 sync dist/ "s3://${BUCKET}" \
    --delete \
    --exclude "uploads/*" \
    --exclude "content.json" \
    --exclude "content-draft.json"

  echo
  echo "→ Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" >/dev/null

  echo
  echo "✅ Deployment complete!"
  echo "🌐 Live at: $SITE_URL"
else
  if $SKIP_DEPLOY; then
    echo "→ Skipping S3 + CloudFront deploy ( --skip-deploy )"
  fi
  if [[ -d dist ]]; then
    echo "Build output is ready in ./dist (not deployed)."
  fi
fi
