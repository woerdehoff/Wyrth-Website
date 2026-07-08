Beat $41 a month Shopify cost using a self-hosted Azure shop.

## What's Built (POC)
- Custom shop at `/shop` — products from Cosmos DB, served via Azure Functions
- Google Sign-In for customers (`@react-oauth/google`) — no accounts, no passwords
- Shopping cart persisted in Cosmos DB with 30-day TTL
- Slide-in cart drawer with qty controls
- Admin panel (`/admin`) to manage products and view orders
- Checkout in POC mode redirects to `wyrthco.com` (Shopify) until Stripe is wired in
- All infra in Terraform — one `./deploy-azure.sh` to build and deploy everything

## TODO: Wire in Stripe (when ready)
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Supply secrets at deploy time (environment variables or `secrets.tfvars`):
   ```
   STRIPE_SECRET_KEY=sk_live_... \
   STRIPE_WEBHOOK_SECRET=whsec_... \
   ./deploy-azure.sh --env prod
   ```
   For test/dev use `sk_test_...` keys.
3. Add to `terraform/azure/prod.tfvars`:
   ```
   site_url = "https://wyrth.co"
   ```
4. Run `./deploy-azure.sh --env prod`
5. In Stripe Dashboard → **Webhooks** → Add endpoint:
   - URL: `<your-api-url>/shop/webhook`  (see terraform output content_api_url)
   - Event: `checkout.session.completed`
6. Re-deploy after configuring the webhook secret.
7. Test with Stripe's test card (`4242 4242 4242 4242`) on dev environment before going live

## TODO: Custom domain (when ready)
- Add domain to Azure Front Door and update Google OAuth authorized origins
