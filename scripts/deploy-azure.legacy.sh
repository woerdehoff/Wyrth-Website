#!/usr/bin/env bash
# deploy-azure.sh — Deploy Wyrth Website to Azure
#
# Prerequisites:
#   - az login (same Entra tenant as the site)
#   - terraform >= 1.0
#   - Node.js + npm
#
# One-time Terraform state bootstrap:
#   az group create -n wyrth-website-tfstate -l eastus
#   az storage account create -n wyrthwebsitetfstate -g wyrth-website-tfstate -l eastus --sku Standard_LRS
#   az storage container create -n tfstate --account-name wyrthwebsitetfstate
#
# Usage:
#   ./deploy-azure.sh --env dev
#   ./deploy-azure.sh --env prod --yes
#   ./deploy-azure.sh --env dev --plan
#
# Secrets:
#   JWT_SECRET=... \
#   MAIL_CLIENT_ID=... \
#   MAIL_CLIENT_SECRET=... \
#   STRIPE_SECRET_KEY=sk_... \
#   STRIPE_WEBHOOK_SECRET=whsec_... \
#   ./deploy-azure.sh --env dev

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$SCRIPT_DIR/terraform/azure"
API_DIR="$SCRIPT_DIR/azure-api"

ENV=""
PLAN_ONLY=false
AUTO_APPROVE=false
SKIP_INFRA=false
SKIP_BUILD=false
SKIP_DEPLOY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    --plan) PLAN_ONLY=true; shift ;;
    --yes|-y) AUTO_APPROVE=true; shift ;;
    --skip-infra) SKIP_INFRA=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-deploy) SKIP_DEPLOY=true; shift ;;
    -h|--help)
      sed -n '1,35p' "$0" | tail -n +2
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
echo "Wyrth Website — Azure Deploy"
echo "  Environment : ${DISPLAY_ENV}"
echo "  Var file    : ${VAR_FILE}"
echo "  Backend key : ${BACKEND_KEY}"
echo "=================================================="
echo

if [[ "$ENV" == "prod" && "$PLAN_ONLY" == "false" && "$AUTO_APPROVE" == "false" ]]; then
  read -rp "Type 'prod' to deploy to Azure PRODUCTION: " CONFIRM
  [[ "$CONFIRM" == "prod" ]] || { echo "Aborted."; exit 1; }
fi

cd "$TF_DIR"

TF_VAR_ARGS=("-var-file=${VAR_FILE}")

[[ -n "${JWT_SECRET:-}"             ]] && export TF_VAR_jwt_secret="$JWT_SECRET"
[[ -n "${MAIL_CLIENT_ID:-}"         ]] && export TF_VAR_mail_client_id="$MAIL_CLIENT_ID"
[[ -n "${MAIL_CLIENT_SECRET:-}"     ]] && export TF_VAR_mail_client_secret="$MAIL_CLIENT_SECRET"
[[ -n "${STRIPE_SECRET_KEY:-}"      ]] && export TF_VAR_stripe_secret_key="$STRIPE_SECRET_KEY"
[[ -n "${STRIPE_WEBHOOK_SECRET:-}"  ]] && export TF_VAR_stripe_webhook_secret="$STRIPE_WEBHOOK_SECRET"

if [[ -f "secrets.tfvars" ]]; then
  TF_VAR_ARGS+=("-var-file=secrets.tfvars")
elif [[ -f "secrets-${ENV}.tfvars" ]]; then
  TF_VAR_ARGS+=("-var-file=secrets-${ENV}.tfvars")
fi

if $PLAN_ONLY; then
  terraform init -reconfigure -backend-config="key=${BACKEND_KEY}"
  terraform plan "${TF_VAR_ARGS[@]}"
  exit 0
fi

if ! $SKIP_INFRA; then
  terraform init -reconfigure -backend-config="key=${BACKEND_KEY}"
  if $AUTO_APPROVE; then
    terraform apply -auto-approve "${TF_VAR_ARGS[@]}"
  else
    terraform apply "${TF_VAR_ARGS[@]}"
  fi
else
  terraform init -reconfigure -backend-config="key=${BACKEND_KEY}" -input=false > /dev/null
fi

