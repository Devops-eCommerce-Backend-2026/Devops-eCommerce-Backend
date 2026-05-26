variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "prefix" {
  description = "Prefix applied to all resource names"
  type        = string
  default     = "k8s"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "Southeast Asia"
}

variable "admin_username" {
  description = "SSH admin username for all VMs"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key_path" {
  description = "Path to your SSH public key file"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "admin_cidr" {
  description = "CIDR allowed to SSH and reach the K8s API (your IP, e.g. 1.2.3.4/32)"
  type        = string
  default     = "0.0.0.0/0" 
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "k8s_version" {
  description = "Kubernetes version to install"
  type        = string
  default     = "1.29"
}

variable "pod_cidr" {
  description = "CIDR for pod networking (Flannel/Calico)"
  type        = string
  default     = "192.168.0.0/16"
}

variable "service_cidr" {
  description = "CIDR for Kubernetes services"
  type        = string
  default     = "10.96.0.0/12"
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default = {
    Environment = "dev"
    Project     = "k8s-cluster"
    ManagedBy   = "terraform"
  }
}
