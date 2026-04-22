#!/usr/bin/env bash
set -Eeuo pipefail

GIT_REMOTE="${GIT_REMOTE:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
ENV_FILE="${ENV_FILE:-/etc/item-scanner/backend.env}"
LOCK_DIR="${LOCK_DIR:-/tmp/item-scanner-ec2-deploy.lock}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/apps/backend"
ECOSYSTEM_FILE="${BACKEND_DIR}/ecosystem.config.cjs"
BACKEND_APPS=(
  "shopify-backend"
  "shopify-webhook-worker"
  "shopify-notification-worker"
  "shopify-outbound-webhook-worker"
)
FETCH_TIMEOUT_SECONDS="${FETCH_TIMEOUT_SECONDS:-120}"
NPM_INSTALL_TIMEOUT_SECONDS="${NPM_INSTALL_TIMEOUT_SECONDS:-240}"
BUILD_TIMEOUT_SECONDS="${BUILD_TIMEOUT_SECONDS:-240}"
MIGRATE_TIMEOUT_SECONDS="${MIGRATE_TIMEOUT_SECONDS:-120}"
PM2_TIMEOUT_SECONDS="${PM2_TIMEOUT_SECONDS:-90}"
HEALTHCHECK_TIMEOUT_SECONDS="${HEALTHCHECK_TIMEOUT_SECONDS:-15}"

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

run_with_timeout() {
  local seconds="$1"
  shift

  if command -v timeout >/dev/null 2>&1; then
    timeout --signal=TERM --kill-after=10s "${seconds}" "$@"
    return
  fi

  "$@"
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

on_signal() {
  local signal="$1"
  warn "Deployment interrupted by ${signal}; terminating child processes"
  trap - ERR EXIT HUP INT TERM
  cleanup
  kill 0 >/dev/null 2>&1 || true
  exit 130
}

trap 'on_error "$?" "${LINENO}"' ERR
trap cleanup EXIT
trap 'on_signal HUP' HUP
trap 'on_signal INT' INT
trap 'on_signal TERM' TERM

require_command() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || fail "Required command not found: ${cmd}"
}

install_with_dev_dependencies() {
  local target_dir="$1"
  env -u NODE_ENV \
    NPM_CONFIG_PRODUCTION=false \
    NPM_CONFIG_OMIT= \
    npm --prefix "${target_dir}" ci --include=dev --no-audit --no-fund --prefer-offline
}

