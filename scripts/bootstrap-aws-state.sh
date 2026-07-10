#!/usr/bin/env bash
# One-time: create S3 backend bucket + DynamoDB lock table for Terraform state.
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
# Prefer the existing account bucket if present
BUCKET="${TF_STATE_BUCKET:-wyrth-website-tfstate}"
TABLE="${TF_LOCK_TABLE:-wyrth-website-tf-locks}"

echo "Bootstrapping Terraform state in ${REGION} (account ${ACCOUNT_ID})"
echo "  bucket: ${BUCKET}"
echo "  locks:  ${TABLE}"
echo

if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Bucket already exists."
else
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  aws s3api put-bucket-versioning --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled
  aws s3api put-bucket-encryption --bucket "$BUCKET" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  echo "Created state bucket."
fi

# Billing / cost allocation — ensure state bucket is tagged wyrth-billing=true
python3 <<PY
import json, subprocess
bucket = "${BUCKET}"
try:
    raw = subprocess.check_output(["aws", "s3api", "get-bucket-tagging", "--bucket", bucket], text=True)
    tags = json.loads(raw).get("TagSet", [])
except Exception:
    tags = []
# Drop legacy "wyrth" key and re-apply current billing tag
tags = [t for t in tags if t.get("Key") not in ("wyrth", "wyrth-billing", "ManagedBy")]
tags.extend([{"Key": "wyrth-billing", "Value": "true"}, {"Key": "ManagedBy", "Value": "bootstrap"}])
path = "/tmp/wyrth-tfstate-tags.json"
json.dump({"TagSet": tags}, open(path, "w"))
subprocess.check_call(["aws", "s3api", "put-bucket-tagging", "--bucket", bucket, "--tagging", f"file://{path}"])
print(f"Tagged s3://{bucket} with wyrth-billing=true")
PY

if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  echo "Lock table already exists."
  aws dynamodb tag-resource \
    --resource-arn "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${TABLE}" \
    --tags Key=wyrth-billing,Value=true Key=ManagedBy,Value=bootstrap 2>/dev/null || true
else
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" \
    --tags Key=wyrth-billing,Value=true Key=ManagedBy,Value=bootstrap
  echo "Created lock table."
fi

echo
echo "Done. Use deploy-aws.sh — it points Terraform at:"
echo "  bucket=${BUCKET}  region=${REGION}  dynamodb_table=${TABLE}"
