pipeline {
    agent any
    triggers {
        githubPush()
    }
    tools {
        nodejs 'NodeJS18'   
    }
    environment {
        IMAGE_NAME = "jandzizjandy/ecommerce-backend:latest"
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
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh """
                        # Update image in deployment
                        sed -i 's|image: ${IMAGE_NAME}|image: ${IMAGE_NAME}|g' k8s-config/deployment.yaml
                        
                        # Apply all manifests in k8s-config folder
                        kubectl --kubeconfig=$KUBECONFIG apply -f k8s-config/
                        
                        # Force pods to restart with new image
                        kubectl --kubeconfig=$KUBECONFIG rollout restart deployment/ecommerce-backend
                        
                        # Wait for rollout to finish
                        kubectl --kubeconfig=$KUBECONFIG rollout status deployment/ecommerce-backend
                    """
                }
            }
        }
    }

    post {
        success { echo '✅ Build & Push thành công!' }
        failure { echo '❌ Pipeline thất bại!' }
    }
}
