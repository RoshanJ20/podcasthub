/**
 * Module: Azure Key Vault
 *
 * Purpose:
 *   Provisions an Azure Key Vault using the RBAC authorization model to
 *   securely store all application secrets (database credentials, JWT keys,
 *   API keys, etc.). Grants the managed identity the Key Vault Secrets User
 *   role so the Container App can reference secrets at runtime without
 *   embedding them in configuration.
 *
 * Key responsibilities:
 *   - Create a Key Vault with RBAC authorization (no access policies).
 *   - Store all application secrets as Key Vault secrets.
 *   - Assign Key Vault Secrets User role to the managed identity.
 *   - Expose the vault URI and name for Container App secret references.
 *
 * Dependencies:
 *   - managed-identity.bicep (provides the principalId for role assignment).
 *   - postgresql.bicep (DATABASE_URL is composed in main.bicep from its outputs).
 *   - storage-account.bicep (AZURE_BLOB_CONNECTION_STRING comes from its output).
 */

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Name of the Key Vault. Must be globally unique, 3-24 alphanumeric and hyphens.')
param name string

@description('Azure region where the Key Vault will be created.')
param location string

@description('Azure AD tenant ID for the Key Vault.')
param tenantId string

@description('Principal ID of the managed identity to grant Key Vault Secrets User access.')
param principalId string

@secure()
@description('PostgreSQL connection string in Prisma format (postgresql://user:pass@host:5432/db?sslmode=require).')
param databaseUrl string

@secure()
@description('Secret key used to sign JWT access tokens.')
param jwtAccessSecret string

@secure()
@description('Secret key used to sign JWT refresh tokens.')
param jwtRefreshSecret string

@secure()
@description('Azure Blob Storage connection string for file uploads.')
param azureBlobConnectionString string

@secure()
@description('Azure OpenAI service endpoint URL for embedding generation.')
param azureOpenaiEndpoint string

@secure()
@description('Azure OpenAI API key for embedding generation.')
param azureOpenaiApiKey string

@secure()
@description('Microsoft Entra ID (Azure AD) client secret for authentication.')
param entraClientSecret string

@secure()
@description('Sentry DSN for error tracking and performance monitoring.')
param sentryDsn string

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}

/**
 * Key Vault Secrets User role assignment.
 *
 * The built-in role (4633458b-17de-408a-b874-0445c86b69e6) grants
 * read-only access to secret contents. This is the minimum privilege needed
 * by the Container App to retrieve secrets at startup and during runtime.
 */
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, principalId, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

/**
 * Each secret is stored with a descriptive name matching the environment
 * variable it maps to. Hyphens are used in Key Vault names (Key Vault does
 * not allow underscores in secret names).
 */

resource secretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'DATABASE-URL'
  properties: {
    value: databaseUrl
  }
}

resource secretJwtAccessSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'JWT-ACCESS-SECRET'
  properties: {
    value: jwtAccessSecret
  }
}

resource secretJwtRefreshSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'JWT-REFRESH-SECRET'
  properties: {
    value: jwtRefreshSecret
  }
}

resource secretAzureBlobConnectionString 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'AZURE-BLOB-CONNECTION-STRING'
  properties: {
    value: azureBlobConnectionString
  }
}

resource secretAzureOpenaiEndpoint 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'AZURE-OPENAI-ENDPOINT'
  properties: {
    value: azureOpenaiEndpoint
  }
}

resource secretAzureOpenaiApiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'AZURE-OPENAI-API-KEY'
  properties: {
    value: azureOpenaiApiKey
  }
}

resource secretEntraClientSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'ENTRA-CLIENT-SECRET'
  properties: {
    value: entraClientSecret
  }
}

resource secretSentryDsn 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'SENTRY-DSN'
  properties: {
    value: sentryDsn
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The URI of the Key Vault (e.g., https://myvault.vault.azure.net/).')
output vaultUri string = keyVault.properties.vaultUri

@description('The name of the Key Vault resource.')
output name string = keyVault.name
