- AWS
    Refresh AWS Session
        aws login --profile root-login

    Generate a JWT secret (run 3x for prod/test/dev)
        openssl rand -hex 32

- Secrets for deploy (set via environment variables)
    STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET
    JWT_SECRET

    Generate a JWT secret:
        openssl rand -hex 32

    Example full command:
        STRIPE_SECRET_KEY=sk_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx JWT_SECRET=... \
        ./deploy.sh --env prod --yes


- Git + Deploy (terminal, trunk-based)
    # Work on main (or short-lived feature branches)
    git checkout main
    git add .
    git commit -m "feat: your change"
    git push

    # Deploy explicitly to any environment — branch no longer decides the target
    npm run deploy:dev
    npm run deploy:test
    npm run deploy:prod

    # You can also deploy from any branch or commit
    ./deploy.sh --env dev
    ./deploy.sh --env test
    ./deploy.sh --env prod --yes


- Local Dev
    VITE_CONTENT_API_URL="https://jxc2aawsfa.execute-api.us-east-1.amazonaws.com/" \
    VITE_GOOGLE_CLIENT_ID="" \
    npm run dev
    # Admin at: http://localhost:5173/admin

- Deploy from terminal (supports dev / test / prod)
    ./deploy.sh --env dev
    ./deploy.sh --env test
    ./deploy.sh --env prod

    Or use npm convenience scripts:
    npm run deploy:dev
    npm run deploy:test
    npm run deploy:prod

    Plan only (no apply):
    ./deploy.sh --env dev --plan

    Full help:
    ./deploy.sh --help
