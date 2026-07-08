# How This Site Works

## Overview

The Wyrth-Website is a static React app hosted on Azure. It is a premium editorial redesign of [wyrthco.com](https://wyrthco.com) — a professional salon cape brand. All site content (headlines, copy, audience cards, features, announcement banner) is editable through an admin page protected by Microsoft Entra ID SSO. The site also includes a custom shop — replacing Shopify — with a Google-authenticated shopping cart backed by Azure Cosmos DB.

---

## Tech Stack

| Layer | Technology |
|---|---------|
| Frontend | React 19 + Vite |
| Hosting | Azure Static Website (Blob Storage `$web` container) |
| CDN / HTTPS | Azure Front Door |
| API | Azure Functions (Node.js 22) |
| Admin Auth | Microsoft Entra ID (MSAL / SSO) |
| Customer Auth | Google Identity Services + Magic Link (passwordless email) |
| Email | Microsoft Graph API |
| Shop / Cart | Azure Cosmos DB (NoSQL) |
| Payments | Stripe (stubbed in POC — redirect to Shopify) |
| Infrastructure | Terraform |

---

## Environments

Three environments are deployed to the same Azure subscription. Each has its own Storage Account, Front Door endpoint, Function App, and Cosmos DB containers.

| Shared Resource | Value |
|---|---|
| Terraform State Storage | `wyrthwebsitetfstate` (resource group `wyrth-website-tfstate`) |
| Entra Tenant ID | `4c061c09-139b-4718-969f-b9b491911d8a` |
| Entra Client ID (App Reg) | `8938c729-223c-4481-8a20-34a5694b825f` |
| Cosmos DB Container Pattern | `products`, `orders`, `carts`, `magic-tokens` (per-env database) |

---

## How the Site is Hosted

1. The React app is built with `npm run build`, producing static files in `dist/`
2. Those files are uploaded to an Azure Storage Account's **`$web` container** (static website hosting)
3. **Azure Front Door** sits in front of Storage — it handles HTTPS, caching, custom domain, and serves `index.html` for all routes (enabling React Router navigation, including `/admin`)
4. Visitors never access Storage directly — only Front Door serves the content

---

## CI/CD (Terminal Deploy)

All deployments are done from the terminal using `deploy-azure.sh`.

The script:
- Runs Terraform (init + apply) against the Azure backend
- Builds the React app with `VITE_*` variables from Terraform outputs
- Uploads static files to the Azure Storage `$web` container
- Purges the Front Door cache
- Deploys the Function App zip

### Environment mapping

| `--env` flag | Terraform state key |
|---|---|
| `dev` | `wyrth-website-azure/dev/terraform.tfstate` |
| `test` | `wyrth-website-azure/test/terraform.tfstate` |
| `prod` | `wyrth-website-azure/prod/terraform.tfstate` |

### Browser tab title per environment

| Environment | Tab title |
|---|---|
| prod | `WYRTH — The Capsule Wardrobe Cape` |
| test | `WYRTH · TEST — The Capsule Wardrobe Cape` |
| dev | `WYRTH · DEV — The Capsule Wardrobe Cape` |

### Running a deployment

```bash
./deploy-azure.sh --env dev
./deploy-azure.sh --env test
./deploy-azure.sh --env prod

# Plan only (no changes)
./deploy-azure.sh --env dev --plan

# Supply secrets via environment (recommended)
JWT_SECRET=... \
MAIL_CLIENT_ID=... \
MAIL_CLIENT_SECRET=... \
STRIPE_SECRET_KEY=sk_live_xxx \
STRIPE_WEBHOOK_SECRET=whsec_xxx \
./deploy-azure.sh --env prod --yes
```

See `./deploy-azure.sh --help` for all options (`--skip-infra`, `--skip-build`, etc.).

Secrets are never stored in the repository. Use environment variables or a local `terraform/azure/secrets.tfvars` file.

---

## How Content Editing Works

All editable text lives in one place: `src/content.js` — this is the **default content**. When the site loads, it fetches `/content` from the Azure Functions API. If live content exists (previously saved to blob storage as `content.json`), it overrides the defaults. If not, the hardcoded defaults from `content.js` are used as a fallback.

```
Browser loads site
  → fetches {CONTENT_API_URL}/content  (Function App reads content.json from blob storage)
  → if found: overrides default text
  → if not found: uses defaults from src/content.js
```

### Content Sections

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
3. **Azure Functions** validates the JWT:
   - Fetches JWKS from `https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys` (1-hour module-level cache)
   - Verifies RS256 signature using Node.js built-in `node:crypto` (no external deps)
   - Checks `aud === CLIENT_ID`, `iss`, `exp`, `nbf`
4. Function writes `content.json` to the blob storage container
5. Function purges the Front Door cache so CDN serves the fresh version immediately
6. All visitors see the updated content within seconds

### Entra App Registration requirements

The App Registration must have the following redirect URIs configured under **Authentication → Single-page application**:

- The Front Door / custom domain URL (production)
- `http://localhost:5173` (local dev)

---

## Shop & Cart

The site includes a custom e-commerce shop at `/shop`, replacing the $41/month Shopify subscription.

### How the shop works

- Products are stored in Cosmos DB (`products` container) and managed through `/admin` → Products tab
- The public `/shop` page fetches `GET /shop/products` from the Function App (no auth required)
- Customers sign in with Google to add items to their cart
- The cart is stored in Cosmos DB (`carts` container) with a 30-day TTL — it survives page refreshes
- Checkout in POC mode redirects to `wyrthco.com` on Shopify; once Stripe is wired in it will be self-hosted

### Customer auth (Google Sign-In + Magic Link)

Customers have two sign-in options — both are passwordless:

**Google Sign-In**

1. Customer clicks the **Sign In** button in the nav to open the dropdown
2. Selects the Google option — a pop-up authenticates and returns a signed ID token (JWT)
3. The token is stored in `localStorage` (`wyrth_token`) and sent as `Authorization: Bearer` to cart endpoints
4. The Function App verifies the Google JWT using Google's JWKS endpoint with no external dependencies
5. Clicking the user avatar in the nav signs out and clears the cart from the UI

**Magic Link (passwordless email)**

1. Customer clicks the **Sign In** button in the nav to open the dropdown, then selects **"Sign in with Email"**
2. A modal prompts for their email address
3. `POST /auth/magic/send` — the Function generates a UUID token, stores it in Cosmos DB (`magic-tokens` container) with a 15-minute TTL, and sends a branded sign-in email via Microsoft Graph
4. Customer clicks the link in their email → lands on `/auth/verify?token=…`
5. `GET /auth/magic/verify` — Function looks up the token (single-use, deleted immediately), then returns a self-issued HMAC-HS256 JWT (30-day expiry)
6. The frontend stores the JWT in `localStorage` identically to Google sign-in

### Google OAuth setup (one-time)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. **+ Create Credentials → OAuth 2.0 Client ID** → Web application
3. Add your site URL to **Authorized JavaScript origins**
4. Copy the Client ID and add to `terraform/azure/dev.tfvars` (etc.):
   ```
   google_client_id = "YOUR_CLIENT_ID.apps.googleusercontent.com"
   ```
5. Run `./deploy-azure.sh --env dev` — the client ID is baked into both the Function App env var and the React build

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
| `POST` | `/auth/magic/send` | None | Send magic link email via Microsoft Graph |
| `GET` | `/auth/magic/verify` | None (token in query string) | Verify token, return session JWT |

---

## How to Deploy

All deployments are performed from the terminal using `./deploy-azure.sh`.

### Recommended workflow (trunk-based)

```bash
# 1. Work on main (or a short-lived feature branch)
git checkout main
# make changes...
git add . && git commit -m "feat: something" && git push

# 2. Deploy to dev for testing
./deploy-azure.sh --env dev

# 3. When ready, deploy to test
./deploy-azure.sh --env test

# 4. When ready for production
./deploy-azure.sh --env prod   # includes a confirmation prompt
```

### Passing secrets

```bash
JWT_SECRET=... \
MAIL_CLIENT_ID=... \
MAIL_CLIENT_SECRET=... \
STRIPE_SECRET_KEY=sk_... \
STRIPE_WEBHOOK_SECRET=whsec_... \
./deploy-azure.sh --env prod --yes
```

You can also create `terraform/azure/secrets.tfvars` (gitignored) if you prefer a file.

### First-time environment setup

```bash
# Bootstrap Terraform state storage (one-time)
az group create -n wyrth-website-tfstate -l eastus
az storage account create -n wyrthwebsitetfstate -g wyrth-website-tfstate -l eastus --sku Standard_LRS
az storage container create -n tfstate --account-name wyrthwebsitetfstate

# Then deploy
./deploy-azure.sh --env dev
```

### Running locally

```bash
npm install
VITE_CONTENT_API_URL="<your-dev-function-url>" \
VITE_GOOGLE_CLIENT_ID="<your-google-client-id>" \
npm run dev
# Admin at: http://localhost:5173/admin
```

---

## File Structure

```
Wyrth-Website/
├── deploy-azure.sh                 ← Multi-env terminal deploy
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
│   │   └── CartContext.jsx         ← Cart state + debounced Cosmos DB sync via /shop/cart
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
├── azure-api/
│   └── src/handler.mjs             ← All API routes: content + shop + cart (Entra + Google JWT auth)
└── terraform/
    └── azure/
        ├── main.tf                 ← Provider + Azure backend (key passed per-env at init time)
        ├── function.tf             ← Function App + App Service Plan + Storage
        ├── frontdoor.tf            ← Azure Front Door (CDN, HTTPS, custom domain)
        ├── cosmos.tf               ← Cosmos DB account + databases + containers
        ├── variables.tf            ← All input variables
        ├── outputs.tf              ← Outputs used by deploy-azure.sh
        ├── dev.tfvars              ← Dev environment values (committed — no secrets)
        ├── test.tfvars             ← Test environment values (committed — no secrets)
        └── prod.tfvars             ← Prod environment values (committed — no secrets)
```

---

## Azure Resources

All resources below are created per environment.

| Resource | Purpose |
|---|---|
| Resource Group | Scopes all per-env resources |
| Storage Account | Static website hosting (`$web` container) + blob storage for `content.json` |
| Azure Front Door | CDN, HTTPS, SPA routing (`/*` → `index.html`), custom domain |
| Function App (Linux) | All API routes: content, shop, cart, auth |
| App Service Plan | Consumption plan for the Function App |
| Cosmos DB Account | NoSQL database (products, orders, carts, magic-tokens) |

---

## Security Notes

- Admin auth uses **Microsoft Entra ID** — no passwords stored anywhere
- Customer auth supports **Google Sign-In** (RS256 JWT via Google JWKS) and **Magic Link** (HMAC-HS256 JWT signed with `JWT_SECRET`)
- Magic link tokens are **single-use** — deleted from Cosmos DB on first verification
- Magic link tokens expire in **15 minutes**; session JWTs last 30 days
- JWT validation uses **Node.js built-in `node:crypto`** — no external npm dependencies in the Function App
- `JWT_SECRET` must be supplied at deploy time via env var or secrets file (never stored in code or committed tfvars)
- Token claims validated: algorithm, expiry (`exp`), not-before (`nbf`), audience (`aud === CLIENT_ID`), issuer (`iss`)
- JWKS keys are **cached for 1 hour** in Function module scope (warm reuse)
- `.env` and `secrets.tfvars` contain credentials and are **gitignored**
- CORS on the API allows `Authorization` header only from the configured origins