git_has_changes_between() {
  local from_ref="$1"
  local to_ref="$2"
  shift 2

  if (($# == 0)); then
    ! git diff --quiet "${from_ref}" "${to_ref}"
    return
  fi

  ! git diff --quiet "${from_ref}" "${to_ref}" -- "$@"
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
  run_with_timeout "${FETCH_TIMEOUT_SECONDS}" \
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
  local pm2_json
  pm2_json="$(pm2 jlist)"
  PM2_APP_NAME="${app}" node -e '
    const fs = require("fs");
    const name = process.env.PM2_APP_NAME;
    const apps = JSON.parse(fs.readFileSync(0, "utf8"));
    const app = apps.find((entry) => entry.name === name);
    process.stdout.write(app?.pm2_env?.status || "missing");
  ' <<< "${pm2_json}"
}

wait_for_no_online_backend_apps() {
  local attempt
  local pm2_json

  for attempt in $(seq 1 20); do
    pm2_json="$(pm2 jlist)"
    if TARGET_APPS="$(printf '%s\n' "${BACKEND_APPS[@]}" | node -e 'const fs = require("fs"); const items = fs.readFileSync(0, "utf8").trim().split(/\n+/).filter(Boolean); process.stdout.write(JSON.stringify(items));')" node -e '
      const fs = require("fs");
      const targetApps = new Set(JSON.parse(process.env.TARGET_APPS || "[]"));
      const apps = JSON.parse(fs.readFileSync(0, "utf8"));
      const online = apps.filter((app) => targetApps.has(app.name) && app?.pm2_env?.status === "online");
      if (online.length > 0) {
        console.error(online.map((app) => `${app.name}:${app.pm2_env.status}`).join(", "));
        process.exit(1);
      }
    ' <<< "${pm2_json}"; then
      return
    fi

    sleep 1
  done

  fail "Backend PM2 apps are still online after stop attempts"
}

database_file_path() {
  local database_url="${DATABASE_URL:-}"
  if [[ "${database_url}" != file:* ]]; then
    return
  fi

  local raw_path="${database_url#file:}"
  if [[ "${raw_path}" == /* ]]; then
    printf '%s\n' "${raw_path}"
    return
  fi

  printf '%s\n' "${BACKEND_DIR}/${raw_path}"
}

wait_for_database_unlock() {
  local db_path
  db_path="$(database_file_path)"
  if [[ -z "${db_path}" ]]; then
    return
  fi

  if ! command -v lsof >/dev/null 2>&1; then
    warn "lsof not available; skipping direct database lock inspection"
    return
  fi

  local attempt
  for attempt in $(seq 1 20); do
    if ! lsof "${db_path}" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  warn "Processes still hold ${db_path}"
  lsof "${db_path}" || true
  fail "Database file is still in use after PM2 stop"
}

stop_backend_apps() {
  log "Stopping PM2 backend apps"
  pm2 stop "${BACKEND_APPS[@]}" || true
  wait_for_no_online_backend_apps
  wait_for_database_unlock
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
    if curl --fail --silent --show-error --max-time "${HEALTHCHECK_TIMEOUT_SECONDS}" "${base_url}/health" >/dev/null \
      && curl --fail --silent --show-error --max-time "${HEALTHCHECK_TIMEOUT_SECONDS}" "${base_url}/health/db" >/dev/null; then
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

  if [[ "${previous_sha}" == "${current_sha}" ]]; then
    log "No new commit to deploy"
    return
  fi

  local backend_code_changed=false
  local backend_manifest_changed=false
  local prisma_changed=false
  local deploy_script_changed=false

  if git_has_changes_between "${previous_sha}" "${current_sha}" \
    apps/backend/src \
    apps/backend/tsconfig.json \
    apps/backend/ecosystem.config.cjs; then
    backend_code_changed=true
  fi

  if git_has_changes_between "${previous_sha}" "${current_sha}" \
    apps/backend/package.json \
    apps/backend/package-lock.json; then
    backend_manifest_changed=true
  fi

  if git_has_changes_between "${previous_sha}" "${current_sha}" \
    apps/backend/prisma; then
    prisma_changed=true
  fi

  if git_has_changes_between "${previous_sha}" "${current_sha}" \
    apps/backend/scripts/deploy-ec2.sh; then
    deploy_script_changed=true
  fi

  if [[ "${backend_code_changed}" == false \
    && "${backend_manifest_changed}" == false \
    && "${prisma_changed}" == false \
    && "${deploy_script_changed}" == false ]]; then
    log "No backend deployable changes detected; skipping install/build/reload"
    return
  fi

  load_backend_env
  local runtime_node_env="${NODE_ENV:-production}"

  if [[ "${backend_manifest_changed}" == true || ! -d "${BACKEND_DIR}/node_modules" ]]; then
    log "Installing backend dependencies"
    run_with_timeout "${NPM_INSTALL_TIMEOUT_SECONDS}" \
      install_with_dev_dependencies "${BACKEND_DIR}"
  else
    log "Skipping backend dependency install"
  fi

  if [[ "${backend_manifest_changed}" == true || "${prisma_changed}" == true ]]; then
    log "Generating Prisma client"
    run_with_timeout "${BUILD_TIMEOUT_SECONDS}" \
      npm --prefix "${BACKEND_DIR}" run prisma:generate
  else
    log "Skipping Prisma client generation"
  fi

  if [[ "${backend_code_changed}" == true || "${backend_manifest_changed}" == true || "${prisma_changed}" == true ]]; then
    log "Building backend"
    run_with_timeout "${BUILD_TIMEOUT_SECONDS}" \
      npm --prefix "${BACKEND_DIR}" run build
  else
    log "Skipping backend build"
  fi

  if git_has_changes_between "${previous_sha}" "${current_sha}" apps/backend/prisma/migrations; then
    log "Stopping backend PM2 apps before migrations"
    stop_backend_apps

    log "Applying Prisma migrations"
    run_with_timeout "${MIGRATE_TIMEOUT_SECONDS}" \
      npm --prefix "${BACKEND_DIR}" run prisma:migrate:deploy
  else
    log "Skipping Prisma migrations"
  fi

  log "Reloading PM2 ecosystem"
  export NODE_ENV="${runtime_node_env}"
  run_with_timeout "${PM2_TIMEOUT_SECONDS}" \
    pm2 startOrReload "${ECOSYSTEM_FILE}" --env production
  pm2 save

  log "Verifying PM2 process state"
  assert_pm2_online

  log "Running backend health checks"
  health_check

  log "Deployment finished successfully at ${current_sha}"
}

main "$@"
