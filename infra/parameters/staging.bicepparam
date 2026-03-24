/**
 * Staging Environment Parameters — The Audit Brief
 *
 * Purpose:
 *   Provides non-secret parameter values for the staging environment deployment.
 *   Secret values (passwords, API keys, tokens) must be supplied at deployment
 *   time via CLI arguments or a secure pipeline variable group.
 *
 * Usage:
 *   az deployment group create \
 *     --resource-group rg-audit-brief-staging \
 *     --template-file infra/main.bicep \
 *     --parameters infra/parameters/staging.bicepparam \
 *     --parameters adminPassword='<from-keyvault>' \
 *                  jwtAccessSecret='<from-keyvault>' \
 *                  jwtRefreshSecret='<from-keyvault>' \
 *                  azureOpenaiEndpoint='<from-keyvault>' \
 *                  azureOpenaiApiKey='<from-keyvault>' \
 *                  entraClientSecret='<from-keyvault>' \
 *                  sentryDsn='<from-keyvault>'
 */

using '../main.bicep'

param environmentName = 'staging'
param location = 'eastus2'
param appUrl = 'https://staging.theauditbrief.com/auditbrief'
param entraClientId = '<REPLACE_WITH_STAGING_ENTRA_CLIENT_ID>'
param entraTenantId = '<REPLACE_WITH_ENTRA_TENANT_ID>'
param entraRedirectUri = 'https://staging.theauditbrief.com/auditbrief/api/auth/callback'
param postgresAdminLogin = 'auditbrief_admin'
param postgresDatabaseName = 'audit_brief'
