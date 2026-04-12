# How This Site Works

## Overview

The Wyrth-Website is a static React app hosted on AWS. It is a premium editorial redesign of [wyrthco.com](https://wyrthco.com) — a professional salon cape brand. All site content (headlines, copy, audience cards, features, announcement banner) is editable through an admin page protected by Microsoft Entra ID SSO. The site also includes a custom shop — replacing Shopify — with a Google-authenticated shopping cart backed by DynamoDB.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Hosting | AWS S3 (private bucket) |
| CDN / HTTPS | AWS CloudFront |
| API | AWS Lambda (Node.js 22) + API Gateway HTTP v2 |
| Admin Auth | Microsoft Entra ID (MSAL / SSO) |
| Customer Auth | Google Identity Services (`@react-oauth/google`) |
| Shop / Cart | AWS DynamoDB (PAY_PER_REQUEST) |
| Payments | Stripe (stubbed in POC — redirect to Shopify) |
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
| DynamoDB Tables | `wyrth-website-products`, `wyrth-website-orders`, `wyrth-website-carts` |

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

## Shop & Cart

The site includes a custom e-commerce shop at `/shop`, replacing the $41/month Shopify subscription with a self-hosted AWS stack.

### How the shop works

- Products are stored in DynamoDB (`wyrth-website-products`) and managed through `/admin` → Products tab
- The public `/shop` page fetches `GET /shop/products` from Lambda (no auth required)
- Customers sign in with Google to add items to their cart
- The cart is stored in DynamoDB (`wyrth-website-carts`) with a 30-day TTL — it survives page refreshes
- Checkout in POC mode redirects to `wyrthco.com` on Shopify; once Stripe is wired in it will be self-hosted

### Customer auth (Google Sign-In)

Customers use Google Identity Services to log in — no passwords, no account creation.

1. Customer clicks "Sign in to add to cart" on the shop page
2. Google pop-up authenticates and returns a signed ID token (JWT)
3. The token is stored in `localStorage` (`wyrth_token`) and sent as `Authorization: Bearer` to cart endpoints
4. Lambda verifies the Google JWT using Google's JWKS endpoint with no external dependencies
5. Clicking the user avatar in the nav signs out and clears the cart from the UI

### Google OAuth setup (one-time)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. **+ Create Credentials → OAuth 2.0 Client ID** → Web application
3. Add `https://d1detsumoaola0.cloudfront.net` to **Authorized JavaScript origins**
4. Copy the Client ID and add to `terraform/terraform.tfvars`:
   ```
   google_client_id = "YOUR_CLIENT_ID.apps.googleusercontent.com"
   ```
5. Run `./deploy.sh` — the client ID is baked into both the Lambda env var and the React build

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
| `GET` | `/shop/cart` | Google JWT | Load cart for signed-in user |
| `POST` | `/shop/cart` | Google JWT | Save cart for signed-in user |

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
├── deploy.sh                       ← One-command build + deploy (runs terraform apply first)
├── vite.config.js
├── src/
│   ├── content.js                  ← Default text for every section (fallback)
│   ├── main.jsx                    ← Entry point; async MSAL init + MsalProvider + BrowserRouter
│   ├── App.jsx                     ← Routes + AuthProvider + CartProvider wrapping
│   ├── auth/
│   │   └── msalConfig.js           ← MSAL PublicClientApplication config + loginRequest
│   ├── context/
│   │   ├── ContentContext.jsx      ← Fetches /content on load, provides content to all components
│   │   ├── AuthContext.jsx         ← Google OAuth context (GoogleOAuthProvider, user state, login/logout)
│   │   └── CartContext.jsx         ← Cart state + debounced DynamoDB sync via /shop/cart
│   ├── pages/
│   │   ├── Admin.jsx               ← Entra-gated CMS + Products + Orders tabs
│   │   ├── Shop.jsx                ← Product listing — Google login prompt or Add to Cart
│   │   ├── ShopSuccess.jsx         ← Post-checkout success page
│   │   └── ShopCancel.jsx          ← Checkout cancelled page
│   └── components/
│       ├── AnnouncementBanner.jsx  ← Dismissible banner, driven by content.announcement
│       ├── Nav.jsx                 ← Cart icon + count badge + user avatar + sign-out
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
│   ├── main.tf                     ← Provider config (us-east-1)
│   ├── s3.tf                       ← S3 bucket + OAI bucket policy
│   ├── cloudfront.tf               ← CloudFront distribution
│   ├── lambda.tf                   ← Lambda + API Gateway + IAM (S3, CloudFront, DynamoDB)
│   ├── dynamodb.tf                 ← products, orders, carts tables
│   ├── variables.tf                ← All input variables (bucket, entra, google, stripe, site_url)
│   ├── outputs.tf                  ← Outputs including google_client_id for deploy.sh
│   ├── terraform.tfvars            ← Your actual values (not committed to git)
│   └── example.tfvars              ← Template to copy
└── documents/
    ├── how-this-site-works.md      ← This file
    ├── goal.md                     ← Project goal + Stripe TODO list
    └── ideas.md
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
