/**
 * Module: Azure Storage Account with Blob Container
 *
 * Purpose:
 *   Provisions an Azure Storage Account and a blob container for storing
 *   uploaded audio files, transcripts, PDFs, and HLS segments for The Audit
 *   Brief application. Grants the managed identity the Storage Blob Data
 *   Contributor role for programmatic access without connection string secrets
 *   in some scenarios, while also exposing the connection string for the
 *   application's Azure Blob SDK configuration.
 *
 * Key responsibilities:
 *   - Create a Storage Account with appropriate redundancy per environment.
 *   - Create a blob container for application uploads.
 *   - Assign Storage Blob Data Contributor role to the managed identity.
 *   - Expose the connection string and blob endpoint for downstream use.
 *
 * Dependencies:
 *   - managed-identity.bicep (provides the principalId for role assignment).
 */

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Name of the Storage Account. Must be globally unique, lowercase alphanumeric, 3-24 chars.')
param name string

@description('Azure region where the storage account will be created.')
param location string

@description('Storage SKU name. Use Standard_LRS for staging, Standard_GRS for production.')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_ZRS'
  'Standard_RAGRS'
])
param skuName string

@description('Name of the blob container to create for application uploads.')
param containerName string

@description('Principal ID of the managed identity to grant Storage Blob Data Contributor access.')
param principalId string

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: name
  location: location
  kind: 'StorageV2'
  sku: {
    name: skuName
  }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: containerName
  properties: {
    publicAccess: 'None'
  }
}

/**
 * Storage Blob Data Contributor role assignment.
 *
 * The built-in role (ba92f5b4-2d11-453d-a403-e96b0029c9fe) grants
 * read, write, and delete access to blob data. This allows the Container App
 * to upload and manage audio files and transcripts via the managed identity.
 */
resource storageBlobContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, principalId, 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The full connection string for the storage account (used by Azure Blob SDK).')
output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

@description('The primary blob service endpoint URL.')
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob

@description('The name of the storage account resource.')
output name string = storageAccount.name
