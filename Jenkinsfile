pipeline {
    agent any

    environment {
        IMAGE_NAME = "devops-ecommerce-backend-app:${BUILD_NUMBER}"

    }

    stages {
        stage('Cleanup Workspace') {
            steps { cleanWs() }
        }

        stage('Clone Repository') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/Devops-eCommerce-Backend-2026/Devops-eCommerce-Backend.git'
            }
        }
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }   

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME} ."
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    sh "docker push ${IMAGE_NAME}"
                }
            }
        }
        stage('Deploy to Kubernetes') {
            steps {
        sh """
            kubectl set image deployment/backend-app \
                backend-app=${IMAGE_NAME}
            kubectl rollout status deployment/backend-app --timeout=120s
        """
    }
    }

    post {
        success { echo '✅ Build & Push thành công!' }
        failure { echo '❌ Pipeline thất bại!' }
    }
}