#!/bin/bash
# cloud-init bootstrap – Kubernetes Control Plane
# Kubernetes version : ${k8s_version}
# Pod CIDR           : ${pod_cidr}
# Service CIDR       : ${service_cidr}

set -euo pipefail
exec > >(tee /var/log/k8s-bootstrap.log | logger -t k8s-bootstrap) 2>&1

echo "=== [1/6] System prerequisites ==="
apt-get update -y
apt-get install -y apt-transport-https ca-certificates curl gpg

# Disable swap (required by kubelet)
swapoff -a
sed -i '/swap/d' /etc/fstab

# Load kernel modules
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
modprobe overlay
modprobe br_netfilter

# Sysctl settings for networking
cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sysctl --system

echo "=== [2/6] Install containerd ==="
apt-get install -y containerd
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd

echo "=== [3/6] Install kubeadm, kubelet, kubectl ==="
curl -fsSL "https://pkgs.k8s.io/core:/stable:/v${k8s_version}/deb/Release.key" \
  | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
  https://pkgs.k8s.io/core:/stable:/v${k8s_version}/deb/ /" \
  | tee /etc/apt/sources.list.d/kubernetes.list

apt-get update -y
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

echo "=== [4/6] kubeadm init ==="
# PRIVATE_IP=$(curl -s -H "Metadata:true" \
#   "http://10.0.1.10/metadata/instance/network/interface/0/ipv4/ipAddress/0/privateIpAddress?api-version=2021-02-01&format=text")
# PUBLIC_IP=$(curl -s -H "Metadata:true" \
#   "http://4.193.210.31/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text")
PRIVATE_IP="${private_ip}"
PUBLIC_IP="${public_ip}"
kubeadm init \
  --apiserver-advertise-address="$PRIVATE_IP" \
  --apiserver-cert-extra-sans="$PUBLIC_IP,$PRIVATE_IP" \
  --pod-network-cidr="${pod_cidr}" \
  --service-cidr="${service_cidr}" \
  --kubernetes-version="v${k8s_version}.0" \
  --upload-certs

echo "=== [5/6] Configure kubectl for azureuser ==="
mkdir -p /home/azureuser/.kube
cp /etc/kubernetes/admin.conf /home/azureuser/.kube/config
chown -R azureuser:azureuser /home/azureuser/.kube

# Also set up for root
mkdir -p /root/.kube
cp /etc/kubernetes/admin.conf /root/.kube/config

echo "=== [6/6] Install Calico CNI ==="
export KUBECONFIG=/etc/kubernetes/admin.conf
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

# Save join command for workers
kubeadm token create --print-join-command > /home/azureuser/worker-join-command.sh
chmod 600 /home/azureuser/worker-join-command.sh
chown azureuser:azureuser /home/azureuser/worker-join-command.sh

echo "=== Control plane bootstrap complete ==="
echo "Join command saved to /home/azureuser/worker-join-command.sh"
