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
          /usr/bin/node-22 -v
          /usr/bin/npm-22 -v
        '''
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          /usr/bin/npm-22 install --legacy-peer-deps
        '''
      }
    }

    stage('Build') {
      steps {
        sh '''
          /usr/bin/npm-22 run build
        '''
      }
    }
  }
}
