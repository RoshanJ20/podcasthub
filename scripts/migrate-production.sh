#!/usr/bin/env bash
##
# Run Prisma Migrations Against Azure PostgreSQL
#
# Fetches the DATABASE_URL from Azure Key Vault and runs Prisma migrations.
# Use for manual/emergency migrations outside the CI/CD pipeline.
#
# Usage:
#   ./scripts/migrate-production.sh --env staging
#   ./scripts/migrate-production.sh --env production
#   ./scripts/migrate-production.sh --env staging --status    # Check status only
#
# Prerequisites:
#   - Azure CLI >= 2.57.0 (authenticated: `az login`)
#   - Node.js >= 20, npm >= 10
#   - npm dependencies installed (`npm ci`)
#   - Access to the Key Vault with secret read permissions
#
# Dependencies:
#   - prisma/schema.prisma
#   - prisma/migrations/
##
set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
ENVIRONMENT=""
STATUS_ONLY=false

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
usage() {
  echo "Usage: $0 --env <staging|production> [--status]"
  echo ""
  echo "Options:"
  echo "  --env      Required. Target environment: staging or production"
  echo "  --status   Run 'prisma migrate status' instead of applying migrations"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --status)
      STATUS_ONLY=true
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
KV_NAME="kv-the-audit-brief-${ENVIRONMENT}"

echo "============================================"
echo "  The Audit Brief — Database Migration"
echo "============================================"
echo "  Environment:  ${ENVIRONMENT}"
echo "  Key Vault:    ${KV_NAME}"
echo "  Mode:         $(if $STATUS_ONLY; then echo "Status check"; else echo "Apply migrations"; fi)"
echo "============================================"
echo ""

# ---------------------------------------------------------------------------
# Fetch DATABASE_URL from Key Vault
# ---------------------------------------------------------------------------
echo ">> Fetching DATABASE_URL from Key Vault..."
DATABASE_URL=$(az keyvault secret show \
  --vault-name "$KV_NAME" \
  --name "DATABASE-URL" \
  --query "value" \
  --output tsv)

if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: Failed to fetch DATABASE_URL from Key Vault '${KV_NAME}'"
  echo "Ensure you have access to the Key Vault and the secret exists."
  exit 1
fi
echo "   Done."
echo ""

export DATABASE_URL

# ---------------------------------------------------------------------------
# Generate Prisma client
# ---------------------------------------------------------------------------
echo ">> Generating Prisma client..."
npx prisma generate
echo "   Done."
echo ""

# ---------------------------------------------------------------------------
# Run migration
# ---------------------------------------------------------------------------
if [[ "$STATUS_ONLY" == true ]]; then
  echo ">> Checking migration status..."
  npx prisma migrate status
else
  echo ">> Applying migrations..."
  echo "   WARNING: This will modify the ${ENVIRONMENT} database."
  echo ""
  npx prisma migrate deploy
  echo ""
  echo ">> Migration complete."
fi

echo ""
echo "============================================"
echo "  Done"
echo "============================================"
