pipeline {
    agent any

    environment {
        IMAGE_NAME = "jandzizjandy/ecommerce-backend:latest"
    }

    stages {
        stage('Cleanup Workspace') {
            steps { cleanWs() }
        }

        stage('Clone Repository') {
            steps {
                git branch: 'son-jenkins',
                    url: 'https://github.com/Devops-eCommerce-Backend-2026/Devops-eCommerce-Backend.git'
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

    post {
        success { echo '✅ Build & Push thành công!' }
        failure { echo '❌ Pipeline thất bại!' }
    }
}