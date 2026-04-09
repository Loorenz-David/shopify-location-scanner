#!/usr/bin/env bash
set -euo pipefail

# Deploy backend code on EC2 host and restart service.
SERVICE_NAME="${SERVICE_NAME:-shopify-backend}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
ENV_FILE="${ENV_FILE:-/etc/item-scanner/backend.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$PROJECT_DIR"

if [[ ! -f "${ENV_FILE}" && -f ".env" ]]; then
	ENV_FILE=".env"
fi

if [[ -f "${ENV_FILE}" ]]; then
	echo "[deploy] Loading environment from ${ENV_FILE}"
	set -a
	# shellcheck disable=SC1090
	source "${ENV_FILE}"
	set +a
else
	echo "[deploy] Warning: ${ENV_FILE} not found; relying on existing shell environment"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
	echo "[deploy] Error: DATABASE_URL is not set"
	exit 1
fi

echo "[deploy] Updating code from ${GIT_REMOTE}/${DEPLOY_BRANCH}"
git fetch "${GIT_REMOTE}" "${DEPLOY_BRANCH}"
git checkout "${DEPLOY_BRANCH}"
git pull --ff-only "${GIT_REMOTE}" "${DEPLOY_BRANCH}"

echo "[deploy] Installing dependencies"

echo "[deploy] Stopping service: ${SERVICE_NAME}"
pm2 stop "${SERVICE_NAME}" || true

npm ci

echo "[deploy] Generating Prisma client"
npm run prisma:generate

echo "[deploy] Building TypeScript"
npm run build

echo "[deploy] Applying Prisma migrations"
npm run prisma:migrate:deploy

echo "[deploy] Restarting service: ${SERVICE_NAME}"
pm2 delete "${SERVICE_NAME}" || true
pm2 start dist/src/server.js --name "${SERVICE_NAME}" --cwd "${PROJECT_DIR}"
pm2 save

echo "[deploy] Done"