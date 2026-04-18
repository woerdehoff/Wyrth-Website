- AWS
    Refresh AWS Session
        aws login --profile root-login

    Generate a JWT secret (run 3x for prod/test/dev)
        openssl rand -hex 32

- Jenkins Credentials (Secret text) required per environment
    stripe-secret-key-prod / -test / -dev
    stripe-webhook-secret-prod / -test / -dev
    jwt-secret-prod / -test / -dev

- Git
    # Work on dev. Jenkins deploys automatically on push.
    git checkout dev
    git add .
    git commit -m "feat: your change"
    git push

    # Promote dev → test (triggers test deploy in Jenkins)
    git checkout test && git merge dev && git push

    # Promote test → prod (triggers prod deploy — requires manual approval in Jenkins)
    git checkout main && git merge test && git push

- Local Dev
    VITE_CONTENT_API_URL="https://jxc2aawsfa.execute-api.us-east-1.amazonaws.com/" \
    VITE_GOOGLE_CLIENT_ID="" \
    npm run dev
    # Admin at: http://localhost:5173/admin

- Manual Deploy (prod — bypasses Jenkins, use for quick fixes)
    cd /Users/adam/Documents/GitHub/Wyrth-Website && ./deploy.sh