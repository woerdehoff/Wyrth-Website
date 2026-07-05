Beat $41 a month Shopify cost using a self-hosted AWS shop.

## What's Built (POC)
- Custom shop at `/shop` — products from DynamoDB, served via Lambda
- Google Sign-In for customers (`@react-oauth/google`) — no accounts, no passwords
- Shopping cart persisted in DynamoDB with 30-day TTL
- Slide-in cart drawer with qty controls
- Admin panel (`/admin`) to manage products and view orders
- Checkout in POC mode redirects to `wyrthco.com` (Shopify) until Stripe is wired in
- All infra in Terraform — one `./deploy.sh` to build and deploy everything

## TODO: Wire in Stripe (when ready)
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Supply secrets at deploy time (environment variables or `secrets.tfvars`):
   ```
   STRIPE_SECRET_KEY=sk_live_... \
   STRIPE_WEBHOOK_SECRET=whsec_... \
   ./deploy.sh --env prod
   ```
   For test/dev use `sk_test_...` keys.
3. Add to `terraform/prod.tfvars`:
   ```
   site_url = "https://d1detsumoaola0.cloudfront.net"
   ```
4. Run `./deploy.sh --env prod` (or `npm run deploy:prod`)
5. In Stripe Dashboard → **Webhooks** → Add endpoint:
   - URL: `<your-api-url>/shop/webhook`  (see terraform output content_api_url)
   - Event: `checkout.session.completed`
6. Re-deploy after configuring the webhook secret.
7. Test with Stripe's test card (`4242 4242 4242 4242`) on dev environment before going live

## TODO: Custom domain (when ready)
- Add domain to CloudFront distribution and update Google OAuth authorized origins