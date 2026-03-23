/**
 * Production Environment Parameters — The Audit Brief
 *
 * Purpose:
 *   Provides non-secret parameter values for the production environment deployment.
 *   Secret values (passwords, API keys, tokens) must be supplied at deployment
 *   time via CLI arguments or a secure pipeline variable group.
 *
 * Usage:
 *   az deployment group create \
 *     --resource-group rg-audit-brief-production \
 *     --template-file infra/main.bicep \
 *     --parameters infra/parameters/production.bicepparam \
 *     --parameters adminPassword='<from-keyvault>' \
 *                  jwtAccessSecret='<from-keyvault>' \
 *                  jwtRefreshSecret='<from-keyvault>' \
 *                  azureOpenaiEndpoint='<from-keyvault>' \
 *                  azureOpenaiApiKey='<from-keyvault>' \
 *                  entraClientSecret='<from-keyvault>' \
 *                  sentryDsn='<from-keyvault>'
 */

using '../main.bicep'

param environmentName = 'production'
param location = 'eastus2'
param appUrl = 'https://theauditbrief.com'
param entraClientId = '<REPLACE_WITH_PRODUCTION_ENTRA_CLIENT_ID>'
param entraTenantId = '<REPLACE_WITH_ENTRA_TENANT_ID>'
param entraRedirectUri = 'https://theauditbrief.com/api/auth/callback'
param postgresAdminLogin = 'auditbrief_admin'
param postgresDatabaseName = 'audit_brief'
