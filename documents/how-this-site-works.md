# How This Site Works

## Overview

The Wyrth-Website is a static React app hosted on AWS. It is a premium editorial redesign of [wyrthco.com](https://wyrthco.com) — a professional salon cape brand. All site content (headlines, copy, audience cards, features, announcement banner) is editable through an admin page protected by Microsoft Entra ID SSO. The site also includes a custom shop — replacing Shopify — with a Google-authenticated shopping cart backed by DynamoDB.

---

## Tech Stack

| Layer | Technology |
|---|---------|
| Frontend | React 19 + Vite |
| Hosting | AWS S3 (private bucket) |
| CDN / HTTPS | AWS CloudFront |
| API | AWS Lambda (Node.js 22) + API Gateway HTTP v2 |
| Admin Auth | Microsoft Entra ID (MSAL / SSO) |
| Customer Auth | Google Identity Services + Magic Link (passwordless email) |
| Email | AWS SES v2 |
| Shop / Cart | AWS DynamoDB (PAY_PER_REQUEST) |
| Payments | Stripe (stubbed in POC — redirect to Shopify) |
| Infrastructure | Terraform |

---

## Environments

Three environments are deployed to the same AWS account. Each has its own S3 bucket, CloudFront distribution, Lambda, API Gateway, and DynamoDB tables.

| Environment | Branch | S3 Bucket | CloudFront | Content API |
|---|---|---|---|---|
| **prod** | `main` | `wyrthco-website` | `E18DWUHK7XG807` | `https://jxc2aawsfa.execute-api.us-east-1.amazonaws.com` |
| **test** | `test` | `wyrthco-website-test` | (see Jenkins) | (see Jenkins) |
| **dev** | `dev` | `wyrthco-website-dev` | `EJTKH2O123SKG` | `https://54roo7ti6d.execute-api.us-east-1.amazonaws.com` |

| Shared Resource | Value |
|---|---|
| Terraform State Bucket | `wyrth-website-tfstate` |
| Entra Tenant ID | `4c061c09-139b-4718-969f-b9b491911d8a` |
| Entra Client ID (App Reg) | `8938c729-223c-4481-8a20-34a5694b825f` |
| DynamoDB Table Pattern | `wyrth-website-{env}-products`, `-orders`, `-carts`, `-magic-tokens` |

---

## How the Site is Hosted

1. The React app is built with `npm run build`, producing static files in `dist/`
2. Those files are uploaded to a **private S3 bucket**
3. **CloudFront** sits in front of S3 — it handles HTTPS, caching, and serves `index.html` for all routes (enabling React Router navigation, including `/admin`)
4. Visitors never touch S3 directly — only CloudFront can read the bucket via Origin Access Identity (OAI)

---

## CI/CD Pipeline (Jenkins)

Deployments are fully automated via a **Jenkins Multibranch Pipeline**. Pushing to any branch triggers the pipeline for that environment.

### Branch → Environment mapping

| Branch | Environment | Terraform state key |
|---|---|---|
| `dev` (or any other) | dev | `wyrth-website/dev/terraform.tfstate` |
| `test` | test | `wyrth-website/test/terraform.tfstate` |
| `main` | prod | `wyrth-website/prod/terraform.tfstate` |

### Pipeline stages

1. **Set Environment** — reads `GIT_BRANCH`, maps to dev/test/prod, sets credential IDs
2. **Checkout** — checks out source
3. **Verify Environment** — confirms Node 22, Terraform, AWS CLI
4. **Terraform Init** — `terraform init -reconfigure -backend-config="key=wyrth-website/<env>/terraform.tfstate"`
5. **Terraform Plan** — injects Stripe + JWT secrets from Jenkins credentials as `TF_VAR_*`
6. **Approve Production Deploy** — manual gate for `main` only; navigate to build → *Paused for Input*
7. **Terraform Apply** — applies the saved plan
8. **Install Dependencies** — `npm install`
9. **Build** — reads Terraform outputs, injects `VITE_CONTENT_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_APP_ENV` into the React build
10. **Deploy to S3** — `aws s3 sync dist/ s3://<bucket> --delete`
11. **Invalidate CloudFront** — clears CDN cache

### Jenkins credentials required (Secret text — one set per environment)

```
stripe-secret-key-prod / -test / -dev
stripe-webhook-secret-prod / -test / -dev
jwt-secret-prod / -test / -dev
```

### Browser tab title per environment

The Vite build injects a `__APP_TITLE__` constant based on `VITE_APP_ENV`:

| Environment | Tab title |
|---|---|
| prod | `WYRTH — The Capsule Wardrobe Cape` |
| test | `WYRTH · TEST — The Capsule Wardrobe Cape` |
| dev | `WYRTH · DEV — The Capsule Wardrobe Cape` |

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

## Shop & Cart

The site includes a custom e-commerce shop at `/shop`, replacing the $41/month Shopify subscription with a self-hosted AWS stack.

### How the shop works

- Products are stored in DynamoDB (`wyrth-website-products`) and managed through `/admin` → Products tab
- The public `/shop` page fetches `GET /shop/products` from Lambda (no auth required)
- Customers sign in with Google to add items to their cart
- The cart is stored in DynamoDB (`wyrth-website-carts`) with a 30-day TTL — it survives page refreshes
- Checkout in POC mode redirects to `wyrthco.com` on Shopify; once Stripe is wired in it will be self-hosted

### Customer auth (Google Sign-In + Magic Link)

Customers have two sign-in options — both are passwordless:

**Google Sign-In**

1. Customer clicks the **Sign In** button in the nav to open the dropdown
2. Selects the Google option — a pop-up authenticates and returns a signed ID token (JWT)
3. The token is stored in `localStorage` (`wyrth_token`) and sent as `Authorization: Bearer` to cart endpoints
4. Lambda verifies the Google JWT using Google's JWKS endpoint with no external dependencies
5. Clicking the user avatar in the nav signs out and clears the cart from the UI

**Magic Link (passwordless email)**

1. Customer clicks the **Sign In** button in the nav to open the dropdown, then selects **"Sign in with Email"** (or uses the same option in the mobile hamburger menu)
2. A modal prompts for their email address
3. `POST /auth/magic/send` — Lambda generates a UUID token, stores it in DynamoDB (`wyrth-website-magic-tokens`) with a 15-minute TTL, and sends a branded sign-in email via AWS SES
4. Customer clicks the link in their email → lands on `/auth/verify?token=…`
5. `GET /auth/magic/verify` — Lambda looks up the token (single-use, deleted immediately), then returns a self-issued HMAC-HS256 JWT (30-day expiry)
6. The frontend stores the JWT in `localStorage` identically to Google sign-in — the rest of the app (cart, etc.) works the same way

### Google OAuth setup (one-time)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. **+ Create Credentials → OAuth 2.0 Client ID** → Web application
3. Add `https://d1detsumoaola0.cloudfront.net` to **Authorized JavaScript origins**
4. Copy the Client ID and add to `terraform/terraform.tfvars`:
   ```
   google_client_id = "YOUR_CLIENT_ID.apps.googleusercontent.com"
   ```
5. Run `./deploy.sh` — the client ID is baked into both the Lambda env var and the React build

### Magic Link setup (one-time)

1. **Verify the From address in AWS SES** — go to SES → Verified identities → verify `noreply@wyrth.co` (or the domain)
2. **Create Jenkins credentials** (Secret text) for each environment:
   - `jwt-secret-prod` — `openssl rand -hex 32`
   - `jwt-secret-test` — `openssl rand -hex 32`
   - `jwt-secret-dev` — `openssl rand -hex 32`
3. Jenkins injects each secret as `TF_VAR_jwt_secret` during Terraform plan/apply (same pattern as Stripe keys)
4. `ses_from_email` is already set to `noreply@wyrth.co` in all `.tfvars` files

### Admin shop management (`/admin`)

- **Products tab** — add, edit, or delete products (name, price in cents, image URL, description). Changes go live immediately.
- **Orders tab** — read-only list of completed Stripe orders (populated once Stripe is configured)

### API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/shop/products` | None | Public product listing (active only) |
| `GET` | `/shop/products/all` | Entra JWT | All products including inactive (admin) |
| `POST` | `/shop/products` | Entra JWT | Create or update a product |
| `POST` | `/shop/products/delete` | Entra JWT | Delete a product |
| `POST` | `/shop/checkout` | None | Create Stripe session (or Shopify redirect in POC) |
| `POST` | `/shop/webhook` | Stripe signature | Stripe checkout.session.completed handler |
| `GET` | `/shop/orders` | Entra JWT | List all orders (admin) |
| `GET` | `/shop/cart` | Google JWT or Magic Link JWT | Load cart for signed-in user |
| `POST` | `/shop/cart` | Google JWT or Magic Link JWT | Save cart for signed-in user |
| `POST` | `/auth/magic/send` | None | Send magic link email via SES |
| `GET` | `/auth/magic/verify` | None (token in query string) | Verify token, return session JWT |

---

## How to Deploy

Normal deployments go through Jenkins — push to a branch and the pipeline runs automatically. `deploy.sh` is available for quick manual prod patches that don't need infrastructure changes.

### Normal workflow (Jenkins)

```bash
# 1. Develop on dev branch
git checkout dev
# ... make changes ...
git add . && git commit -m "feat: your change" && git push
# Jenkins deploys to dev automatically

# 2. Promote to test
git checkout test && git merge dev && git push

# 3. Promote to prod (Jenkins will pause for manual approval)
git checkout main && git merge test && git push
```

### Manual deploy (prod only — skips Jenkins)

```bash
./deploy.sh
```

The deploy script:
1. Runs `terraform apply -auto-approve` (using local state / prod tfvars)
2. Reads `s3_bucket_name`, `cloudfront_distribution_id`, and `content_api_url` from Terraform outputs
3. Builds the React app with `VITE_CONTENT_API_URL` baked in at build time
4. Syncs `dist/` to S3 (skips `uploads/` and `content.json`)
5. Invalidates the entire CloudFront cache (`/*`)

### First-time environment setup

For each new environment, Terraform state is stored in S3 with a per-env key.

```bash
# Initialize with the environment key (Jenkins does this automatically)
cd terraform
terraform init -backend-config="key=wyrth-website/<env>/terraform.tfstate"
terraform apply -var-file="<env>.tfvars"
```

Fill in the per-env `.tfvars` file (e.g. `dev.tfvars`) with `entra_tenant_id`, `entra_client_id`, `google_client_id`, and `ses_from_email`. Stripe and JWT secrets are injected by Jenkins at runtime — do **not** put them in tfvars.

### Running locally

```bash
npm install
VITE_CONTENT_API_URL="https://jxc2aawsfa.execute-api.us-east-1.amazonaws.com/" \
VITE_GOOGLE_CLIENT_ID="" \
npm run dev
# Admin at: http://localhost:5173/admin
```

---

## File Structure

```
Wyrth-Website/
├── deploy.sh                       ← Manual build + deploy (prod only — Jenkins handles normal deployments)
├── Jenkinsfile                     ← Jenkins Multibranch Pipeline definition (all stages)
├── vite.config.js                  ← Reads VITE_APP_ENV to set browser tab title at build time
├── src/
│   ├── content.js                  ← Default text for every section (fallback)
│   ├── main.jsx                    ← Entry point; async MSAL init + MsalProvider + BrowserRouter
│   ├── App.jsx                     ← Routes + AuthProvider + CartProvider wrapping
│   ├── auth/
│   │   └── msalConfig.js           ← MSAL PublicClientApplication config + loginRequest
│   ├── context/
│   │   ├── ContentContext.jsx      ← Fetches /content on load, provides content to all components
│   │   ├── AuthContext.jsx         ← Google OAuth + magic link context (user state, login/logout, sendMagicLink, verifyMagicLink)
│   │   └── CartContext.jsx         ← Cart state + debounced DynamoDB sync via /shop/cart
│   ├── pages/
│   │   ├── Admin.jsx               ← Entra-gated CMS + Products + Orders tabs
│   │   ├── Shop.jsx                ← Product listing — Google login prompt or Add to Cart
│   │   ├── ShopSuccess.jsx         ← Post-checkout success page
│   │   ├── ShopCancel.jsx          ← Checkout cancelled page
│   │   └── VerifyMagicLink.jsx     ← Landing page for magic link clicks (/auth/verify?token=…)
│   └── components/
│       ├── AnnouncementBanner.jsx  ← Dismissible banner, driven by content.announcement
│       ├── Nav.jsx                 ← Cart icon + Sign In dropdown (Google + Email) + user avatar
│       ├── MagicLinkModal.jsx      ← Email input modal for passwordless sign-in
│       ├── CartDrawer.jsx          ← Slide-in cart drawer with qty controls and checkout
│       ├── Hero.jsx
│       ├── CapeIntro.jsx
│       ├── AudienceGrid.jsx
│       ├── Features.jsx
│       ├── Statement.jsx
│       └── Footer.jsx
├── lambda/
│   └── index.mjs                   ← All API routes: content + shop + cart (Entra + Google JWT auth)
├── terraform/
│   ├── main.tf                     ← Provider + S3 partial backend (key passed per-env at init time)
│   ├── s3.tf                       ← S3 bucket + OAI bucket policy
│   ├── cloudfront.tf               ← CloudFront distribution
│   ├── lambda.tf                   ← Lambda + API Gateway + IAM (S3, CloudFront, DynamoDB, SES)
│   ├── dynamodb.tf                 ← products, orders, carts, magic-tokens tables
│   ├── variables.tf                ← All input variables (bucket, entra, google, stripe, ses, jwt_secret, site_url, environment)
│   ├── outputs.tf                  ← Outputs including google_client_id for deploy.sh
│   ├── dev.tfvars                  ← Dev environment values (committed — no secrets)
│   ├── test.tfvars                 ← Test environment values (committed — no secrets)
│   ├── prod.tfvars                 ← Prod environment values (committed — no secrets)
│   ├── terraform.tfvars            ← Local overrides (not committed to git)
│   └── example.tfvars              ← Template to copy
└── documents/
    ├── how-this-site-works.md      ← This file
    ├── goal.md                     ← Project goal + Stripe TODO list
    └── ideas.md
```

---

## AWS Resources

All resources below are created per environment. The prod names are shown; dev and test append `-dev` / `-test` to the project names.

| Resource | Prod Name | Purpose |
|---|---|---|
| S3 Bucket | `wyrthco-website` | Stores built site files + `content.json` |
| CloudFront Distribution | `E18DWUHK7XG807` | CDN, HTTPS, SPA routing (`/admin`, `/*` → `index.html`) |
| Lambda Function | `wyrth-website-content-api` | All API routes: content, shop, cart, auth |
| API Gateway (HTTP v2) | `wyrth-website-content-api` | Public HTTPS endpoint for all routes |
| IAM Role | `wyrth-website-content-api-role` | Lets Lambda read/write S3, CloudFront, DynamoDB, and send SES email |
| DynamoDB Tables | `wyrth-website-{env}-*` | products, orders, carts, magic-tokens |
| S3 Bucket (Terraform state) | `wyrth-website-tfstate` | Remote Terraform state for all environments |

---

## Security Notes

- The S3 bucket is **fully private** — only CloudFront can read it via OAI
- Admin auth uses **Microsoft Entra ID** — no passwords stored anywhere
- Customer auth supports **Google Sign-In** (RS256 JWT via Google JWKS) and **Magic Link** (HMAC-HS256 JWT signed with `JWT_SECRET`)
- Magic link tokens are **single-use** — deleted from DynamoDB on first verification
- Magic link tokens expire in **15 minutes**; session JWTs last 30 days
- JWT validation uses **Node.js built-in `node:crypto`** — no external npm dependencies in Lambda
- `JWT_SECRET` is injected at deploy time by Jenkins (never stored in code or tfvars)
- Token claims validated: algorithm, expiry (`exp`), not-before (`nbf`), audience (`aud === CLIENT_ID`), issuer (`iss`)
- JWT validation uses **Node.js built-in `node:crypto`** — no external npm dependencies in Lambda
- JWKS keys are **cached for 1 hour** in Lambda module scope (warm reuse)
- `.env` and `terraform.tfvars` contain credentials and are **gitignored**
- CORS on the API allows `Authorization` header only from the configured origins