CONTENT_API_URL=$(terraform output -raw content_api_url 2>/dev/null || echo "")
GOOGLE_CLIENT_ID=$(terraform output -raw google_client_id 2>/dev/null || echo "")
SITE_URL=$(terraform output -raw site_url 2>/dev/null || echo "")
CDN_HOST=$(terraform output -raw cdn_hostname 2>/dev/null || echo "")
ENTRA_TENANT_ID=$(terraform output -raw entra_tenant_id 2>/dev/null || echo "")
ENTRA_CLIENT_ID=$(terraform output -raw entra_client_id 2>/dev/null || echo "")
STORAGE_ACCOUNT=$(terraform output -raw storage_account_name 2>/dev/null || echo "")
RG_NAME=$(terraform output -raw resource_group_name 2>/dev/null || echo "")
FUNC_APP=$(terraform output -raw function_app_name 2>/dev/null || echo "wyrth-website-${ENV}-api")
FD_HOST=$(terraform output -raw front_door_hostname 2>/dev/null || echo "")
DNS_TOKEN=$(terraform output -raw custom_domain_validation_token 2>/dev/null || echo "")

cd "$SCRIPT_DIR"

if ! $SKIP_BUILD; then
  echo "→ Building React app..."
  VITE_CONTENT_API_URL="$CONTENT_API_URL" \
  VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  VITE_CDN_URL="https://${CDN_HOST}" \
  VITE_ENTRA_TENANT_ID="$ENTRA_TENANT_ID" \
  VITE_ENTRA_CLIENT_ID="$ENTRA_CLIENT_ID" \
  VITE_APP_ENV="$VITE_APP_ENV" \
  npm run build

  echo "→ Packaging Azure Functions API..."
  cd "$API_DIR"
  zip -r "$TF_DIR/api-src.zip" . -x 'node_modules/*' -x '*.git*' -x 'local.settings.json' > /dev/null
  cd "$SCRIPT_DIR"
fi

if ! $SKIP_DEPLOY && ! $SKIP_BUILD; then
  echo "→ Uploading static site to Azure Storage..."
  STORAGE_KEY=$(az storage account keys list -g "$RG_NAME" -n "$STORAGE_ACCOUNT" --query "[0].value" -o tsv)
  az storage blob upload-batch \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --destination '$web' \
    --source dist/ \
    --overwrite \
    --only-show-errors
  # index.html must not be cached — it references hashed asset bundles that change each deploy
  az storage blob upload \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --container-name '$web' \
    --name index.html \
    --file dist/index.html \
    --content-cache "no-cache, no-store, must-revalidate" \
    --overwrite \
    --only-show-errors

  FD_PROFILE="${FUNC_APP/-api/-fd}"
  FD_ENDPOINT="${FUNC_APP%-api}"
  echo "→ Purging Front Door cache..."
  az afd endpoint purge \
    --resource-group "$RG_NAME" \
    --profile-name "$FD_PROFILE" \
    --endpoint-name "$FD_ENDPOINT" \
    --domains "${SITE_URL#https://}" \
    --content-paths '/*' \
    --no-wait \
    --only-show-errors 2>/dev/null || true

  echo "→ Deploying Azure Functions API..."
  az functionapp deployment source config-zip \
    -g "$RG_NAME" \
    -n "$FUNC_APP" \
    --src "$TF_DIR/api-src.zip" \
    --build-remote true \
    --timeout 600

  echo
  echo "✅ Azure deployment complete!"
  echo "🌐 Site:  ${SITE_URL}"
  echo "🔌 API:   ${CONTENT_API_URL}"
  if [[ -n "$FD_HOST" && -n "$DNS_TOKEN" && "$DNS_TOKEN" != "null" ]]; then
    FD_CNAME="${FD_HOST#https://}"
    CUSTOM_HOST="${SITE_URL#https://}"
    CUSTOM_LABEL="${CUSTOM_HOST%%.*}"
    echo
    echo "📋 GoDaddy DNS (required for HTTPS on ${CUSTOM_HOST}):"
    echo "   CNAME  ${CUSTOM_LABEL}  →  ${FD_CNAME}"
    echo "   TXT    _dnsauth.${CUSTOM_LABEL}  →  ${DNS_TOKEN}"
    echo "   Remove any CNAME pointing ${CUSTOM_LABEL} at *.web.core.windows.net"
  fi
else
  echo "Build artifacts ready (not deployed)."
fi