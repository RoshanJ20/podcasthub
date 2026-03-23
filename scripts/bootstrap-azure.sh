#!/usr/bin/env bash
##
# Bootstrap Azure Infrastructure for The Audit Brief
#
# Provisions all Azure resources from scratch using Bicep templates.
# Run this once per environment (staging/production) during initial setup.
#
# Usage:
#   ./scripts/bootstrap-azure.sh --env staging --location eastus2
#   ./scripts/bootstrap-azure.sh --env production --location eastus2
#   ./scripts/bootstrap-azure.sh --env staging --location eastus2 --dry-run
#
# Prerequisites:
#   - Azure CLI >= 2.57.0 (authenticated: `az login`)
#   - Bicep CLI (bundled with Azure CLI >= 2.20.0)
#   - Access to the target subscription with Contributor role
#
# Dependencies:
#   - infra/main.bicep and infra/parameters/*.bicepparam
##
set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
ENVIRONMENT=""
LOCATION="eastus2"
DRY_RUN=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="${SCRIPT_DIR}/../infra"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
usage() {
  echo "Usage: $0 --env <staging|production> [--location <azure-region>] [--dry-run]"
  echo ""
  echo "Options:"
  echo "  --env        Required. Target environment: staging or production"
  echo "  --location   Azure region (default: eastus2)"
  echo "  --dry-run    Run 'az deployment group what-if' instead of deploying"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --location)
      LOCATION="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

if [[ -z "$ENVIRONMENT" ]]; then
  echo "Error: --env is required"
  usage
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Error: --env must be 'staging' or 'production'"
  exit 1
fi

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
RG_NAME="rg-the-audit-brief-${ENVIRONMENT}"
PARAM_FILE="${INFRA_DIR}/parameters/${ENVIRONMENT}.bicepparam"

if [[ ! -f "$PARAM_FILE" ]]; then
  echo "Error: Parameter file not found: ${PARAM_FILE}"
  exit 1
fi

echo "============================================"
echo "  The Audit Brief — Azure Bootstrap"
echo "============================================"
echo "  Environment:  ${ENVIRONMENT}"
echo "  Location:     ${LOCATION}"
echo "  Resource Group: ${RG_NAME}"
echo "  Parameter File: ${PARAM_FILE}"
echo "  Dry Run:      ${DRY_RUN}"
echo "============================================"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Register required resource providers
# ---------------------------------------------------------------------------
echo ">> Registering Azure resource providers..."
PROVIDERS=(
  "Microsoft.ContainerRegistry"
  "Microsoft.App"
  "Microsoft.DBforPostgreSQL"
  "Microsoft.Storage"
  "Microsoft.KeyVault"
  "Microsoft.OperationalInsights"
  "Microsoft.ManagedIdentity"
)

for provider in "${PROVIDERS[@]}"; do
  echo "   Registering ${provider}..."
  az provider register --namespace "$provider" --wait > /dev/null 2>&1 || true
done
echo "   Done."
echo ""

# ---------------------------------------------------------------------------
# Step 2: Create Resource Group
# ---------------------------------------------------------------------------
echo ">> Creating resource group: ${RG_NAME}..."
az group create \
  --name "$RG_NAME" \
  --location "$LOCATION" \
  --output none
echo "   Done."
echo ""

# ---------------------------------------------------------------------------
# Step 3: Deploy Bicep templates
# ---------------------------------------------------------------------------
if [[ "$DRY_RUN" == true ]]; then
  echo ">> Running what-if analysis (dry run)..."
  az deployment group what-if \
    --resource-group "$RG_NAME" \
    --template-file "${INFRA_DIR}/main.bicep" \
    --parameters "${PARAM_FILE}" \
    --parameters location="$LOCATION"
else
  echo ">> Deploying infrastructure..."
  echo "   This may take 5-15 minutes..."
  echo ""

  DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group "$RG_NAME" \
    --template-file "${INFRA_DIR}/main.bicep" \
    --parameters "${PARAM_FILE}" \
    --parameters location="$LOCATION" \
    --query "properties.outputs" \
    --output json)

  echo ""
  echo "============================================"
  echo "  Deployment Complete"
  echo "============================================"
  echo ""
  echo "Outputs:"
  echo "$DEPLOYMENT_OUTPUT" | python3 -c "
import sys, json
outputs = json.load(sys.stdin)
for key, val in outputs.items():
    print(f'  {key}: {val[\"value\"]}')
" 2>/dev/null || echo "$DEPLOYMENT_OUTPUT"
  echo ""
  echo "============================================"
  echo ""
  echo "Next steps:"
  echo "  1. Populate Key Vault secrets (see docs/deployment-guide.md section 6)"
  echo "  2. Configure Entra ID App Registration (section 5)"
  echo "  3. Set up GitHub repository secrets (section 8)"
  echo "  4. Run database migrations: ./scripts/migrate-production.sh --env ${ENVIRONMENT}"
  echo "  5. Push to main to trigger the first deployment"
fi
