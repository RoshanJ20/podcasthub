/**
 * Main Bicep Orchestration Template — The Audit Brief
 *
 * Purpose:
 *   Top-level deployment template that orchestrates all infrastructure modules
 *   for The Audit Brief application on Azure. Supports both staging and
 *   production environments via parameterized configuration with environment-
 *   specific defaults resolved through ternary expressions.
 *
 * Key responsibilities:
 *   - Wire together all infrastructure modules in the correct dependency order.
 *   - Derive environment-specific resource names and SKUs from a single
 *     environmentName parameter.
 *   - Compose the PostgreSQL DATABASE_URL from server outputs and credentials.
 *   - Pass secrets securely between modules (never exposed as outputs).
 *   - Expose operational outputs (FQDNs, account names) for CI/CD pipelines.
 *
 * Deployment order (handled implicitly by Bicep dependency graph):
 *   1. Managed Identity (no dependencies)
 *   2. Container Registry, PostgreSQL, Storage Account (depend on identity)
 *   3. Key Vault (depends on PostgreSQL + Storage outputs for secret values)
 *   4. Container Apps Environment (no secret dependencies)
 *   5. Container App (depends on everything above)
 *
 * Usage:
 *   az deployment group create \
 *     --resource-group rg-audit-brief-staging \
 *     --template-file infra/main.bicep \
 *     --parameters infra/parameters/staging.bicepparam \
 *     --parameters adminPassword='<value>' jwtAccessSecret='<value>' ...
 */

targetScope = 'resourceGroup'

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Deployment environment. Controls resource SKUs, replica counts, and naming.')
@allowed([
  'staging'
  'production'
])
param environmentName string

@description('Azure region for all resources.')
param location string

@secure()
@description('Administrator password for the PostgreSQL server.')
param adminPassword string

@secure()
@description('Secret key used to sign JWT access tokens.')
param jwtAccessSecret string

@secure()
@description('Secret key used to sign JWT refresh tokens.')
param jwtRefreshSecret string

@secure()
@description('Azure OpenAI service endpoint URL.')
param azureOpenaiEndpoint string

@secure()
@description('Azure OpenAI API key.')
param azureOpenaiApiKey string

@secure()
@description('Microsoft Entra ID client secret for OAuth authentication.')
param entraClientSecret string

@secure()
@description('Sentry DSN for error tracking.')
param sentryDsn string

@description('Public application URL (e.g., https://staging.theauditbrief.com).')
param appUrl string

@description('Microsoft Entra ID application (client) ID.')
param entraClientId string

@description('Microsoft Entra ID tenant ID.')
param entraTenantId string

@description('Microsoft Entra ID OAuth redirect URI.')
param entraRedirectUri string

@description('PostgreSQL administrator login username.')
param postgresAdminLogin string = 'auditbrief_admin'

@description('Name of the application database in PostgreSQL.')
param postgresDatabaseName string = 'audit_brief'

@description('Container image to deploy (e.g., myacr.azurecr.io/audit-brief:v1.0.0).')
param containerImage string = ''

// ---------------------------------------------------------------------------
// Environment-Specific Configuration
// ---------------------------------------------------------------------------

/**
 * Resource naming convention: {resource-prefix}-{app-name}-{environment}
 * This ensures unique names per environment and clear identification in
 * the Azure portal.
 */
var envSuffix = environmentName == 'staging' ? 'stg' : 'prd'
var appName = 'auditbrief'

// Resource names
var managedIdentityName = 'id-${appName}-${envSuffix}'
var containerRegistryName = 'acr${appName}${envSuffix}'
var postgresServerName = 'psql-${appName}-${envSuffix}'
var storageAccountName = 'st${appName}${envSuffix}'
var keyVaultName = 'kv-${appName}-${envSuffix}'
var containerAppsEnvName = 'cae-${appName}-${envSuffix}'
var logAnalyticsName = 'log-${appName}-${envSuffix}'
var containerAppName = 'ca-${appName}-${envSuffix}'
var blobContainerName = 'the-audit-brief-uploads'

// SKU and sizing (staging uses minimal resources, production uses production-grade)
var acrSku = environmentName == 'staging' ? 'Basic' : 'Standard'
var postgresSkuName = environmentName == 'staging' ? 'Standard_B1ms' : 'Standard_D2s_v3'
var postgresSkuTier = environmentName == 'staging' ? 'Burstable' : 'GeneralPurpose'
var postgresStorageSizeGB = environmentName == 'staging' ? 32 : 128
var postgresHaMode = environmentName == 'staging' ? 'Disabled' : 'ZoneRedundant'
var postgresBackupRetentionDays = environmentName == 'staging' ? 7 : 35
var storageSkuName = environmentName == 'staging' ? 'Standard_LRS' : 'Standard_GRS'
var containerMinReplicas = environmentName == 'staging' ? 1 : 2
var containerMaxReplicas = environmentName == 'staging' ? 3 : 10
var containerCpu = environmentName == 'staging' ? '0.5' : '1.0'
var containerMemory = environmentName == 'staging' ? '1Gi' : '2Gi'

