#!/usr/bin/env bash
set -euo pipefail

# Deploy backend code on EC2 host and restart service.
SERVICE_NAME="${SERVICE_NAME:-shopify-backend}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$PROJECT_DIR"

echo "[deploy] Installing dependencies"
npm ci

echo "[deploy] Generating Prisma client"
npm run prisma:generate

echo "[deploy] Building TypeScript"
npm run build

echo "[deploy] Applying Prisma migrations"
npm run prisma:migrate:deploy

echo "[deploy] Restarting service: ${SERVICE_NAME}"
pm2 restart "${SERVICE_NAME}" || pm2 start dist/index.js --name "${SERVICE_NAME}"


echo "[deploy] Done"
