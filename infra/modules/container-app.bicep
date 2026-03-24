/**
 * Module: Azure Container App
 *
 * Purpose:
 *   Provisions the Container App running The Audit Brief Next.js application.
 *   Configures external ingress on port 3000, health probes for liveness,
 *   readiness, and startup checks, Key Vault secret references via managed
 *   identity, and HTTP-based auto-scaling.
 *
 * Key responsibilities:
 *   - Deploy the application container image from ACR.
 *   - Configure secrets from Key Vault using managed identity references.
 *   - Set up liveness, readiness, and startup health probes.
 *   - Configure HTTP concurrency-based scaling rules.
 *   - Expose plain-text environment variables for non-secret configuration.
 *   - Attach both user-assigned (Key Vault) and system-assigned (ACR) identities.
 *
 * Dependencies:
 *   - container-apps-env.bicep (provides the environment ID).
 *   - container-registry.bicep (provides the registry login server).
 *   - key-vault.bicep (provides the vault name for secret references).
 *   - managed-identity.bicep (provides the identity resource ID).
 */

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

@description('Name of the Container App.')
param name string

@description('Azure region where the Container App will be created.')
param location string

@description('Resource ID of the Container Apps Environment to deploy into.')
param environmentId string

@description('Full container image reference (e.g., myacr.azurecr.io/app:latest).')
param containerImage string

@description('Login server URL of the Azure Container Registry.')
param registryLoginServer string

@description('Resource ID of the User-Assigned Managed Identity for Key Vault access.')
param identityId string

@description('Name of the Key Vault containing application secrets.')
param keyVaultName string

@description('Minimum number of container replicas.')
param minReplicas int

@description('Maximum number of container replicas.')
param maxReplicas int

@description('CPU cores allocated to each container instance (e.g., "0.5" or "1.0").')
param cpu string

@description('Memory allocated to each container instance (e.g., "1Gi" or "2Gi").')
param memory string

@description('Public application URL (e.g., https://staging.theauditbrief.com).')
param appUrl string

@description('Microsoft Entra ID application (client) ID.')
param entraClientId string

@description('Microsoft Entra ID tenant ID.')
param entraTenantId string

@description('Microsoft Entra ID redirect URI for OAuth callback.')
param entraRedirectUri string

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned,UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      /**
       * ACR authentication via managed identity.
       * The system-assigned identity is used for ACR pull operations,
       * while the user-assigned identity handles Key Vault access.
       */
      registries: [
        {
          server: registryLoginServer
          identity: identityId
        }
      ]

      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }

      /**
       * Secrets referenced from Key Vault.
       *
       * Each secret uses the Key Vault reference format, which allows the
       * Container App runtime to resolve secret values at startup using
       * the managed identity. This avoids storing secret values in the
       * Container App configuration.
       */
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/DATABASE-URL'
          identity: identityId
        }
        {
          name: 'jwt-access-secret'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/JWT-ACCESS-SECRET'
          identity: identityId
        }
        {
          name: 'jwt-refresh-secret'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/JWT-REFRESH-SECRET'
          identity: identityId
        }
        {
          name: 'azure-blob-connection-string'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/AZURE-BLOB-CONNECTION-STRING'
          identity: identityId
        }
        {
          name: 'azure-openai-endpoint'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/AZURE-OPENAI-ENDPOINT'
          identity: identityId
        }
        {
          name: 'azure-openai-api-key'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/AZURE-OPENAI-API-KEY'
          identity: identityId
        }
        {
          name: 'entra-client-secret'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/ENTRA-CLIENT-SECRET'
          identity: identityId
        }
        {
          name: 'sentry-dsn'
          keyVaultUrl: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/SENTRY-DSN'
          identity: identityId
        }
      ]
    }

    template: {
      containers: [
        {
          name: 'the-audit-brief'
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }

          /**
           * Environment variables.
           *
           * Secrets are referenced by their Container App secret name (mapped
           * from Key Vault above). Plain-text values are set directly.
           */
          env: [
            // --- Secret references ---
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-access-secret'
            }
            {
              name: 'JWT_REFRESH_SECRET'
              secretRef: 'jwt-refresh-secret'
            }
            {
              name: 'AZURE_BLOB_CONNECTION_STRING'
              secretRef: 'azure-blob-connection-string'
            }
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              secretRef: 'azure-openai-endpoint'
            }
            {
              name: 'AZURE_OPENAI_KEY'
              secretRef: 'azure-openai-api-key'
            }
            {
              name: 'ENTRA_CLIENT_SECRET'
              secretRef: 'entra-client-secret'
            }
            {
              name: 'SENTRY_DSN'
              secretRef: 'sentry-dsn'
            }
            // --- Plain-text configuration ---
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'NEXT_PUBLIC_APP_URL'
              value: appUrl
            }
            {
              name: 'AZURE_BLOB_CONTAINER'
              value: 'the-audit-brief-uploads'
            }
            {
              name: 'AZURE_OPENAI_DEPLOYMENT'
              value: 'text-embedding-3-large'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'ENTRA_CLIENT_ID'
              value: entraClientId
            }
            {
              name: 'ENTRA_TENANT_ID'
              value: entraTenantId
            }
            {
              name: 'ENTRA_REDIRECT_URI'
              value: entraRedirectUri
            }
          ]

          /**
           * Health probes.
           *
           * - Liveness: Detects if the process is stuck or deadlocked. If it
           *   fails, the container is restarted.
           * - Readiness: Detects if the app can serve traffic. If it fails,
           *   the container is removed from the load balancer.
           * - Startup: Gives the app time to initialize (Next.js build cache,
           *   Prisma connection pool, etc.) before liveness kicks in.
           */
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/auditbrief/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/auditbrief/api/ready'
                port: 3000
                scheme: 'HTTP'
              }
              periodSeconds: 10
              failureThreshold: 3
              initialDelaySeconds: 10
            }
            {
              type: 'Startup'
              httpGet: {
                path: '/auditbrief/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              periodSeconds: 5
              failureThreshold: 30
            }
          ]
        }
      ]

      /**
       * Scaling configuration.
       *
       * Uses HTTP concurrency as the scaling trigger. Each replica handles
       * up to 10 concurrent HTTP requests before a new replica is provisioned.
       * This aligns with Next.js server-side rendering workloads that can be
       * CPU-intensive during page generation.
       */
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-concurrency-scaling'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('The fully qualified domain name (FQDN) of the Container App.')
output fqdn string = containerApp.properties.configuration.ingress.fqdn

@description('The name of the Container App resource.')
output name string = containerApp.name
