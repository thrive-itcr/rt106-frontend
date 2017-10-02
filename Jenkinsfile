pipeline {
//  agent {
//      docker { image 'node:6.11.3' }
//  }
  agent any
  stages {
    stage('scm') {
      steps {
        git(url: 'https://github.build.ge.com/rt106/rt106-frontend.git', branch: 'master', changelog: true)
      }
    }
    stage('static') {
      steps {
        withSonarQubeEnv('sonar') {
          script {
            def scannerHome = tool 'sonar'
            sh "${scannerHome}/bin/sonar-scanner"
          }
        }
      }
    }
    stage('unit') {
      steps {
        //nodejs(nodeJSInstallationName: 'nodejs 6.11.3', configId: null) {
        nodejs(nodeJSInstallationName: 'nodejs 8.6.0', configId: null) {
          sh 'which npm'
          sh 'npm config set -g proxy $http_proxy'
          sh 'npm config set -g https-proxy $https_proxy'
          sh 'npm config set -g no_proxy $no_proxy'
          sh 'npm config set -g strict-ssl false'
          sh 'npm config set registry http://registry.npmjs.org/'
          sh 'npm install --verbose'
          sh 'bower install'
          sh 'npm coverage-app'
        }
      }
    }
  }
}
