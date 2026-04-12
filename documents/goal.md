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
2. Add to `terraform/terraform.tfvars`:
   ```
   stripe_secret_key       = "sk_live_..."
   stripe_webhook_secret   = "whsec_..."   # fill in after step 4
   site_url                = "https://d1detsumoaola0.cloudfront.net"
   ```
3. Run `./deploy.sh`
4. In Stripe Dashboard → **Webhooks** → Add endpoint:
   - URL: `https://jxc2aawsfa.execute-api.us-east-1.amazonaws.com/shop/webhook`
   - Event: `checkout.session.completed`
5. Copy the webhook signing secret into `stripe_webhook_secret` in tfvars → redeploy
6. Test with Stripe's test card (`4242 4242 4242 4242`) before going live

## TODO: Custom domain (when ready)
- Add domain to CloudFront distribution and update Google OAuth authorized origins