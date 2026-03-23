# The Audit Brief — Azure Deployment Guide

A step-by-step guide for deploying The Audit Brief application on Microsoft Azure. This guide is written for deployment engineers with no prior context about the project.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Architecture](#3-architecture)
4. [Azure Resource Provisioning](#4-azure-resource-provisioning)
5. [Microsoft Entra ID Configuration](#5-microsoft-entra-id-configuration)
6. [Key Vault Secret Population](#6-key-vault-secret-population)
7. [Database Setup](#7-database-setup)
8. [GitHub Repository Configuration](#8-github-repository-configuration)
9. [First Deployment](#9-first-deployment)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Ongoing Operations](#11-ongoing-operations)
12. [Rollback Procedure](#12-rollback-procedure)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

**The Audit Brief** is an internal enterprise web application for audit professionals. It provides audio content (bulletins) with transcripts, bookmarks, learning paths, and AI-powered semantic search.

**Tech stack:**

- **Runtime:** Next.js 16 (Node.js 20) — containerized with Docker
- **Database:** PostgreSQL 16 with pgvector extension (vector search)
- **Storage:** Azure Blob Storage (audio files, PDFs, images)
- **AI:** Azure OpenAI (text-embedding-3-large for semantic search)
- **Auth:** Microsoft Entra ID SSO + email/password fallback, custom JWT tokens
- **Hosting:** Azure Container Apps

---

## 2. Prerequisites

### Required tools

| Tool       | Minimum Version | Check Command      |
| ---------- | --------------- | ------------------ |
| Azure CLI  | 2.57.0          | `az --version`     |
| Docker     | 24.0            | `docker --version` |
| Node.js    | 20.11.0         | `node --version`   |
| npm        | 10.0.0          | `npm --version`    |
| GitHub CLI | 2.40.0          | `gh --version`     |
| Git        | 2.40.0          | `git --version`    |

### Required access

- **Azure subscription** with **Contributor** role
- **Microsoft Entra ID** with **Application Administrator** role (for App Registrations)
- **GitHub repository** admin access (for configuring secrets and environments)

### Install Azure CLI (if needed)

```bash
# macOS
brew install azure-cli

# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Windows
winget install Microsoft.AzureCLI
```

### Authenticate to Azure

```bash
az login
az account set --subscription "<your-subscription-id>"
```

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Azure Cloud                        │
│                                                      │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │ Azure Front   │────▶│ Azure Container Apps      │  │
│  │ Door (CDN)    │     │ ┌──────────────────────┐ │  │
│  │ (optional)    │     │ │ the-audit-brief      │ │  │
│  └──────────────┘     │ │ (Next.js 16, Node 20)│ │  │
│                        │ │ Port 3000            │ │  │
│                        │ └──────┬───┬───┬───────┘ │  │
│                        └────────┼───┼───┼─────────┘  │
│                                 │   │   │            │
│           ┌─────────────────────┘   │   └──────┐     │
│           ▼                         ▼          ▼     │
│  ┌────────────────┐  ┌──────────────┐ ┌────────────┐│
│  │ PostgreSQL 16   │  │ Azure Blob   │ │ Azure      ││
│  │ Flexible Server │  │ Storage      │ │ OpenAI     ││
│  │ + pgvector      │  │ (audio/PDF)  │ │ (embeddings││
│  └────────────────┘  └──────────────┘ └────────────┘│
│                                                      │
│  ┌────────────────┐  ┌──────────────┐               │
│  │ Azure Key Vault│  │ Azure ACR    │               │
│  │ (secrets)      │  │ (Docker imgs)│               │
│  └────────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────┘
```

### Azure resources required

| Resource                   | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| Resource Group             | Logical container for all resources                 |
| Container Registry (ACR)   | Stores Docker images                                |
| Container Apps Environment | Hosts the Container App                             |
| Container App              | Runs the application                                |
| PostgreSQL Flexible Server | Primary database (with pgvector)                    |
| Storage Account            | Blob storage for files                              |
| Key Vault                  | Secret management                                   |
| Managed Identity           | Passwordless auth between Azure resources           |
| Azure OpenAI               | Text embeddings for search (provisioned separately) |

---

## 4. Azure Resource Provisioning

### 4.1 Set shell variables

```bash
# Customize these for your environment
export ENVIRONMENT="production"        # or "staging"
export LOCATION="eastus2"              # Azure region
export RG_NAME="rg-the-audit-brief-${ENVIRONMENT}"
```

### 4.2 Register required resource providers

```bash
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.ManagedIdentity
```

### 4.3 Create Resource Group

```bash
az group create --name "$RG_NAME" --location "$LOCATION"
```

### 4.4 Deploy infrastructure with Bicep

**Option A: Using the bootstrap script (recommended)**

```bash
chmod +x scripts/bootstrap-azure.sh

# Dry run first to preview changes
./scripts/bootstrap-azure.sh --env "$ENVIRONMENT" --location "$LOCATION" --dry-run

# Deploy
./scripts/bootstrap-azure.sh --env "$ENVIRONMENT" --location "$LOCATION"
```

**Option B: Manual Bicep deployment**

```bash
az deployment group create \
  --resource-group "$RG_NAME" \
  --template-file infra/main.bicep \
  --parameters infra/parameters/${ENVIRONMENT}.bicepparam \
  --parameters location="$LOCATION"
```

### 4.5 Record the outputs

After deployment, record these values — you will need them later:

```bash
# Get deployment outputs
az deployment group show \
  --resource-group "$RG_NAME" \
  --name main \
  --query "properties.outputs" \
  --output table
```

Key outputs to save:

| Output               | Use                       |
| -------------------- | ------------------------- |
| `acrLoginServer`     | Docker image registry URL |
| `containerAppFqdn`   | Application URL           |
| `postgresqlFqdn`     | Database server hostname  |
| `storageAccountName` | Blob storage account name |

---

## 5. Microsoft Entra ID Configuration

Two App Registrations are needed: one for SSO (user login) and one for CI/CD (GitHub Actions).

### 5.1 App Registration for SSO

1. Navigate to **Azure Portal** → **Microsoft Entra ID** → **App registrations** → **New registration**

2. Configure:
   - **Name:** `The Audit Brief - ${ENVIRONMENT}`
   - **Supported account types:** "Accounts in this organizational directory only" (Single tenant)
   - **Redirect URI:** Web → `https://<containerAppFqdn>/api/auth/sso/callback`

3. Click **Register**

4. Record these values:
   - **Application (client) ID** → This is your `ENTRA_CLIENT_ID`
   - **Directory (tenant) ID** → This is your `ENTRA_TENANT_ID`

5. Go to **Certificates & secrets** → **New client secret**
   - Description: `${ENVIRONMENT} App Secret`
   - Expires: 24 months
   - **Record the secret value** → This is your `ENTRA_CLIENT_SECRET`

6. Go to **Token configuration** → **Add optional claim** → Select **ID** token type
   - Add: `email`, `preferred_username`, `upn`

7. Go to **API permissions**
   - Verify `Microsoft Graph > User.Read` (delegated) is present
   - Click **Grant admin consent** if required by your org

8. **For local development**, add a second redirect URI:
   - Go to **Authentication** → **Add URI**
   - Add: `http://localhost:3000/api/auth/sso/callback`

### 5.2 App Registration for CI/CD (OIDC Federation)

This enables GitHub Actions to authenticate to Azure without storing secrets.

1. Create a **new App Registration:**
   - Name: `The Audit Brief - GitHub Actions`
   - Supported account types: Single tenant
   - No redirect URI needed

2. Record the **Application (client) ID** → This is your `AZURE_CLIENT_ID`

3. Go to **Certificates & secrets** → **Federated credentials** → **Add credential**
   - Scenario: **GitHub Actions deploying Azure resources**
   - Organization: `<your-github-org>`
   - Repository: `<your-repo-name>`
   - Entity type: **Branch**
   - Branch: `main`
   - Name: `github-actions-main`

4. Create a Service Principal and assign roles:

```bash
# Get the App Registration's object ID
APP_ID="<Application (client) ID from step 2>"

# Create a service principal
az ad sp create --id "$APP_ID"

# Assign Contributor role on the resource group
az role assignment create \
  --assignee "$APP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/${RG_NAME}"
```

---

## 6. Key Vault Secret Population

Populate the Key Vault with all application secrets. The Key Vault name follows the pattern `kv-tab-<environment>` (set during Bicep deployment).

```bash
KV_NAME="<key-vault-name-from-bicep-output>"

# Database connection string
# Format: postgresql://<admin-user>:<password>@<postgresql-fqdn>:5432/<database>?sslmode=require
az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "DATABASE-URL" \
  --value "postgresql://auditbrief_admin:<password>@<postgresql-fqdn>:5432/auditbrief?sslmode=require"

# JWT secrets (generate strong random values)
az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "JWT-ACCESS-SECRET" \
  --value "$(openssl rand -base64 48)"

az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "JWT-REFRESH-SECRET" \
  --value "$(openssl rand -base64 48)"

# Azure Blob Storage connection string
STORAGE_CONN=$(az storage account show-connection-string \
  --name "<storage-account-name>" \
  --resource-group "$RG_NAME" \
  --query connectionString \
  --output tsv)

az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "AZURE-BLOB-CONNECTION-STRING" \
  --value "$STORAGE_CONN"

# Azure OpenAI (obtain from your Azure OpenAI resource)
az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "AZURE-OPENAI-ENDPOINT" \
  --value "https://<your-openai-resource>.openai.azure.com/"

az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "AZURE-OPENAI-API-KEY" \
  --value "<your-openai-api-key>"

# Entra ID SSO client secret
az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "ENTRA-CLIENT-SECRET" \
  --value "<client-secret-from-section-5.1>"

# Sentry (optional — leave empty if not using Sentry)
az keyvault secret set \
  --vault-name "$KV_NAME" \
  --name "SENTRY-DSN" \
  --value ""
```

---

## 7. Database Setup

### 7.1 Verify pgvector extension is allowlisted

The Bicep template sets `azure.extensions` to `VECTOR,UUID-OSSP`. Verify:

```bash
az postgres flexible-server parameter show \
  --resource-group "$RG_NAME" \
  --server-name "<postgresql-server-name>" \
  --name azure.extensions \
  --query value \
  --output tsv
```

Expected output: `VECTOR,UUID-OSSP`

If not set, apply it manually:

```bash
az postgres flexible-server parameter set \
  --resource-group "$RG_NAME" \
  --server-name "<postgresql-server-name>" \
  --name azure.extensions \
  --value "VECTOR,UUID-OSSP"
```

### 7.2 Create the database

```bash
az postgres flexible-server db create \
  --resource-group "$RG_NAME" \
  --server-name "<postgresql-server-name>" \
  --database-name "auditbrief"
```

### 7.3 Run migrations

**Option A: Using the migration script**

```bash
chmod +x scripts/migrate-production.sh
./scripts/migrate-production.sh --env "$ENVIRONMENT"
```

**Option B: Manual**

```bash
export DATABASE_URL="postgresql://<user>:<password>@<host>:5432/auditbrief?sslmode=require"
npx prisma generate
npx prisma migrate deploy
```

### 7.4 Verify migration status

```bash
./scripts/migrate-production.sh --env "$ENVIRONMENT" --status
# Or manually:
npx prisma migrate status
```

---

## 8. GitHub Repository Configuration

### 8.1 Create GitHub environment

1. Go to **GitHub** → **Repository** → **Settings** → **Environments**
2. Create environment: `production`
3. Add **required reviewers** (recommended for production deployments)
4. Optionally restrict to the `main` branch

### 8.2 Configure repository secrets

Navigate to **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**.

Add these secrets under the `production` environment:

| Secret Name             | Value                                        | Source                                                |
| ----------------------- | -------------------------------------------- | ----------------------------------------------------- |
| `AZURE_CLIENT_ID`       | Application (client) ID                      | Section 5.2, step 2                                   |
| `AZURE_TENANT_ID`       | Directory (tenant) ID                        | Azure Portal → Entra ID → Overview                    |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID                              | `az account show --query id -o tsv`                   |
| `REGISTRY_NAME`         | ACR name (e.g., `acrtab1234`)                | Bicep output `acrLoginServer` (without `.azurecr.io`) |
| `REGISTRY_URL`          | Full ACR URL (e.g., `acrtab1234.azurecr.io`) | Bicep output `acrLoginServer`                         |
| `AZURE_RG`              | Resource group name                          | `rg-the-audit-brief-production`                       |
| `DATABASE_URL`          | PostgreSQL connection string                 | Same value as Key Vault `DATABASE-URL` secret         |

### 8.3 Verify CI workflow

Create a test pull request and confirm the CI workflow (`ci.yml`) passes all checks:

- Prettier format check
- ESLint linting
- TypeScript type checking
- Prisma client generation
- Unit and integration tests
- Next.js build

---

## 9. First Deployment

### 9.1 Build and push Docker image

```bash
# Login to ACR
az acr login --name "<acr-name>"

# Build the image
docker build -t "<acr-name>.azurecr.io/the-audit-brief:initial" .

# Push
docker push "<acr-name>.azurecr.io/the-audit-brief:initial"
```

### 9.2 Deploy to Container Apps

If the Container App was created by Bicep with a placeholder image, update it:

```bash
az containerapp update \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --image "<acr-name>.azurecr.io/the-audit-brief:initial"
```

### 9.3 Configure health probes

If not already configured by Bicep:

```bash
az containerapp update \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --set-env-vars \
    NODE_ENV=production \
    NEXT_PUBLIC_APP_URL="https://<containerAppFqdn>" \
    AZURE_BLOB_CONTAINER=the-audit-brief-uploads \
    LOG_LEVEL=info \
    ENTRA_CLIENT_ID="<from-section-5.1>" \
    ENTRA_TENANT_ID="<from-section-5.1>" \
    ENTRA_REDIRECT_URI="https://<containerAppFqdn>/api/auth/sso/callback"
```

### 9.4 Verify deployment

```bash
APP_URL="https://<containerAppFqdn>"

# Liveness check
curl -s "$APP_URL/api/health" | jq .
# Expected: {"status":"ok","timestamp":"...","version":"2.0.0"}

# Readiness check
curl -s "$APP_URL/api/ready" | jq .
# Expected: {"status":"ready","checks":{"database":"ok"},"timestamp":"..."}
```

### 9.5 Test SSO flow

1. Open `https://<containerAppFqdn>/login` in a browser
2. Verify the "Sign in with Microsoft" button is visible
3. Click the button — you should be redirected to Microsoft login
4. Authenticate with an Entra ID account
5. Verify redirect back to the app with successful login

---

## 10. CI/CD Pipeline

### 10.1 CI Workflow (Pull Requests)

**File:** `.github/workflows/ci.yml`

Triggered on every PR to `main`. Runs:

1. Prettier format check
2. ESLint linting
3. TypeScript type checking (`tsc --noEmit`)
4. Prisma client generation
5. Database migrations (against test PostgreSQL)
6. Unit + integration tests (Vitest) with coverage
7. Next.js production build

### 10.2 CD Workflow (Push to Main)

**File:** `.github/workflows/cd.yml`

Triggered on every push to `main`. Steps:

1. Azure OIDC login (keyless authentication)
2. ACR login
3. Build and push Docker image (tagged with commit SHA + `latest`)
4. Run `prisma migrate deploy` against production DB
5. Deploy new Container App revision

### 10.3 Trigger a manual deployment

Push any change to `main`, or re-run the CD workflow from the GitHub Actions UI.

### 10.4 Monitor deployment progress

```bash
# View Container App revisions
az containerapp revision list \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --output table

# View logs
az containerapp logs show \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --follow
```

---

## 11. Ongoing Operations

### 11.1 Monitoring and logs

**Application logs** are sent to stdout (structured JSON via Pino) and collected by Log Analytics.

```bash
# View recent logs
az containerapp logs show \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --tail 100

# Query Log Analytics (KQL)
az monitor log-analytics query \
  --workspace "<log-analytics-workspace-id>" \
  --analytics-query "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(1h) | order by TimeGenerated desc | take 50"
```

**Health endpoints:**

- `GET /api/health` — Liveness probe (is the process running?)
- `GET /api/ready` — Readiness probe (can it serve traffic? Is DB reachable?)

### 11.2 Scaling

```bash
# Scale replicas
az containerapp update \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --min-replicas 2 \
  --max-replicas 10

# Scale resources (CPU/memory)
az containerapp update \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --cpu 1.0 \
  --memory 2Gi
```

### 11.3 Secret rotation

When rotating secrets (JWT, Entra client secret, etc.):

1. Update the secret in Key Vault:

   ```bash
   az keyvault secret set --vault-name "$KV_NAME" --name "<secret-name>" --value "<new-value>"
   ```

2. Create a new Container App revision to pick up the updated secret:
   ```bash
   az containerapp revision copy \
     --name the-audit-brief \
     --resource-group "$RG_NAME"
   ```

### 11.4 Database backups

Azure PostgreSQL Flexible Server includes **automatic backups**:

- Retention: 7 days (staging) / 35 days (production)
- Point-in-time recovery (PITR) available

To restore to a point in time:

```bash
az postgres flexible-server restore \
  --resource-group "$RG_NAME" \
  --name "<new-server-name>" \
  --source-server "<original-server-name>" \
  --restore-time "2026-03-23T10:00:00Z"
```

### 11.5 SSL/TLS certificates

Azure Container Apps provides **automatic TLS** for the default `*.azurecontainerapps.io` domain. For custom domains, configure via:

```bash
az containerapp hostname add \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --hostname "app.theauditbrief.com"

az containerapp hostname bind \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --hostname "app.theauditbrief.com" \
  --environment "$CONTAINER_ENV_NAME" \
  --validation-method CNAME
```

### 11.6 Updating the application

Just push to `main`. The CD pipeline handles everything:

1. Builds a new Docker image
2. Pushes to ACR
3. Runs database migrations
4. Deploys a new Container App revision

---

## 12. Rollback Procedure

### 12.1 Application rollback

```bash
# List all revisions
az containerapp revision list \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --output table

# Activate the previous revision
az containerapp revision activate \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --revision "<previous-revision-name>"

# Route 100% traffic to the previous revision
az containerapp ingress traffic set \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --revision-weight "<previous-revision-name>=100"

# Deactivate the broken revision
az containerapp revision deactivate \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --revision "<broken-revision-name>"
```

### 12.2 Database rollback

Prisma does not have a built-in rollback command for production. Options:

**Option A: Mark migration as rolled back and revert manually**

```bash
npx prisma migrate resolve --rolled-back "<migration-name>"
# Then run the reverse SQL manually against the database
```

**Option B: Point-in-time restore (nuclear option)**

```bash
az postgres flexible-server restore \
  --resource-group "$RG_NAME" \
  --name "<server-name>-restored" \
  --source-server "<server-name>" \
  --restore-time "<timestamp-before-migration>"
```

> **Best practice:** Always take a database snapshot before running migrations in production. Verify migrations in staging first.

---

## 13. Troubleshooting

### Common issues

| Issue                                             | Cause                                                                                | Fix                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **"AADSTS50011: Reply URL does not match"**       | Redirect URI in Entra ID App Registration doesn't match `ENTRA_REDIRECT_URI` env var | Ensure exact match in Azure Portal → App Registration → Authentication. Watch for trailing slashes.                                   |
| **Container can't reach PostgreSQL**              | Firewall rules not configured                                                        | Run: `az postgres flexible-server firewall-rule create --name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0` |
| **`CREATE EXTENSION "vector"` fails**             | pgvector not allowlisted                                                             | Run: `az postgres flexible-server parameter set --name azure.extensions --value "VECTOR,UUID-OSSP"`                                   |
| **SSO login loops back to login page**            | `sso_state` cookie not persisted (HTTPS required in prod)                            | Ensure the app is accessed via HTTPS. Check `NODE_ENV=production`.                                                                    |
| **"Invalid or expired token" after SSO**          | Clock skew between Entra ID and app                                                  | The app uses `clockTolerance: 60` (60 seconds). If still failing, check container system time.                                        |
| **Container starts but `/api/ready` returns 503** | Database connection failed                                                           | Verify `DATABASE_URL` includes `?sslmode=require`. Check Key Vault secret value.                                                      |
| **Docker push fails to ACR**                      | Not authenticated to ACR                                                             | Run: `az acr login --name <acr-name>`                                                                                                 |
| **CD pipeline fails at Azure Login**              | OIDC federated credential misconfigured                                              | Verify the federated credential in Entra ID matches the GitHub repo, org, and branch exactly.                                         |
| **"This account uses Microsoft SSO"**             | User with SSO-only account trying email/password login                               | Expected behavior. User should click "Sign in with Microsoft" instead.                                                                |
| **Prisma migrate deploy fails**                   | Database drift or conflicting migration                                              | Run `npx prisma migrate status` to diagnose. Check if someone applied manual SQL changes.                                             |

### Viewing Container App logs

```bash
# Real-time log stream
az containerapp logs show \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --follow

# Filter by log level (structured JSON logs)
az containerapp logs show \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --tail 200 | grep '"level":50'  # ERROR level
```

### Checking Container App status

```bash
# Overview
az containerapp show \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --output table

# Active revisions
az containerapp revision list \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --output table

# Environment variables (verify config)
az containerapp show \
  --name the-audit-brief \
  --resource-group "$RG_NAME" \
  --query "properties.template.containers[0].env" \
  --output table
```

---

## Environment Variables Reference

| Variable                            | Source    | Required | Description                                                         |
| ----------------------------------- | --------- | -------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                      | Key Vault | Yes      | PostgreSQL connection string (`?sslmode=require` for Azure)         |
| `JWT_ACCESS_SECRET`                 | Key Vault | Yes      | HMAC secret for access tokens (min 32 chars)                        |
| `JWT_REFRESH_SECRET`                | Key Vault | Yes      | HMAC secret for refresh tokens (min 32 chars)                       |
| `AZURE_BLOB_CONNECTION_STRING`      | Key Vault | Yes      | Azure Blob Storage connection string                                |
| `AZURE_BLOB_CONTAINER`              | Plain env | Yes      | Blob container name (`the-audit-brief-uploads`)                     |
| `AZURE_OPENAI_ENDPOINT`             | Key Vault | Yes      | Azure OpenAI API endpoint URL                                       |
| `AZURE_OPENAI_API_KEY`              | Key Vault | Yes      | Azure OpenAI API key                                                |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Plain env | No       | Embedding model deployment name (default: `text-embedding-3-large`) |
| `ENTRA_CLIENT_ID`                   | Plain env | Yes      | Entra ID App Registration client ID                                 |
| `ENTRA_CLIENT_SECRET`               | Key Vault | Yes      | Entra ID client secret                                              |
| `ENTRA_TENANT_ID`                   | Plain env | Yes      | Entra ID directory (tenant) ID                                      |
| `ENTRA_REDIRECT_URI`                | Plain env | Yes      | OAuth callback URL (`https://<domain>/api/auth/sso/callback`)       |
| `NODE_ENV`                          | Plain env | Yes      | Must be `production`                                                |
| `NEXT_PUBLIC_APP_URL`               | Plain env | Yes      | Public app URL (e.g., `https://app.theauditbrief.com`)              |
| `LOG_LEVEL`                         | Plain env | No       | Pino log level (default: `info`)                                    |
| `SENTRY_DSN`                        | Key Vault | No       | Sentry error tracking DSN                                           |
