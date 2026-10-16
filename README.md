# TechRescue Frontend — Production Deployment & Manual VM Setup Guide

This guide provides step-by-step manual deployment instructions for running the **TechRescue Frontend** on a dedicated **Azure Linux Virtual Machine (Ubuntu 22.04 LTS)** behind an **Nginx Web Server** and integrated with **Azure Application Gateway**.

---

## 📋 1. Prerequisites

### Azure Virtual Machine Sizing
- **VM Name**: `techrescue-vm-frontend`
- **Recommended SKU**: `Standard_B2s` (2 vCPUs, 4 GiB RAM) or `Standard_B2ms`
- **Operating System**: Ubuntu 22.04 LTS (x64)
- **Disk Size**: 30 GiB Standard SSD (OS Disk)

### Network Security Group (NSG) Inbound Rules
Configure the following inbound port rules in your Azure NSG (`techrescue-frontend-nsg`):
| Priority | Name | Port | Protocol | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **100** | `Allow-SSH` | `22` | TCP | Your Admin IP / Bastion | Secure SSH Administration |
| **110** | `Allow-HTTP-AppGateway` | `80` | TCP | `AppGatewaySubnet` (`10.0.0.0/24`) | Web Traffic from Application Gateway |
| **120** | `Allow-HTTPS-Direct` | `443` | TCP | Internet / Any (Optional) | Direct SSL Access (if bypassing Gateway) |

---

## 🛠 2. Step-by-Step Manual Deployment on Frontend VM

### Step 1: Connect to the Frontend VM
```bash
ssh azureuser@<FRONTEND_VM_PUBLIC_IP_OR_BASTION>
```

### Step 2: Update System & Install Core Utilities
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw nginx
```

### Step 3: Install Node.js 20.x LTS
```bash
# Add NodeSource official repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js & NPM
sudo apt install -y nodejs

# Verify versions
node -v   # Should output v20.x.x
npm -v    # Should output 10.x.x
```

### Step 4: Clone Repository & Setup Permissions
```bash
# Create application root directory
sudo mkdir -p /var/www/techrescue-frontend
sudo chown -R $USER:$USER /var/www/techrescue-frontend

# Clone the frontend repository
git clone https://github.com/lakshyaright/techrescue_frontend.git /var/www/techrescue-frontend
cd /var/www/techrescue-frontend
```

### Step 5: Configure Environment Variables
```bash
# Copy example environment file
cp .env.example .env

# Edit .env to set your Backend API URL
nano .env
```
Inside `.env`, configure the API target:
```env
# If using Azure Application Gateway with path routing, use relative URL:
VITE_API_URL=/api/v1

# If pointing directly to Backend VM or external domain:
# VITE_API_URL=https://api.yourdomain.com/api/v1
```

### Step 6: Install Dependencies & Build Production Bundle
```bash
# Install node packages
npm install

# Build static production assets
npm run build

# Verify build output
ls -la dist/
# Output will contain index.html and assets/ directory
```

### Step 7: Configure Nginx Web Server
Create the Nginx site configuration file:
```bash
sudo nano /etc/nginx/sites-available/techrescue-frontend
```

Paste the following production configuration:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Path to Vite built production bundle
    root /var/www/techrescue-frontend/dist;
    index index.html index.htm;

    # Gzip Compression for fast delivery
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json image/svg+xml;
    gzip_disable "MSIE [1-6]\.";

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static Assets Caching
    location ~* \.(?:css|js|woff2?|svg|gif|png|jpg|jpeg|ico|webp)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    # Dedicated Health Probe for Azure Application Gateway
    location = /health {
        access_log off;
        default_type text/plain;
        return 200 "OK\n";
    }

    # Optional Reverse Proxy to Backend VM Private IP
    # (Used if traffic hits Frontend VM directly instead of Application Gateway path routing)
    location /api/ {
        proxy_pass http://10.0.2.4:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
    }

    # Single Page Application (SPA) HTML5 History Mode routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the configuration and restart Nginx:
```bash
# Link to sites-enabled
sudo ln -sf /etc/nginx/sites-available/techrescue-frontend /etc/nginx/sites-enabled/default

# Test Nginx configuration syntax
sudo nginx -t

# Restart Nginx service
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 8: Configure Local Linux Firewall (UFW)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

---

## 🔍 3. Verification & Health Checks

Run these commands directly on the VM:
```bash
# 1. Verify Nginx is active and running
sudo systemctl status nginx

# 2. Check HTTP status code for web root
curl -I http://localhost/
# Expected: HTTP/1.1 200 OK

# 3. Test Azure Application Gateway Health Probe
curl -i http://localhost/health
# Expected: HTTP/1.1 200 OK, Content: OK
```

---

## 🔄 4. How to Update Frontend Code (CI/CD / Manual Pull)

When you make changes to the repository:
```bash
cd /var/www/techrescue-frontend
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

---

## 🚨 5. Troubleshooting & Logs

| Issue | Diagnostic Command | Solution |
| :--- | :--- | :--- |
| **Nginx 404 on page refresh** | `cat /etc/nginx/sites-enabled/default` | Ensure `try_files $uri $uri/ /index.html;` is present inside `location /`. |
| **Nginx 502 Bad Gateway on `/api/`** | `curl -i http://10.0.2.4:5000/health` | Ensure Backend VM (10.0.2.4) is running on port 5000 and NSG allows port 5000. |
| **Nginx Error Logs** | `sudo tail -n 50 /var/log/nginx/error.log` | Review web server errors. |
| **Nginx Access Logs** | `sudo tail -f /var/log/nginx/access.log` | View real-time incoming requests from Application Gateway. |
