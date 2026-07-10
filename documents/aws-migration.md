# AWS Migration (Wyrth Website)

Move from Azure (Blob + Front Door + Functions + Cosmos) to AWS for lower fixed cost.

**Static hosting already exists** on AWS (legacy CloudFront + S3). Terraform **reuses** those and only creates the API/data layer.

## Target architecture

| Layer | AWS service |
|-------|-------------|
| Static site | **Existing S3 + CloudFront** (reuse — do not recreate) |
| CDN / HTTPS / custom domains | Existing distributions (certs + aliases already set) |
| API | Lambda (Node 22) + API Gateway HTTP API (**new**) |
| Data | DynamoDB on-demand (**new**) |
| Uploads | Same S3 bucket (`uploads/`) via presigned PUT |
| Admin auth | Microsoft Entra ID (unchanged) |
| Customer auth | Google + magic link via **Amazon SES** |
| Payments | Stripe (unchanged) |

New resources are tagged `wyrth=true`.

### Existing static hosting (wired into tfvars)

| Env | CloudFront ID | S3 bucket | Domain |
|-----|---------------|-----------|--------|
| dev | `EJTKH2O123SKG` | `wrythco-website-dev` | dev.wyrthco.com |
| test | `E762JKC0VIOMO` | `wrythco-website-test` | test.wyrthco.com (CF may be Disabled) |
| prod | `E18DWUHK7XG807` | `wrythco-website` | www.wyrthco.com |

Terraform state bucket (already exists): `wyrth-website-tfstate`

## One-time setup

```bash
aws login

# Optional: create DynamoDB lock table if you want state locking
./scripts/bootstrap-aws-state.sh
```

## Deploy

```bash
JWT_SECRET=... \
STRIPE_SECRET_KEY=sk_... \
STRIPE_WEBHOOK_SECRET=whsec_... \
./deploy-aws.sh --env dev

./deploy-aws.sh --env dev --plan
./deploy-aws.sh --env prod
```

Or: `npm run deploy:aws:dev`

Deploy will:
1. Create Lambda + API Gateway + DynamoDB (if not present)
2. Build the React app
3. Sync `dist/` to the **existing** S3 bucket
4. Update Lambda code
5. Invalidate the **existing** CloudFront distribution

## After first deploy

1. Open **https://dev.wyrthco.com** (or the printed site URL) and the API URL.
2. Set `admin_emails` in tfvars, re-deploy.
3. Stripe webhook → `{content_api_url}/shop/webhook`.
4. Confirm Entra + Google OAuth redirect URIs include the site origin.
5. Magic-link email: SES domain `wyrthco.com` verified; `mail_from` = `noreply@wyrthco.com`.
   Leave the SES sandbox (production access) so any customer email can receive links.
   Until then, verify each test recipient in SES.

## Repo layout

| Path | Purpose |
|------|---------|
| `api/` | Lambda API (DynamoDB + S3 adapters) |
| `azure-api/` | Legacy Azure Functions (until cutover) |
| `terraform/aws/` | AWS Terraform (reuse CF/S3 + new API) |
| `deploy-aws.sh` | Infra + build + S3 sync + Lambda zip |
| `scripts/discover-static-origins.sh` | Map CF IDs → S3 buckets |

## Cost notes

- **No new CloudFront base fee** — you already pay usage on existing distributions.
- New cost is mostly Lambda + API Gateway + DynamoDB (pay-per-use; usually low for this site).
- Azure Front Door (~$35 × envs) can go away after cutover.
