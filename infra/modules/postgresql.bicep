/**
 * Module: Azure Database for PostgreSQL Flexible Server
 *
 * Purpose:
 *   Provisions a PostgreSQL 16 Flexible Server instance with the pgvector
 *   extension enabled for semantic vector search. Configures SSL enforcement,
 *   firewall rules, backup retention, and optional high availability.
 *
 * Key responsibilities:
 *   - Create a PostgreSQL Flexible Server with version 16.
 *   - Enable the VECTOR and UUID-OSSP extensions via the azure.extensions
 *     server parameter (required for pgvector similarity search).
 *   - Enforce SSL connections for all clients.
 *   - Allow Azure services to connect via a firewall rule.
 *   - Create the application database.
 *   - Configure HA and backup retention per environment.
 *
 * Dependencies:
 *   - None directly. The DATABASE_URL secret is composed in main.bicep and
 *     stored in Key Vault by the key-vault module.
 */

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Name of the PostgreSQL Flexible Server. Must be globally unique.')
param serverName string

@description('Azure region where the server will be created.')
param location string

@description('The compute SKU name (e.g., Standard_B1ms for staging, Standard_D2s_v3 for production).')
param skuName string

@description('The compute SKU tier (Burstable, GeneralPurpose, or MemoryOptimized).')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param skuTier string

@description('Storage size in GB for the server.')
param storageSizeGB int

@description('Administrator login username for the PostgreSQL server.')
param adminLogin string

@secure()
@description('Administrator login password for the PostgreSQL server.')
param adminPassword string

@description('Name of the application database to create on the server.')
param databaseName string

@description('High availability mode: Disabled for staging, ZoneRedundant for production.')
@allowed([
  'Disabled'
  'ZoneRedundant'
])
param highAvailabilityMode string

@description('Number of days to retain backups (7 for staging, 35 for production).')
@minValue(7)
@maxValue(35)
param backupRetentionDays int

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: '16'
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: highAvailabilityMode
    }
    network: {
      // Public access is controlled by firewall rules below
    }
  }
}

/**
 * Enable pgvector and UUID-OSSP extensions.
 *
 * The azure.extensions server parameter must be set to allow CREATE EXTENSION
 * for these types within the database. Without this, pgvector installation
 * will fail with a permission error.
 */
resource postgresExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  parent: postgresServer
  name: 'azure.extensions'
  properties: {
    value: 'VECTOR,UUID-OSSP'
    source: 'user-override'
  }
}

/**
 * Enforce SSL connections.
 *
 * Ensures all client connections must use TLS encryption. This prevents
 * credentials and query data from being transmitted in plaintext.
 */
resource sslEnforcement 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  parent: postgresServer
  name: 'require_secure_transport'
  properties: {
    value: 'on'
    source: 'user-override'
  }
}

/**
 * Firewall rule: Allow Azure services.
 *
 * Setting both start and end IP to 0.0.0.0 is the Azure convention for
 * "allow connections from other Azure services". This is required for
 * Container Apps to reach the database without a VNet integration.
 */
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

/**
 * Application database.
 *
 * Creates the dedicated database for The Audit Brief application. The Prisma
 * ORM connects to this database via the DATABASE_URL connection string.
 */
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The fully qualified domain name of the PostgreSQL server.')
output fullyQualifiedDomainName string = postgresServer.properties.fullyQualifiedDomainName

@description('The name of the application database.')
output databaseName string = database.name
