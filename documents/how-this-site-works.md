# How This Site Works

## Overview

The Wyrth-Website is a static React app hosted on AWS. It is a premium editorial redesign of [wyrthco.com](https://wyrthco.com) — a professional salon cape brand. All site content (headlines, copy, audience cards, features, announcement banner) is editable through an admin page protected by Microsoft Entra ID SSO. No code changes are needed to update content.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Hosting | AWS S3 (private bucket) |
| CDN / HTTPS | AWS CloudFront |
| Content API | AWS Lambda (Node.js 22) + API Gateway HTTP v2 |
| Admin Auth | Microsoft Entra ID (MSAL / SSO) |
| Infrastructure | Terraform |

---

## Live Infrastructure

| Resource | Value |
|---|---|
| S3 Bucket | `wyrthco-website` |
| CloudFront Distribution ID | `E18DWUHK7XG807` |
| CloudFront URL | `https://d1detsumoaola0.cloudfront.net` |
| Content API | `https://jxc2aawsfa.execute-api.us-east-1.amazonaws.com` |
| Entra Tenant ID | `4c061c09-139b-4718-969f-b9b491911d8a` |
| Entra Client ID (App Reg) | `8938c729-223c-4481-8a20-34a5694b825f` |

---

## How the Site is Hosted

1. The React app is built with `npm run build`, producing static files in `dist/`
2. Those files are uploaded to a **private S3 bucket**
3. **CloudFront** sits in front of S3 — it handles HTTPS, caching, and serves `index.html` for all routes (enabling React Router navigation, including `/admin`)
4. Visitors never touch S3 directly — only CloudFront can read the bucket via Origin Access Identity (OAI)

---

## How Content Editing Works

All editable text lives in one place: `src/content.js` — this is the **default content**. When the site loads, it fetches `/content` from the Lambda API. If live content exists (previously saved to S3 as `content.json`), it overrides the defaults. If not, the hardcoded defaults from `content.js` are used as a fallback.

```
Browser loads site
  → fetches {CONTENT_API_URL}/content  (Lambda reads content.json from S3)
  → if found: overrides default text
  → if not found: uses defaults from src/content.js
```

### Content Sections

The content system covers:

| Section | What it controls |
|---|---|
| **Announcement** | Optional dismissible banner at the top of the page (message + optional link). `null` = hidden. |
| **Hero** | Eyebrow text, sub-headline, tagline |
| **The Cape** | Title (two lines), two body paragraphs, 4 stats, 3 badges |
| **Audiences** | 6 audience cards — tag, title, description, link (Barbers, Stylists, Colorists, Clients, Salon Owners, Brand) |
| **Features** | 6 feature cards — number, title, description |
| **Statement** | Full-width pull quote |

---

## Admin Page (`/admin`)

The admin page is an Entra SSO–protected CMS editor built into the React app.

### How login works

1. Admin navigates to `/admin`
2. MSAL (`@azure/msal-react`) checks for an existing session in `sessionStorage`
3. If not logged in, a **"Sign in with Microsoft"** button triggers `loginRedirect`
4. Azure redirects back to the site with an **ID token** (scopes: `openid`, `profile`)
5. The admin panel loads current live content from `GET /content`

### How publishing works

When you click **Publish Changes**:

1. MSAL acquires the ID token silently (`acquireTokenSilent`)
2. The browser sends the full content JSON + `Authorization: Bearer <id_token>` to `POST /content`
3. **Lambda** validates the JWT:
   - Fetches JWKS from `https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys` (1-hour module-level cache)
   - Verifies RS256 signature using Node.js built-in `node:crypto` (no external deps)
   - Checks `aud === CLIENT_ID`, `iss`, `exp`, `nbf`
4. Lambda writes `content.json` to the S3 bucket
5. Lambda issues a **CloudFront invalidation** for `/content.json` so the CDN serves the fresh version immediately
6. All visitors see the updated content within seconds

### Entra App Registration requirements

The App Registration must have the following redirect URIs configured under **Authentication → Single-page application**:

- `https://d1detsumoaola0.cloudfront.net` (production)
- `http://localhost:5173` (local dev)

---

## How to Deploy

### Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform installed
- Node.js + npm installed
- Entra App Registration created with your Tenant ID and Client ID

### First-time setup

```bash
# 1. Copy and fill in tfvars
cp terraform/example.tfvars terraform/terraform.tfvars
# Edit terraform.tfvars — add entra_tenant_id and entra_client_id

# 2. Copy and fill in .env
cp .env.example .env
# Edit .env — add VITE_ENTRA_CLIENT_ID and VITE_ENTRA_TENANT_ID

# 3. Provision AWS infrastructure
cd terraform
terraform init
terraform apply

# 4. Build and upload the site
cd ..
./deploy.sh
```

### Subsequent deploys (after code or content changes)

```bash
./deploy.sh
```

The deploy script:
1. Reads `s3_bucket_name`, `cloudfront_distribution_id`, and `content_api_url` from Terraform outputs
2. Builds the React app with `VITE_CONTENT_API_URL` baked in at build time
3. Syncs `dist/` to S3 (deletes removed files)
4. Invalidates the entire CloudFront cache (`/*`)

### Running locally

```bash
npm install
npm run dev
# Admin at: http://localhost:5173/admin
```

---

## File Structure

```
Wyrth-Website/
├── .env                            ← Vite env vars (not committed to git)
├── deploy.sh                       ← One-command build + deploy
├── vite.config.js
├── src/
│   ├── content.js                  ← Default text for every section (fallback)
│   ├── main.jsx                    ← Entry point; async MSAL init + MsalProvider + BrowserRouter
│   ├── App.jsx                     ← Routes: /admin → Admin, * → PublicSite
│   ├── auth/
│   │   └── msalConfig.js           ← MSAL PublicClientApplication config + loginRequest
│   ├── context/
│   │   └── ContentContext.jsx      ← Fetches /content on load, provides content to all components
│   ├── pages/
│   │   └── Admin.jsx               ← Entra-gated CMS editor (6 tabs)
│   └── components/
│       ├── AnnouncementBanner.jsx  ← Dismissible banner, driven by content.announcement
│       ├── Nav.jsx
│       ├── Hero.jsx                ← Reads from useContent().hero
│       ├── CapeIntro.jsx           ← Reads from useContent().cape
│       ├── AudienceGrid.jsx        ← Reads from useContent().audiences
│       ├── Features.jsx            ← Reads from useContent().features
│       ├── Statement.jsx           ← Reads from useContent().statement
│       └── Footer.jsx
├── lambda/
│   └── index.mjs                   ← GET /content (public) + POST /content (Entra JWT auth)
├── terraform/
│   ├── main.tf                     ← Provider config (us-east-1)
│   ├── s3.tf                       ← S3 bucket + OAI bucket policy
│   ├── cloudfront.tf               ← CloudFront distribution
│   ├── lambda.tf                   ← Lambda + API Gateway HTTP v2 + IAM + CORS
│   ├── variables.tf                ← Input variables (bucket_name, entra_tenant_id, entra_client_id)
│   ├── outputs.tf                  ← Outputs (bucket, CloudFront URL, API URL)
│   ├── terraform.tfvars            ← Your actual values (not committed to git)
│   └── example.tfvars              ← Template to copy
└── documents/
    └── how-this-site-works.md      ← This file
```

---

## AWS Resources

| Resource | Name | Purpose |
|---|---|---|
| S3 Bucket | `wyrthco-website` | Stores built site files + `content.json` |
| CloudFront Distribution | `E18DWUHK7XG807` | CDN, HTTPS, SPA routing (`/admin`, `/*` → `index.html`) |
| Lambda Function | `wyrth-website-content-api` | GET reads `content.json`, POST validates JWT + writes S3 + invalidates CF |
| API Gateway (HTTP v2) | `wyrth-website-content-api` | Public HTTPS endpoint — routes `GET /content` and `POST /content` |
| IAM Role | `wyrth-website-content-api-role` | Lets Lambda read/write S3 and create CloudFront invalidations |

---

## Security Notes

- The S3 bucket is **fully private** — only CloudFront can read it via OAI
- Admin auth uses **Microsoft Entra ID** — no passwords stored anywhere
- JWT validation uses **RS256** with keys fetched live from Microsoft's JWKS endpoint
- Token claims validated: algorithm, expiry (`exp`), not-before (`nbf`), audience (`aud === CLIENT_ID`), issuer (`iss`)
- JWT validation uses **Node.js built-in `node:crypto`** — no external npm dependencies in Lambda
- JWKS keys are **cached for 1 hour** in Lambda module scope (warm reuse)
- `.env` and `terraform.tfvars` contain credentials and are **gitignored**
- CORS on the API allows `Authorization` header only from the configured origins
