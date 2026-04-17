pipeline {
  agent any

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Verify Environment') {
      steps {
        sh '''
          whoami
          pwd
          node --version
          npm --version
          terraform version || echo "Terraform not found yet"
          aws --version || echo "AWS CLI not found yet"
        '''
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm install --legacy-peer-deps'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }
  }
}
