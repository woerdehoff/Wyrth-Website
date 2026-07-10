#!/usr/bin/env bash
# Print CloudFront → S3 origin mapping for Wyrth distributions.
# Usage: ./scripts/discover-static-origins.sh
set -euo pipefail

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ERROR: AWS credentials not available. Run: aws login" >&2
  exit 1
fi

# Known Wyrth distributions (from console)
declare -A KNOWN=(
  [EJTKH2O123SKG]=dev
  [E762JKC0VIOMO]=test
  [E18DWUHK7XG807]=prod
)

echo "CloudFront → S3 origin discovery"
echo "================================"
echo

for id in EJTKH2O123SKG E762JKC0VIOMO E18DWUHK7XG807; do
  env="${KNOWN[$id]}"
  cfg=$(aws cloudfront get-distribution-config --id "$id" --output json 2>/dev/null || true)
  if [[ -z "$cfg" ]]; then
    echo "${env} (${id}): not found / no access"
    echo
    continue
  fi

  enabled=$(echo "$cfg" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['DistributionConfig']['Enabled'])")
  aliases=$(echo "$cfg" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d['DistributionConfig'].get('Aliases',{}).get('Items') or []; print(','.join(items) or '-')")
  domain=$(echo "$cfg" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['DistributionConfig']['Origins']['Items'][0]['DomainName'])")
  # strip .s3.amazonaws.com / .s3.region.amazonaws.com / .s3-website-...
  bucket=$(echo "$domain" | sed -E 's/\.s3([.-][a-z0-9-]+)?\.amazonaws\.com$//; s/\.s3-website[.-][a-z0-9-]+\.amazonaws\.com$//')

  echo "env:    ${env}"
  echo "cf_id:  ${id}"
  echo "enabled:${enabled}"
  echo "alias:  ${aliases}"
  echo "origin: ${domain}"
  echo "bucket: ${bucket}"
  echo "tfvars: existing_cloudfront_distribution_id = \"${id}\""
  echo "        existing_site_bucket                = \"${bucket}\""
  echo
done
