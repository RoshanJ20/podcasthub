# The Audit Brief — Azure VM Deployment Guide

A step-by-step guide for deploying The Audit Brief on an Azure Virtual Machine. Written for deployment engineers with no prior context about the project.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Architecture](#3-architecture)
4. [Azure Resource Provisioning](#4-azure-resource-provisioning)
5. [VM Setup](#5-vm-setup)
6. [Database Setup](#6-database-setup)
7. [Environment Configuration](#7-environment-configuration)
8. [Build and Start](#8-build-and-start)
9. [Nginx Configuration](#9-nginx-configuration)
10. [SSL Certificate](#10-ssl-certificate)
11. [Microsoft Entra ID SSO (Optional)](#11-microsoft-entra-id-sso-optional)
12. [Health Check Verification](#12-health-check-verification)
13. [Ongoing Operations](#13-ongoing-operations)
14. [Rollback Procedure](#14-rollback-procedure)
15. [Troubleshooting](#15-troubleshooting)
16. [Environment Variables Reference](#16-environment-variables-reference)

---

## 1. Overview

**The Audit Brief** is an internal enterprise web application for audit professionals. It provides audio content (bulletins) with transcripts, bookmarks, learning paths, and AI-powered semantic search.

**Tech stack:**

- **Runtime:** Next.js 15.3 (Node.js 20 LTS) — standalone server managed by pm2
- **Database:** Azure Database for PostgreSQL Flexible Server (16 + pgvector)
- **Storage:** Azure Blob Storage (audio files, PDFs, images)
- **Auth:** NextAuth v4 (email/password + optional Microsoft Entra ID SSO)
- **AI:** Azure OpenAI (text-embedding-3-large for semantic search — optional)
- **Hosting:** Azure VM with Nginx reverse proxy
- **Application port:** 3103

---

## 2. Prerequisites

### Required tools (on your local machine)

| Tool      | Minimum Version | Check Command    |
| --------- | --------------- | ---------------- |
| Azure CLI | 2.57.0          | `az --version`   |
| Node.js   | 20.11.0         | `node --version` |
| npm       | 10.0.0          | `npm --version`  |
| Git       | 2.40.0          | `git --version`  |
| SSH       | any             | `ssh -V`         |

### Required access

- **Azure subscription** with **Contributor** role
- **SSH access** to the target Azure VM
- **GitHub repository** access (to clone the code)
- **Microsoft Entra ID** with **Application Administrator** role (only if enabling SSO)

---

## 3. Architecture

```mermaid
graph TB
    subgraph "Client"
        Browser["Web Browser"]
    end

    subgraph "Azure VM (Ubuntu 22.04 LTS)"
        Nginx["Nginx<br/>:80 / :443<br/>(SSL + reverse proxy)"]
        PM2["pm2 Process Manager"]
        NextJS["Next.js 15.3 Standalone<br/>Node.js 20 LTS<br/>:3103"]
    end

    subgraph "Azure Managed Services"
        PostgreSQL["Azure Database for<br/>PostgreSQL Flexible Server<br/>(16 + pgvector)"]
        Blob["Azure Blob Storage"]
    end

    subgraph "Optional"
        OpenAI["Azure OpenAI"]
        Entra["Microsoft Entra ID"]
        Sentry["Sentry<br/>(reserved — SDK not initialized)"]
    end

    Browser -->|"HTTPS :443"| Nginx
    Nginx -->|"proxy_pass :3103"| PM2
    PM2 --> NextJS
    NextJS -->|"Prisma ORM (SSL)"| PostgreSQL
    NextJS -->|"Azure SDK"| Blob
    NextJS -.->|"Embeddings API"| OpenAI
    NextJS -.->|"OAuth2 / OIDC"| Entra
    NextJS -.->|"Error tracking"| Sentry
```

**Traffic flow:** Browser → Nginx (SSL termination on :443) → pm2 → Node.js app on :3103 → Azure PostgreSQL + Blob Storage.

---

## 4. Azure Resource Provisioning

### 4.1 Login and set subscription

```bash
az login
az account set --subscription "<YOUR_SUBSCRIPTION_ID>"
```

### 4.2 Create Resource Group

```bash
RESOURCE_GROUP="rg-auditbrief-production"
LOCATION="eastus2"

az group create --name $RESOURCE_GROUP --location $LOCATION
```

### 4.3 Create Azure VM

```bash
VM_NAME="vm-auditbrief"

az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --nsg-rule SSH
```

Record the **public IP** from the output.

### 4.4 Open firewall ports (HTTP + HTTPS)

```bash
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 80 --priority 1010
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 443 --priority 1020
```

### 4.5 Create Azure Database for PostgreSQL Flexible Server

```bash
PG_SERVER="psql-auditbrief"
PG_ADMIN="auditbrief"
PG_PASSWORD="<GENERATE_STRONG_PASSWORD>"

az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER \
  --location $LOCATION \
  --admin-user $PG_ADMIN \
  --admin-password "$PG_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --yes

# Allow access from the VM's public IP
VM_IP=$(az vm show -g $RESOURCE_GROUP -n $VM_NAME -d --query publicIps -o tsv)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER \
  --rule-name "allow-vm" \
  --start-ip-address $VM_IP \
  --end-ip-address $VM_IP
```

Record the server FQDN: `psql-auditbrief.postgres.database.azure.com`

### 4.6 Enable PostgreSQL extensions

```bash
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $PG_SERVER \
  --name azure.extensions \
  --value "VECTOR,UUID-OSSP"
```

### 4.7 Create Azure Blob Storage

```bash
STORAGE_ACCOUNT="stauditbrief"

az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --name "the-audit-brief-uploads" \
  --auth-mode login
```

Retrieve the connection string:

```bash
az storage account show-connection-string \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --output tsv
```

---

## 5. VM Setup

SSH into the Azure VM:

```bash
ssh azureuser@<VM_PUBLIC_IP>
```

### 5.1 System updates

```bash
sudo apt update && sudo apt upgrade -y
```

### 5.2 Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # Should print v20.x.x
npm --version    # Should print 10.x.x
```

### 5.3 Install pm2

```bash
sudo npm install -g pm2
```

### 5.4 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 5.5 Install Certbot (for SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.6 Create application user

```bash
sudo useradd -m -s /bin/bash auditbrief
sudo mkdir -p /opt/auditbrief
sudo chown auditbrief:auditbrief /opt/auditbrief
```

### 5.7 Clone and install the application

```bash
sudo -u auditbrief bash
cd /opt/auditbrief

git clone <REPO_URL> app
cd app
npm install
```

---

## 6. Database Setup

### 6.1 Create the database

Connect to the PostgreSQL server:

```bash
psql "host=psql-auditbrief.postgres.database.azure.com port=5432 dbname=postgres user=auditbrief sslmode=require"
```

Create the application database and enable extensions:

```sql
CREATE DATABASE auditbrief;
\c auditbrief
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### 6.2 Run Prisma migrations

From the application directory (`/opt/auditbrief/app`):

```bash
# Set DATABASE_URL temporarily for migration
export DATABASE_URL="postgresql://auditbrief:<PASSWORD>@psql-auditbrief.postgres.database.azure.com:5432/auditbrief?sslmode=require"

npx prisma migrate deploy
```

Verify migrations applied:

```bash
npx prisma migrate status
```

---

## 7. Environment Configuration

Create the production environment file:

```bash
sudo -u auditbrief nano /opt/auditbrief/app/.env
```

Populate with the following (replace placeholders):

```bash
# Database
DATABASE_URL="postgresql://auditbrief:<PASSWORD>@psql-auditbrief.postgres.database.azure.com:5432/auditbrief?sslmode=require"

# Auth (NextAuth v4)
NEXTAUTH_SECRET="<GENERATE_WITH: openssl rand -base64 32>"
NEXTAUTH_URL="https://<YOUR_DOMAIN>/auditbrief"
# CRITICAL: NEXTAUTH_URL must include the /auditbrief basePath.
# Example: https://uat.uno.wcgt.in/auditbrief
# If this doesn't match the actual request URL (including basePath), NextAuth will
# reject all sign-in attempts with a CSRF verification error.
# Do NOT include a trailing slash. Do NOT use localhost in production.

# Azure Blob Storage
AZURE_BLOB_CONNECTION_STRING="<FROM_STEP_4.7>"
AZURE_BLOB_CONTAINER="the-audit-brief-uploads"

# Azure AD SSO (optional — leave empty to disable)
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""

# Azure OpenAI (optional — for semantic search)
AZURE_OPENAI_ENDPOINT=""
AZURE_OPENAI_API_KEY=""
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=""

# Sentry (RESERVED — SDK not currently initialized; leave empty until sentry.*.config.ts exists)
SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_DSN=""

# App
NEXT_PUBLIC_APP_URL="https://<YOUR_DOMAIN>"
NEXT_PUBLIC_BASE_PATH="/auditbrief"
NODE_ENV="production"
PORT=3103
LOG_LEVEL="info"

# Performance tuning
BCRYPT_SALT_ROUNDS=12          # Bcrypt cost factor; lib/auth/password.ts
SLOW_QUERY_THRESHOLD_MS=500    # Slow-query log threshold; lib/db-instrumentation.ts
```

Set restrictive file permissions:

```bash
sudo chmod 600 /opt/auditbrief/app/.env
sudo chown auditbrief:auditbrief /opt/auditbrief/app/.env
```

---

## 8. Build and Start

### 8.1 Build the application

```bash
sudo -u auditbrief bash
cd /opt/auditbrief/app

# Load production env for the build
set -a; source .env; set +a

npm run build
```

### 8.2 Create pm2 ecosystem config

This file is **not committed to the repository** because log paths and `env_file` paths are VM-specific. Create it on the VM as shown below.

Create `/opt/auditbrief/app/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'auditbrief',
      script: 'node_modules/.bin/next',
      args: 'start -p 3103',
      cwd: '/opt/auditbrief/app',
      env_file: '/opt/auditbrief/app/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3103,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/auditbrief/logs/error.log',
      out_file: '/opt/auditbrief/logs/output.log',
      merge_logs: true,
    },
  ],
};
```

### 8.3 Create log directory and start

```bash
sudo mkdir -p /opt/auditbrief/logs
sudo chown auditbrief:auditbrief /opt/auditbrief/logs

# Start the app
sudo -u auditbrief bash
cd /opt/auditbrief/app
pm2 start ecosystem.config.js

# Verify it is running
pm2 status
pm2 logs auditbrief --lines 20
```

### 8.4 Configure pm2 to start on boot

```bash
# Generate startup script (run as root, then execute the output command)
pm2 startup systemd -u auditbrief --hp /home/auditbrief

# Save the current process list
sudo -u auditbrief pm2 save
```

---

## 9. Nginx Configuration

### 9.1 Create site config

Create `/etc/nginx/sites-available/auditbrief`:

```nginx
server {
    listen 80;
    server_name <YOUR_DOMAIN>;

    # Redirect all HTTP to HTTPS (Certbot will modify this)
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name <YOUR_DOMAIN>;

    # SSL certificates (Certbot will populate these)
    # ssl_certificate /etc/letsencrypt/live/<YOUR_DOMAIN>/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/<YOUR_DOMAIN>/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Static assets (Next.js build output) — long cache
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3103;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Reverse proxy to Next.js app
    location / {
        proxy_pass http://127.0.0.1:3103;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Forward client info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings for large responses
        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 4 16k;

        # Max upload size (audio files up to 1GB)
        client_max_body_size 1G;
    }

    # Health check bypass (no rate limiting, no caching)
    location /api/health {
        proxy_pass http://127.0.0.1:3103;
        proxy_set_header Host $host;
        access_log off;
    }

    location /api/ready {
        proxy_pass http://127.0.0.1:3103;
        proxy_set_header Host $host;
        access_log off;
    }
}
```

### 9.2 Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/auditbrief /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. SSL Certificate

### 10.1 Obtain certificate with Certbot

Ensure your domain's DNS A record points to the VM's public IP, then:

```bash
sudo certbot --nginx -d <YOUR_DOMAIN> --non-interactive --agree-tos -m <YOUR_EMAIL>
```

Certbot will automatically modify the Nginx config to include SSL certificate paths and redirect HTTP to HTTPS.

### 10.2 Verify auto-renewal

```bash
sudo certbot renew --dry-run
```

Certbot installs a systemd timer that renews certificates automatically before expiry.

---

## 11. Microsoft Entra ID SSO (Optional)

Skip this section if SSO is not needed. Users can still log in with email/password.

### 11.1 Register an App in Azure Portal

1. Go to **Azure Portal** > **Microsoft Entra ID** > **App registrations** > **New registration**
2. **Name:** `The Audit Brief`
3. **Supported account types:** Single tenant (this organization only)
4. **Redirect URI:**
   - **Platform:** Select **"Web"** (NOT "Single-page application")
   - **URL:** `https://<YOUR_DOMAIN>/auditbrief/api/auth/callback/azure-ad`
     (the `/auditbrief` segment is the app's basePath — it must be present or NextAuth will reject the callback)
5. Click **Register**

> **IMPORTANT:** The platform MUST be **"Web"**. The Audit Brief is a server-rendered
> Next.js application that uses a confidential OAuth client (client ID + client secret).
> Selecting "Single-page application (SPA)" will cause OAuth errors because the SPA platform
> uses PKCE without a client secret, which is incompatible with NextAuth's Azure AD provider.
>
> **If you already registered with the wrong platform:** Go to **Authentication** >
> **Platform configurations**, remove the SPA entry, and add a new **Web** platform with
> the correct redirect URI.

### 11.2 Configure the App

1. Note the **Application (client) ID** → set as `AZURE_AD_CLIENT_ID`
2. Note the **Directory (tenant) ID** → set as `AZURE_AD_TENANT_ID`
3. Go to **Certificates & secrets** > **New client secret** → set value as `AZURE_AD_CLIENT_SECRET`

### 11.3 Update environment

Edit `/opt/auditbrief/app/.env` and fill in the three `AZURE_AD_*` variables, then restart:

```bash
sudo -u auditbrief pm2 restart auditbrief
```

---

## 12. Health Check Verification

### 12.1 Local health check (from the VM)

```bash
curl -s http://localhost:3103/api/health | jq .
# Expected: { "status": "ok", "timestamp": "...", "version": "2.0.0" }

curl -s http://localhost:3103/api/ready | jq .
# Expected: { "status": "ready", "checks": { "database": "ok" }, "timestamp": "..." }
```

### 12.2 External health check (from your machine)

```bash
curl -s https://<YOUR_DOMAIN>/api/health | jq .
curl -s https://<YOUR_DOMAIN>/api/ready | jq .
```

### 12.3 Functional smoke test

1. Open `https://<YOUR_DOMAIN>` in a browser
2. Register a new account at `/register`
3. Log in at `/login`
4. Verify the dashboard loads and API requests succeed
5. If SSO is enabled, test "Sign in with Microsoft" on the login page

---

## 13. Ongoing Operations

### 13.1 Viewing logs

```bash
# Real-time application logs
sudo -u auditbrief pm2 logs auditbrief

# pm2 process monitoring dashboard
sudo -u auditbrief pm2 monit

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 13.2 Deploying updates

```bash
sudo -u auditbrief bash
cd /opt/auditbrief/app

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Run database migrations (if any)
set -a; source .env; set +a
npx prisma migrate deploy

# Rebuild the application
npm run build

# Restart with zero downtime
pm2 restart auditbrief

# Verify health
curl -s http://localhost:3103/api/ready | jq .
```

### 13.3 Log rotation

pm2 handles log rotation with the logrotate module:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
```

### 13.4 Database backups

Azure Database for PostgreSQL Flexible Server provides automated backups:

- **Retention:** 7-35 days (configurable)
- **Point-in-time restore:** Available for any point within the retention period

To configure:

```bash
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER \
  --backup-retention 14
```

### 13.5 VM monitoring

```bash
# CPU, memory, disk usage
htop

# Disk space
df -h

# pm2 process stats
pm2 status
```

---

## 14. Rollback Procedure

### 14.1 Application rollback

```bash
sudo -u auditbrief bash
cd /opt/auditbrief/app

# Revert to the previous known-good commit
git log --oneline -5         # Find the target commit
git checkout <COMMIT_SHA>

# Rebuild and restart
npm install
npm run build
pm2 restart auditbrief

# Verify health
curl -s http://localhost:3103/api/ready | jq .
```

### 14.2 Database rollback

**Option A — Revert last migration (if safe):**

```bash
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>
```

**Option B — Point-in-time restore (Azure Portal):**

1. Go to **Azure Portal** > **PostgreSQL Flexible Server** > **Backups**
2. Click **Restore** and select a point in time before the failed migration
3. This creates a new server instance — update `DATABASE_URL` to point to the restored server

---

## 15. Troubleshooting

### App won't start

```bash
# Check pm2 status and error logs
pm2 status
pm2 logs auditbrief --err --lines 50

# Common causes:
# - Missing .env file
# - DATABASE_URL unreachable (check firewall rules)
# - Port 3103 already in use: lsof -i :3103
# - Build not run: npm run build
```

### Nginx returns 502 Bad Gateway

```bash
# App is not running or not on port 3103
pm2 status                        # Is the app "online"?
curl http://localhost:3103/api/health  # Can the app be reached directly?

# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log
```

### Database connection failed

```bash
# Test connectivity from VM
psql "host=psql-auditbrief.postgres.database.azure.com port=5432 dbname=auditbrief user=auditbrief sslmode=require"

# Common causes:
# - VM IP not in PostgreSQL firewall rules
# - Wrong password in DATABASE_URL
# - SSL mode not set (Azure requires sslmode=require)
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

### Out of disk space

```bash
df -h
# Clean old logs
pm2 flush
# Clean npm cache
npm cache clean --force
# Clean old Next.js builds
rm -rf /opt/auditbrief/app/.next/cache
```

### Prisma migration errors

```bash
# Check migration status
npx prisma migrate status

# If a migration failed mid-way, resolve it
npx prisma migrate resolve --applied <MIGRATION_NAME>
# OR
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>
```

---

## 16. Environment Variables Reference

| Variable                            | Required | Description                                                                   | Example                                               |
| ----------------------------------- | -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`                      | Yes      | PostgreSQL connection string with SSL                                         | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `NEXTAUTH_SECRET`                   | Yes      | Secret for encrypting NextAuth JWT sessions (min 32 chars)                    | `openssl rand -base64 32`                             |
| `NEXTAUTH_URL`                      | Yes      | Canonical URL including `/auditbrief` basePath                                | `https://auditbrief.example.com/auditbrief`           |
| `PORT`                              | Yes      | Port the Node.js server listens on                                            | `3103`                                                |
| `NODE_ENV`                          | Yes      | Runtime environment                                                           | `production`                                          |
| `AZURE_BLOB_CONNECTION_STRING`      | Yes      | Azure Blob Storage connection string                                          | `DefaultEndpointsProtocol=https;AccountName=...`      |
| `AZURE_BLOB_CONTAINER`              | No       | Blob container name                                                           | `the-audit-brief-uploads` (default)                   |
| `AZURE_AD_CLIENT_ID`                | No       | Microsoft Entra ID app client ID (for SSO)                                    | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`                |
| `AZURE_AD_CLIENT_SECRET`            | No       | Microsoft Entra ID app client secret                                          | (secret value)                                        |
| `AZURE_AD_TENANT_ID`                | No       | Microsoft Entra ID directory tenant ID                                        | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`                |
| `AZURE_OPENAI_ENDPOINT`             | No       | Azure OpenAI service endpoint (for semantic search)                           | `https://xxx.openai.azure.com`                        |
| `AZURE_OPENAI_API_KEY`              | No       | Azure OpenAI API key (read by `lib/embeddings.ts:33`)                         | (key value)                                           |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | No       | Azure OpenAI embedding model deployment name (read by `lib/embeddings.ts:34`) | `text-embedding-3-large`                              |
| `SENTRY_DSN`                        | No       | Sentry error tracking DSN — **reserved; SDK not currently initialized**       | `https://xxx@sentry.io/xxx`                           |
| `NEXT_PUBLIC_SENTRY_DSN`            | No       | Sentry DSN (client bundle) — **reserved**                                     | `https://xxx@sentry.io/xxx`                           |
| `NEXT_PUBLIC_APP_URL`               | No       | Origin URL (no basePath) — used for CORS, metadata                            | `https://auditbrief.example.com`                      |
| `NEXT_PUBLIC_BASE_PATH`             | No       | Deployment subpath (must match `basePath` segment of `NEXTAUTH_URL`)          | `/auditbrief` (default)                               |
| `BCRYPT_SALT_ROUNDS`                | No       | Bcrypt cost factor for password hashing (`lib/auth/password.ts`)              | `12` (default)                                        |
| `SLOW_QUERY_THRESHOLD_MS`           | No       | Slow-query log threshold in ms (`lib/db-instrumentation.ts:26`)               | `500` (default)                                       |
| `LOG_LEVEL`                         | No       | Pino log level                                                                | `info` (default in production)                        |

> **Legacy variable names:** Bicep templates and earlier `.env` files emit `AZURE_OPENAI_KEY` and `AZURE_OPENAI_DEPLOYMENT`. The application code reads the new `_API_KEY` / `_EMBEDDING_DEPLOYMENT` names — populate the new names on the VM.
