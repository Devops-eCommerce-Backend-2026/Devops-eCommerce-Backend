output "control_plane_public_ip" {
  description = "Public IP of the control plane (use for kubectl & SSH)"
  value       = azurerm_public_ip.control_plane.ip_address
}

output "control_plane_private_ip" {
  description = "Private IP of the control plane"
  value       = azurerm_network_interface.control_plane.private_ip_address
}

output "worker_public_ips" {
  description = "Public IPs of the worker nodes"
  value       = azurerm_public_ip.worker[*].ip_address
}

output "worker_private_ips" {
  description = "Private IPs of the worker nodes"
  value       = azurerm_network_interface.worker[*].private_ip_address
}

output "ssh_control_plane" {
  description = "SSH command to reach the control plane"
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.control_plane.ip_address}"
}

output "resource_group" {
  description = "Resource group name"
  value       = azurerm_resource_group.k8s.name
}

output "kubeconfig_hint" {
  description = "Command to fetch kubeconfig once cluster is ready"
  value       = "scp ${var.admin_username}@${azurerm_public_ip.control_plane.ip_address}:/etc/kubernetes/admin.conf ~/.kube/config"
}
