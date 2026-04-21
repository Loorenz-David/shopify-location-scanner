#!/usr/bin/env bash
set -Eeuo pipefail

GIT_REMOTE="${GIT_REMOTE:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
ENV_FILE="${ENV_FILE:-/etc/item-scanner/backend.env}"
LOCK_DIR="${LOCK_DIR:-/tmp/item-scanner-ec2-deploy.lock}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/apps/backend"
FRONTEND_DIR="${REPO_ROOT}/apps/frontend"
ECOSYSTEM_FILE="${BACKEND_DIR}/ecosystem.config.cjs"
BACKEND_APPS=(
  "shopify-backend"
  "shopify-webhook-worker"
  "shopify-notification-worker"
)
LEGACY_BACKEND_APPS=(
  "shopify-worker"
)

timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

log() {
  printf '[deploy][%s] %s\n' "$(timestamp)" "$*"
}

warn() {
  printf '[deploy][%s][warn] %s\n' "$(timestamp)" "$*" >&2
}

fail() {
  printf '[deploy][%s][error] %s\n' "$(timestamp)" "$*" >&2
  exit 1
}

cleanup() {
  rm -rf "${LOCK_DIR}"
}

dump_pm2_diagnostics() {
  if ! command -v pm2 >/dev/null 2>&1; then
    return
  fi

  warn "PM2 status"
  pm2 status || true

  warn "Recent PM2 logs"
  pm2 logs --nostream --lines 120 || true
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  warn "Deployment failed at line ${line_no} with exit code ${exit_code}"
  dump_pm2_diagnostics
  exit "${exit_code}"
}

trap 'on_error "$?" "${LINENO}"' ERR
trap cleanup EXIT

require_command() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || fail "Required command not found: ${cmd}"
}

install_with_dev_dependencies() {
  local target_dir="$1"
  env -u NODE_ENV \
    NPM_CONFIG_PRODUCTION=false \
    NPM_CONFIG_OMIT= \
    npm --prefix "${target_dir}" ci --include=dev
}

acquire_lock() {
  if mkdir "${LOCK_DIR}" 2>/dev/null; then
    return
  fi

  fail "Another deployment appears to be running (${LOCK_DIR})"
}

