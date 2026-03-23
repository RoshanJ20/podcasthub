/**
 * Module: User-Assigned Managed Identity
 *
 * Purpose:
 *   Provisions a User-Assigned Managed Identity used by the Container App
 *   to authenticate against Azure services (Key Vault, ACR, Storage) without
 *   storing credentials in code or environment variables.
 *
 * Key responsibilities:
 *   - Create a single User-Assigned Managed Identity resource.
 *   - Expose the principal ID, resource ID, and client ID for downstream
 *     role assignments and container app configuration.
 *
 * Dependencies:
 *   - None. This is a foundational module consumed by other modules.
 */

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Name of the User-Assigned Managed Identity resource.')
param name string

@description('Azure region where the identity will be created.')
param location string

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: name
  location: location
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The Azure AD object (principal) ID of the managed identity, used for role assignments.')
output principalId string = managedIdentity.properties.principalId

@description('The full Azure resource ID of the managed identity.')
output id string = managedIdentity.id

@description('The client (application) ID of the managed identity, used in authentication flows.')
output clientId string = managedIdentity.properties.clientId
