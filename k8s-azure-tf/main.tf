# =============================================================
# K8s Cluster – Azure (1 Control Plane + 2 Workers)
# Control Plane : Standard_D4s_v3  (2 vCPU / 8 GB RAM)
# Workers       : Standard_D2s_v3  (2 vCPU /  8 GB RAM)
# =============================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# ------------------------------------------------------------------
# Resource Group
# ------------------------------------------------------------------
resource "azurerm_resource_group" "k8s" {
  name     = "${var.prefix}-k8s-rg"
  location = var.location
  tags     = var.tags
}

# ------------------------------------------------------------------
# Networking
# ------------------------------------------------------------------
resource "azurerm_virtual_network" "k8s" {
  name                = "${var.prefix}-vnet"
  location            = azurerm_resource_group.k8s.location
  resource_group_name = azurerm_resource_group.k8s.name
  address_space       = ["10.0.0.0/16"]
  tags                = var.tags
}

resource "azurerm_subnet" "k8s" {
  name                 = "${var.prefix}-subnet"
  resource_group_name  = azurerm_resource_group.k8s.name
  virtual_network_name = azurerm_virtual_network.k8s.name
  address_prefixes     = ["10.0.1.0/24"]
}

# ------------------------------------------------------------------
# Network Security Group
# ------------------------------------------------------------------
resource "azurerm_network_security_group" "k8s" {
  name                = "${var.prefix}-nsg"
  location            = azurerm_resource_group.k8s.location
  resource_group_name = azurerm_resource_group.k8s.name
  tags                = var.tags

  # SSH – restricted to your IP
  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Kubernetes API server
  security_rule {
    name                       = "K8s-API"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Internal cluster traffic (pod/service CIDR)
  security_rule {
    name                       = "Internal-Cluster"
    priority                   = 1003
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "10.0.0.0/16"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "k8s" {
  subnet_id                 = azurerm_subnet.k8s.id
  network_security_group_id = azurerm_network_security_group.k8s.id
}

# ------------------------------------------------------------------
# SSH Key
# ------------------------------------------------------------------
resource "azurerm_ssh_public_key" "k8s" {
  name                = "${var.prefix}-ssh-key"
  resource_group_name = azurerm_resource_group.k8s.name
  location            = azurerm_resource_group.k8s.location
  public_key          = file(var.ssh_public_key_path)
}

# ------------------------------------------------------------------
# Control Plane VM
# ------------------------------------------------------------------
resource "azurerm_public_ip" "control_plane" {
  name                = "${var.prefix}-cp-pip"
  location            = azurerm_resource_group.k8s.location
  resource_group_name = azurerm_resource_group.k8s.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.tags
}

resource "azurerm_network_interface" "control_plane" {
  name                = "${var.prefix}-cp-nic"
  location            = azurerm_resource_group.k8s.location
  resource_group_name = azurerm_resource_group.k8s.name
  tags                = var.tags

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.k8s.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.1.10"
    public_ip_address_id          = azurerm_public_ip.control_plane.id
  }
}

resource "azurerm_linux_virtual_machine" "control_plane" {
  name                  = "${var.prefix}-control-plane"
  location              = azurerm_resource_group.k8s.location
  resource_group_name   = azurerm_resource_group.k8s.name
  size                  = "Standard_D2s_v3" # 4 vCPU / 16 GB – etcd + api-server + scheduler + controller
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.control_plane.id]
  tags                  = merge(var.tags, { Role = "control-plane" })

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 100
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(templatefile("${path.module}/scripts/control-plane-init.sh.tpl", {
  pod_cidr     = var.pod_cidr
  service_cidr = var.service_cidr
  k8s_version  = var.k8s_version
  private_ip   = azurerm_network_interface.control_plane.private_ip_address
  public_ip    = azurerm_public_ip.control_plane.ip_address
}))
}

# ------------------------------------------------------------------
# Worker Nodes  (count = 2)
# ------------------------------------------------------------------
resource "azurerm_public_ip" "worker" {
  count               = var.worker_count
  name                = "${var.prefix}-worker-${count.index + 1}-pip"
  location            = azurerm_resource_group.k8s.location
  resource_group_name = azurerm_resource_group.k8s.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.tags
}

resource "azurerm_network_interface" "worker" {
  count               = var.worker_count
  name                = "${var.prefix}-worker-${count.index + 1}-nic"
  location            = azurerm_resource_group.k8s.location
  resource_group_name = azurerm_resource_group.k8s.name
  tags                = var.tags

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.k8s.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.1.${count.index + 20}"
    public_ip_address_id          = azurerm_public_ip.worker[count.index].id
  }
}

resource "azurerm_linux_virtual_machine" "worker" {
  count                 = var.worker_count
  name                  = "${var.prefix}-worker-${count.index + 1}"
  location              = azurerm_resource_group.k8s.location
  resource_group_name   = azurerm_resource_group.k8s.name
  size                  = "Standard_D2s_v3" # 2 vCPU / 8 GB
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.worker[count.index].id]
  tags                  = merge(var.tags, { Role = "worker", Index = tostring(count.index + 1) })

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 80
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(templatefile("${path.module}/scripts/worker-init.sh.tpl", {
    k8s_version = var.k8s_version
  }))
}