load_backend_env() {
  local fallback_env="${BACKEND_DIR}/.env"

  if [[ ! -f "${ENV_FILE}" && -f "${fallback_env}" ]]; then
    ENV_FILE="${fallback_env}"
  fi

  if [[ -f "${ENV_FILE}" ]]; then
    log "Loading backend environment from ${ENV_FILE}"
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
  else
    warn "Environment file ${ENV_FILE} not found; relying on current shell environment"
  fi

  [[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is not set"
}

ensure_clean_worktree() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    fail "Refusing to deploy with a dirty worktree on the EC2 host"
  fi
}

sync_repo() {
  log "Fetching ${GIT_REMOTE}/${DEPLOY_BRANCH}"
  git fetch --prune "${GIT_REMOTE}" "${DEPLOY_BRANCH}"

  if git show-ref --verify --quiet "refs/heads/${DEPLOY_BRANCH}"; then
    git checkout "${DEPLOY_BRANCH}"
  else
    git checkout -B "${DEPLOY_BRANCH}" --track "${GIT_REMOTE}/${DEPLOY_BRANCH}"
  fi

  git reset --hard "${GIT_REMOTE}/${DEPLOY_BRANCH}"
}

pm2_app_status() {
  local app="$1"
  PM2_APP_NAME="${app}" pm2 jlist | node -e '
    const fs = require("fs");
    const name = process.env.PM2_APP_NAME;
    const apps = JSON.parse(fs.readFileSync(0, "utf8"));
    const app = apps.find((entry) => entry.name === name);
    process.stdout.write(app?.pm2_env?.status || "missing");
  '
}

wait_for_pm2_status() {
  local app="$1"
  local expected="$2"
  local attempt
  local status

  for attempt in $(seq 1 15); do
    status="$(pm2_app_status "${app}")"
    if [[ "${status}" == "${expected}" ]]; then
      return
    fi

    if [[ "${expected}" == "missing" && "${status}" == "missing" ]]; then
      return
    fi

    sleep 1
  done

  fail "PM2 app ${app} did not reach status ${expected}"
}

stop_pm2_app_if_present() {
  local app
  app="$1"
  local status
  status="$(pm2_app_status "${app}")"
  if [[ "${status}" == "missing" ]]; then
    return
  fi

  log "Stopping PM2 app ${app}"
  pm2 stop "${app}" || true
  wait_for_pm2_status "${app}" "stopped"
}

delete_pm2_app_if_present() {
  local app="$1"
  local status
  status="$(pm2_app_status "${app}")"
  if [[ "${status}" == "missing" ]]; then
    return
  fi

  log "Deleting PM2 app ${app}"
  pm2 delete "${app}" || true
  wait_for_pm2_status "${app}" "missing"
}

stop_backend_apps() {
  local app
  for app in "${BACKEND_APPS[@]}" "${LEGACY_BACKEND_APPS[@]}"; do
    stop_pm2_app_if_present "${app}"
  done
}

delete_legacy_backend_apps() {
  local app
  for app in "${LEGACY_BACKEND_APPS[@]}"; do
    delete_pm2_app_if_present "${app}"
  done
}

assert_pm2_online() {
  local expected_apps_json
  expected_apps_json="$(printf '%s\n' "${BACKEND_APPS[@]}" | node -e 'const fs = require("fs"); const items = fs.readFileSync(0, "utf8").trim().split(/\n+/).filter(Boolean); process.stdout.write(JSON.stringify(items));')"

  EXPECTED_APPS="${expected_apps_json}" pm2 jlist | node -e '
    const fs = require("fs");
    const expected = new Set(JSON.parse(process.env.EXPECTED_APPS || "[]"));
    const apps = JSON.parse(fs.readFileSync(0, "utf8"));
    const byName = new Map(apps.map((app) => [app.name, app]));
    const failed = [];
    for (const name of expected) {
      const app = byName.get(name);
      const status = app?.pm2_env?.status;
      if (status !== "online") {
        failed.push(`${name}:${status || "missing"}`);
      }
    }
    if (failed.length > 0) {
      console.error(failed.join(", "));
      process.exit(1);
    }
  '
}

health_check() {
  local port="${PORT:-4000}"
  local base_url="${HEALTHCHECK_BASE_URL:-http://127.0.0.1:${port}}"
  local attempt

  for attempt in $(seq 1 15); do
    if curl --fail --silent --show-error "${base_url}/health" >/dev/null \
      && curl --fail --silent --show-error "${base_url}/health/db" >/dev/null; then
      log "Health checks passed via ${base_url}"
      return
    fi

    log "Health check attempt ${attempt}/15 failed; retrying in 2s"
    sleep 2
  done

  fail "Health checks did not pass via ${base_url}"
}

main() {
  require_command git
  require_command node
  require_command npm
  require_command pm2
  require_command curl

  acquire_lock

  cd "${REPO_ROOT}"
  [[ -d .git ]] || fail "Repository root not found at ${REPO_ROOT}"

  log "Starting EC2 deploy for branch ${DEPLOY_BRANCH}"
  ensure_clean_worktree

  local previous_sha
  previous_sha="$(git rev-parse --short HEAD)"

  sync_repo

  local current_sha
  current_sha="$(git rev-parse --short HEAD)"
  log "Repository updated ${previous_sha} -> ${current_sha}"

  load_backend_env
  local runtime_node_env="${NODE_ENV:-production}"

  log "Installing backend dependencies"
  install_with_dev_dependencies "${BACKEND_DIR}"

  log "Generating Prisma client"
  npm --prefix "${BACKEND_DIR}" run prisma:generate

  log "Building backend"
  npm --prefix "${BACKEND_DIR}" run build

  log "Installing frontend dependencies"
  install_with_dev_dependencies "${FRONTEND_DIR}"

  log "Building frontend"
  npm --prefix "${FRONTEND_DIR}" run build

  log "Stopping backend PM2 apps before migrations"
  stop_backend_apps
  delete_legacy_backend_apps

  log "Applying Prisma migrations"
  npm --prefix "${BACKEND_DIR}" run prisma:migrate:deploy

  log "Reloading PM2 ecosystem"
  export NODE_ENV="${runtime_node_env}"
  pm2 startOrReload "${ECOSYSTEM_FILE}" --env production
  pm2 save

  log "Verifying PM2 process state"
  assert_pm2_online

  log "Running backend health checks"
  health_check

  log "Deployment finished successfully at ${current_sha}"
}

main "$@"
