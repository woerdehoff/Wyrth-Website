- AWS (primary)
    Refresh AWS session
        aws login

    One-time Terraform state bootstrap
        ./scripts/bootstrap-aws-state.sh

    Deploy
        JWT_SECRET=... \
        STRIPE_SECRET_KEY=sk_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx \
        ./deploy-aws.sh --env dev

        ./deploy-aws.sh --env test
        ./deploy-aws.sh --env prod --yes
        ./deploy-aws.sh --env dev --plan

    See documents/aws-migration.md

- Magic-link email (Amazon SES)
    From address is mail_from in terraform/aws/*.tfvars (noreply@wyrthco.com).
    Domain wyrthco.com must stay verified in SES (us-east-1).
    While SES is in the sandbox, you can only send to verified recipient addresses.
    Request production access:
        AWS Console → SES → Account dashboard → Request production access
    Verify a test recipient (sandbox only):
        aws sesv2 create-email-identity --email-identity you@example.com --region us-east-1

- Secrets for deploy (set via environment variables)
    JWT_SECRET
    STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET

    Generate a JWT secret:
        openssl rand -hex 32

- Local Dev
    VITE_CONTENT_API_URL="<your-api-gateway-url>" \
    VITE_GOOGLE_CLIENT_ID="<your-google-client-id>" \
    npm run dev
    # Admin at: http://localhost:5173/admin
