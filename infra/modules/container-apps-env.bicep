/**
 * Module: Container Apps Environment with Log Analytics
 *
 * Purpose:
 *   Provisions an Azure Container Apps Environment backed by a Log Analytics
 *   Workspace. The environment provides the shared network, logging, and
 *   scaling infrastructure for all Container Apps running The Audit Brief.
 *
 * Key responsibilities:
 *   - Create a Log Analytics Workspace for centralized log collection.
 *   - Create a Container Apps Environment linked to the workspace.
 *   - Expose the environment ID and default domain for Container App
 *     configuration and DNS resolution.
 *
 * Dependencies:
 *   - None. This is consumed by the container-app module.
 */

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Name of the Container Apps Environment.')
param envName string

@description('Azure region where the environment will be created.')
param location string

@description('Name of the Log Analytics Workspace to create.')
param logAnalyticsName string

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The resource ID of the Container Apps Environment.')
output id string = containerAppsEnvironment.id

@description('The default domain of the Container Apps Environment (used for ingress URLs).')
output defaultDomain string = containerAppsEnvironment.properties.defaultDomain
