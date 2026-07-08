- Azure
    Refresh Azure session
        az login

    Generate a JWT secret (run 3x for prod/test/dev)
        openssl rand -hex 32

- Secrets for deploy (set via environment variables)
    JWT_SECRET
    MAIL_CLIENT_ID
    MAIL_CLIENT_SECRET
    STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET

    Generate a JWT secret:
        openssl rand -hex 32

    Example full command:
        JWT_SECRET=... MAIL_CLIENT_ID=... MAIL_CLIENT_SECRET=... \
        STRIPE_SECRET_KEY=sk_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx \
        ./deploy-azure.sh --env prod --yes


- Git + Deploy (terminal, trunk-based)
    # Work on main (or short-lived feature branches)
    git checkout main
    git add .
    git commit -m "feat: your change"
    git push

    # Deploy explicitly to any environment
    ./deploy-azure.sh --env dev
    ./deploy-azure.sh --env test
    ./deploy-azure.sh --env prod --yes


- Local Dev
    VITE_CONTENT_API_URL="<your-dev-function-url>" \
    VITE_GOOGLE_CLIENT_ID="<your-google-client-id>" \
    npm run dev
    # Admin at: http://localhost:5173/admin

- Deploy from terminal (supports dev / test / prod)
    ./deploy-azure.sh --env dev
    ./deploy-azure.sh --env test
    ./deploy-azure.sh --env prod

    Plan only (no apply):
    ./deploy-azure.sh --env dev --plan

    Full help:
    ./deploy-azure.sh --help