// ---------------------------------------------------------------------------
// Module Deployments
// ---------------------------------------------------------------------------

/**
 * 1. Managed Identity — foundational resource used by all other modules
 *    for RBAC role assignments and workload identity.
 */
module managedIdentity 'modules/managed-identity.bicep' = {
  name: 'deploy-managed-identity'
  params: {
    name: managedIdentityName
    location: location
  }
}

/**
 * 2. Container Registry — stores Docker images; grants AcrPull to the
 *    managed identity so Container Apps can pull images.
 */
module containerRegistry 'modules/container-registry.bicep' = {
  name: 'deploy-container-registry'
  params: {
    name: containerRegistryName
    location: location
    sku: acrSku
    principalId: managedIdentity.outputs.principalId
  }
}

/**
 * 3. PostgreSQL — database server with pgvector extension enabled.
 *    The DATABASE_URL is composed below and stored in Key Vault.
 */
module postgresql 'modules/postgresql.bicep' = {
  name: 'deploy-postgresql'
  params: {
    serverName: postgresServerName
    location: location
    skuName: postgresSkuName
    skuTier: postgresSkuTier
    storageSizeGB: postgresStorageSizeGB
    adminLogin: postgresAdminLogin
    adminPassword: adminPassword
    databaseName: postgresDatabaseName
    highAvailabilityMode: postgresHaMode
    backupRetentionDays: postgresBackupRetentionDays
  }
}

/**
 * 4. Storage Account — blob storage for audio files, transcripts, and PDFs.
 *    Grants Storage Blob Data Contributor to the managed identity.
 */
module storageAccount 'modules/storage-account.bicep' = {
  name: 'deploy-storage-account'
  params: {
    name: storageAccountName
    location: location
    skuName: storageSkuName
    containerName: blobContainerName
    principalId: managedIdentity.outputs.principalId
  }
}

/**
 * 5. Key Vault — centralized secret store. Receives composed secrets
 *    (DATABASE_URL includes server FQDN from PostgreSQL output) and
 *    grants Key Vault Secrets User to the managed identity.
 */
module keyVault 'modules/key-vault.bicep' = {
  name: 'deploy-key-vault'
  params: {
    name: keyVaultName
    location: location
    tenantId: subscription().tenantId
    principalId: managedIdentity.outputs.principalId
    databaseUrl: 'postgresql://${postgresAdminLogin}:${adminPassword}@${postgresql.outputs.fullyQualifiedDomainName}:5432/${postgresql.outputs.databaseName}?sslmode=require'
    jwtAccessSecret: jwtAccessSecret
    jwtRefreshSecret: jwtRefreshSecret
    azureBlobConnectionString: storageAccount.outputs.connectionString
    azureOpenaiEndpoint: azureOpenaiEndpoint
    azureOpenaiApiKey: azureOpenaiApiKey
    entraClientSecret: entraClientSecret
    sentryDsn: sentryDsn
  }
}

/**
 * 6. Container Apps Environment — shared hosting environment with
 *    integrated Log Analytics for centralized logging.
 */
module containerAppsEnv 'modules/container-apps-env.bicep' = {
  name: 'deploy-container-apps-env'
  params: {
    envName: containerAppsEnvName
    location: location
    logAnalyticsName: logAnalyticsName
  }
}

/**
 * 7. Container App — the Next.js application container with health probes,
 *    auto-scaling, and Key Vault secret references.
 *
 * If no container image is provided, a placeholder is used. This allows
 * the infrastructure to be provisioned before the first image is pushed.
 */
module containerApp 'modules/container-app.bicep' = {
  name: 'deploy-container-app'
  params: {
    name: containerAppName
    location: location
    environmentId: containerAppsEnv.outputs.id
    containerImage: !empty(containerImage) ? containerImage : '${containerRegistry.outputs.loginServer}/${appName}:latest'
    registryLoginServer: containerRegistry.outputs.loginServer
    identityId: managedIdentity.outputs.id
    keyVaultName: keyVault.outputs.name
    minReplicas: containerMinReplicas
    maxReplicas: containerMaxReplicas
    cpu: containerCpu
    memory: containerMemory
    appUrl: appUrl
    entraClientId: entraClientId
    entraTenantId: entraTenantId
    entraRedirectUri: entraRedirectUri
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The FQDN of the deployed Container App (use for DNS CNAME or direct access).')
output containerAppFqdn string = containerApp.outputs.fqdn

@description('The ACR login server URL (use in CI/CD for docker push).')
output acrLoginServer string = containerRegistry.outputs.loginServer

@description('The PostgreSQL server FQDN (use for database tooling and migrations).')
output postgresqlFqdn string = postgresql.outputs.fullyQualifiedDomainName

@description('The Storage Account name (use for Azure CLI or portal access).')
output storageAccountName string = storageAccount.outputs.name
