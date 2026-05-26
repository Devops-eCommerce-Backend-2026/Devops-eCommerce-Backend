# Copy this file to terraform.tfvars and fill in your values

subscription_id     = "ea1b8990-39ca-40a0-8c4d-5b98b6dede1b"
prefix              = "k8s"
location            = "Southeast Asia"
admin_username      = "azureuser"
ssh_public_key_path = "/home/andy_68/.ssh/id_rsa.pub"
admin_cidr          = "1.53.235.236/32"   # curl ifconfig.me
worker_count        = 1
k8s_version         = "1.29"
pod_cidr            = "192.168.0.0/16"
service_cidr        = "10.96.0.0/12"

tags = {
  Environment = "dev"
  Project     = "k8s-cluster"
  ManagedBy   = "terraform"
}
