#!/bin/bash
# cloud-init bootstrap – Kubernetes Worker Node
# Kubernetes version : ${k8s_version}

set -euo pipefail
exec > >(tee /var/log/k8s-bootstrap.log | logger -t k8s-bootstrap) 2>&1

echo "=== [1/4] System prerequisites ==="
apt-get update -y
apt-get install -y apt-transport-https ca-certificates curl gpg

# Disable swap
swapoff -a
sed -i '/swap/d' /etc/fstab

# Kernel modules
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
modprobe overlay
modprobe br_netfilter

cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sysctl --system

echo "=== [2/4] Install containerd ==="
apt-get install -y containerd
mkdir -p /etc/containerd
containerd config default | tee /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd

echo "=== [3/4] Install kubeadm, kubelet, kubectl ==="
curl -fsSL "https://pkgs.k8s.io/core:/stable:/v${k8s_version}/deb/Release.key" \
  | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
  https://pkgs.k8s.io/core:/stable:/v${k8s_version}/deb/ /" \
  | tee /etc/apt/sources.list.d/kubernetes.list

apt-get update -y
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

echo "=== [4/4] Worker node ready – waiting for join command ==="
# NOTE: After control plane is ready, run the join command from:
#   /home/azureuser/worker-join-command.sh  (on the control plane)
# Then execute it as root on this worker node.
echo "Worker bootstrap complete. Awaiting kubeadm join."
