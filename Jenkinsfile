pipeline {
  agent any

  environment {
    AWS_DEFAULT_REGION = 'us-east-1'
  }

  stages {

    // ── Determine environment from branch ──────────────────────────────────
    stage('Set Environment') {
      steps {
        script {
          // GIT_BRANCH is set by the git plugin as "origin/main" — strip the prefix
          def branch = (env.GIT_BRANCH ?: '').replaceFirst(/^(refs\/heads\/|origin\/)/, '')
          switch (branch) {
            case 'main':
              env.TF_ENV              = 'prod'
              env.STRIPE_KEY_CRED     = 'stripe-secret-key-prod'
              env.STRIPE_WEBHOOK_CRED = 'stripe-webhook-secret-prod'
              break
            case 'test':
              env.TF_ENV              = 'test'
              env.STRIPE_KEY_CRED     = 'stripe-secret-key-test'
              env.STRIPE_WEBHOOK_CRED = 'stripe-webhook-secret-test'
              break
            default:
              env.TF_ENV              = 'dev'
              env.STRIPE_KEY_CRED     = 'stripe-secret-key-dev'
              env.STRIPE_WEBHOOK_CRED = 'stripe-webhook-secret-dev'
          }
          echo "Branch: ${branch}  →  Environment: ${env.TF_ENV}"
        }
      }
    }

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Verify Environment') {
      steps {
        sh '''
          whoami && pwd
          /usr/bin/node-22 -v
          /usr/bin/npm-22 -v
          terraform version
          aws --version
        '''
      }
    }

    // ── Terraform ──────────────────────────────────────────────────────────
    stage('Terraform Init') {
      steps {
        dir('terraform') {
          sh "terraform init -reconfigure -backend-config=\"key=wyrth-website/${env.TF_ENV}/terraform.tfstate\""
        }
      }
    }

    stage('Terraform Plan') {
      steps {
        script {
          withCredentials([
            string(credentialsId: env.STRIPE_KEY_CRED,     variable: 'TF_VAR_stripe_secret_key'),
            string(credentialsId: env.STRIPE_WEBHOOK_CRED, variable: 'TF_VAR_stripe_webhook_secret')
          ]) {
            dir('terraform') {
              sh "terraform plan -var-file=\"${env.TF_ENV}.tfvars\" -out=tfplan"
            }
          }
        }
      }
    }

    // Manual approval gate — only for production deployments
    stage('Approve Production Deploy') {
      when {
        expression { env.TF_ENV == 'prod' }
      }
      steps {
        input message: "Deploy Terraform changes to PRODUCTION?", ok: "Deploy"
      }
    }

    stage('Terraform Apply') {
      steps {
        script {
          withCredentials([
            string(credentialsId: env.STRIPE_KEY_CRED,     variable: 'TF_VAR_stripe_secret_key'),
            string(credentialsId: env.STRIPE_WEBHOOK_CRED, variable: 'TF_VAR_stripe_webhook_secret')
          ]) {
            dir('terraform') {
              sh 'terraform apply -auto-approve tfplan'
            }
          }
        }
      }
    }

    // ── React build ────────────────────────────────────────────────────────
    stage('Install Dependencies') {
      steps {
        sh '/usr/bin/npm-22 install --legacy-peer-deps'
      }
    }

    stage('Build') {
      steps {
        script {
          dir('terraform') {
            env.VITE_CONTENT_API_URL  = sh(script: 'terraform output -raw content_api_url',  returnStdout: true).trim()
            env.VITE_GOOGLE_CLIENT_ID = sh(script: 'terraform output -raw google_client_id', returnStdout: true).trim()
          }
        }
        sh '''
          VITE_CONTENT_API_URL="${VITE_CONTENT_API_URL}" \
          VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID}" \
          /usr/bin/npm-22 run build
        '''
      }
    }

    // ── Deploy ─────────────────────────────────────────────────────────────
    stage('Deploy to S3') {
      steps {
        script {
          dir('terraform') {
            env.S3_BUCKET          = sh(script: 'terraform output -raw s3_bucket_name',             returnStdout: true).trim()
            env.CF_DISTRIBUTION_ID = sh(script: 'terraform output -raw cloudfront_distribution_id', returnStdout: true).trim()
          }
        }
        sh 'aws s3 sync dist/ "s3://${S3_BUCKET}" --delete --exclude "uploads/*" --exclude "content.json" --exclude "content-draft.json"'
      }
    }

    stage('Invalidate CloudFront') {
      steps {
        sh '''
          aws cloudfront create-invalidation \
            --distribution-id "${CF_DISTRIBUTION_ID}" \
            --paths "/*"
        '''
      }
    }
  }

  post {
    success {
      echo "Deployment to ${env.TF_ENV} complete!"
    }
    failure {
      echo "Pipeline failed for environment: ${env.TF_ENV}"
    }
  }
}
