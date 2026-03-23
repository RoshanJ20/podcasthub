/**
 * Module: Azure Container Registry
 *
 * Purpose:
 *   Provisions an Azure Container Registry (ACR) to store and manage Docker
 *   container images for The Audit Brief application. Assigns the AcrPull role
 *   to a managed identity so that Container Apps can pull images without
 *   admin credentials.
 *
 * Key responsibilities:
 *   - Create an ACR instance with admin access disabled (security best practice).
 *   - Assign the AcrPull role to the specified principal for image pull operations.
 *   - Expose the login server URL for container image references.
 *
 * Dependencies:
 *   - managed-identity.bicep (provides the principalId for role assignment).
 */

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Name of the Azure Container Registry. Must be globally unique and alphanumeric.')
param name string

@description('Azure region where the registry will be created.')
param location string

@description('SKU tier for the registry. Use Basic for staging, Standard for production.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param sku string

@description('Principal ID of the managed identity to grant AcrPull access.')
param principalId string

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: name
  location: location
  sku: {
    name: sku
  }
  properties: {
    adminUserEnabled: false
  }
}

/**
 * AcrPull role assignment.
 *
 * The built-in AcrPull role (7f951dda-4ed3-4680-a7ca-43fe172d538d) grants
 * read-only access to pull container images. This is the minimum privilege
 * needed by Container Apps to deploy images from this registry.
 */
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, principalId, '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The login server URL of the container registry (e.g., myacr.azurecr.io).')
output loginServer string = containerRegistry.properties.loginServer

@description('The name of the container registry resource.')
output name string = containerRegistry.name
