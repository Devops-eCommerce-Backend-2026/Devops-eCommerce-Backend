# K8s Cluster on Azure – Terraform

Provisions **1 control plane + 2 worker nodes** on Azure using Ubuntu 22.04.

| Role          | VM Size           | vCPU | RAM   | Disk  |
|---------------|-------------------|------|-------|-------|
| Control Plane | Standard_D2s_v3   | 2    | 8 GB | 80GB |
| Worker x1     | Standard_D2s_v3   | 2    |  8 GB |  80GB |

---

## Prerequisites

- [Terraform >= 1.5](https://developer.hashicorp.com/terraform/install)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- An SSH key pair at `~/.ssh/id_rsa` / `~/.ssh/id_rsa.pub`

---

## Quick Start

```bash
# 1. Authenticate with Azure
az login
az account set --subscription "<your-subscription-id>"

# 2. Configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars – fill in subscription_id and admin_cidr

# 3. Deploy
terraform init
terraform plan
terraform apply

# 4. SSH into the control plane (wait ~5 min for cloud-init)
ssh azureuser@<control_plane_public_ip>
sudo tail -f /var/log/k8s-bootstrap.log   # watch bootstrap progress

# 5. Join the worker nodes
# On the control plane, get the join command:
cat ~/worker-join-command.sh

# SSH into each worker and run the command as root:
ssh azureuser@<worker_ip>
sudo bash -c "$(ssh azureuser@<control_plane_ip> 'cat ~/worker-join-command.sh')"

# 6. Fetch kubeconfig to your local machine
scp azureuser@<control_plane_public_ip>:/etc/kubernetes/admin.conf ~/.kube/config
kubectl get nodes
```

---

## Architecture

```
                          ┌─────────────────────┐
  Your machine ──SSH/──►  │  Control Plane       │  10.0.1.10
               kubectl    │  Standard_D4s_v3     │
                          │  4 vCPU / 16 GB RAM  │
                          └──────────┬──────────┘
                                     │ 10.0.1.x (VNet)
                    ┌────────────────┴──────────────────┐
                    │                                   │
          ┌─────────┴──────────┐             ┌──────────┴─────────┐
          │  Worker 1           │             │  Worker 2           │
          │  Standard_D2s_v3   │             │  Standard_D2s_v3   │
          │  2 vCPU / 8 GB     │             │  2 vCPU / 8 GB     │
          │  10.0.1.20         │             │  10.0.1.21         │
          └────────────────────┘             └────────────────────┘
```

---

## Terraform Install (Linux/macOS)

```bash
# Linux (amd64)
curl -fsSL https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_amd64.zip \
  -o terraform.zip && unzip terraform.zip && sudo mv terraform /usr/local/bin/

# macOS (Homebrew)
brew tap hashicorp/tap && brew install hashicorp/tap/terraform

# Verify
terraform version
```

---

## Tear Down

```bash
terraform destroy
```
