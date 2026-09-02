#!/usr/bin/env bash
# Release activation script for the EC2 production host.
#
# This script performs NO builds. All compilation (npm ci, prisma generate,
# tsc, vite build) happens on the GitHub Actions runner. The runner uploads
# prebuilt artifacts into ${REPO_ROOT}/.deploy/incoming and then invokes this
# script, which only:
#   - syncs the git worktree to the exact commit the artifacts were built from
#   - extracts and activates those artifacts with a directory swap
#   - runs database migrations
#   - reloads PM2 and verifies health
#   - rolls back the swap if anything fails
#
# The script is executed from the uploaded copy in .deploy/incoming so that the
# git sync below cannot rewrite the file while bash is still reading it.
set -Eeuo pipefail

GIT_REMOTE="${GIT_REMOTE:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
ENV_FILE="${ENV_FILE:-/etc/item-scanner/backend.env}"
LOCK_DIR="${LOCK_DIR:-/tmp/item-scanner-ec2-deploy.lock}"

if [[ -n "${REPO_ROOT:-}" ]]; then
  REPO_ROOT="$(cd "${REPO_ROOT}" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
fi

BACKEND_DIR="${REPO_ROOT}/apps/backend"
FRONTEND_DIR="${REPO_ROOT}/apps/frontend"
ECOSYSTEM_FILE="${BACKEND_DIR}/ecosystem.config.cjs"

DEPLOY_DIR="${REPO_ROOT}/.deploy"
INCOMING_DIR="${INCOMING_DIR:-${DEPLOY_DIR}/incoming}"
EXTRACT_DIR="${DEPLOY_DIR}/extract"
BACKUP_DIR="${DEPLOY_DIR}/rollback"
STATE_DIR="${DEPLOY_DIR}/state"
RELEASE_MARKER="${STATE_DIR}/current-release"
DEPS_FINGERPRINT_FILE="${STATE_DIR}/backend-deps.fingerprint"
MANIFEST_FILE="${INCOMING_DIR}/release.json"

BACKEND_APPS=(
  "shopify-backend"
  "shopify-webhook-worker"
  "shopify-notification-worker"
  "shopify-outbound-webhook-worker"
)

BACKEND_ENTRYPOINTS=(
  "src/server.js"
  "src/workers/webhook-worker.js"
  "src/workers/notification-worker.js"
  "src/workers/outbound-webhook-worker.js"
)

FETCH_TIMEOUT_SECONDS="${FETCH_TIMEOUT_SECONDS:-120}"
EXTRACT_TIMEOUT_SECONDS="${EXTRACT_TIMEOUT_SECONDS:-600}"
MIGRATE_TIMEOUT_SECONDS="${MIGRATE_TIMEOUT_SECONDS:-120}"
PM2_TIMEOUT_SECONDS="${PM2_TIMEOUT_SECONDS:-90}"
HEALTHCHECK_TIMEOUT_SECONDS="${HEALTHCHECK_TIMEOUT_SECONDS:-15}"

# Rollback bookkeeping. Each entry is "<live path>|<backup path>".
SWAPPED_PATHS=()
RELEASE_COMMITTED=false

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

run_timed_step() {
  local label="$1"
  local started_at
  local finished_at
  local duration
  shift

  started_at="$(date +%s)"
  log "Starting ${label}"
  "$@"
  finished_at="$(date +%s)"
  duration="$((finished_at - started_at))"
  log "Finished ${label} in ${duration}s"
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

rollback_swaps() {
  local idx
  local entry
  local live
  local backup

  if ((${#SWAPPED_PATHS[@]} == 0)); then
    return
  fi

  warn "Rolling back ${#SWAPPED_PATHS[@]} activated director(y|ies)"
  for ((idx = ${#SWAPPED_PATHS[@]} - 1; idx >= 0; idx--)); do
    entry="${SWAPPED_PATHS[idx]}"
    live="${entry%%|*}"
    backup="${entry##*|}"

    if [[ -d "${backup}" ]]; then
      rm -rf "${live}"
      mv "${backup}" "${live}"
      warn "Restored ${live}"
    else
      warn "No backup available for ${live}; leaving the new content in place"
    fi
  done
  SWAPPED_PATHS=()
}

restart_after_rollback() {
  if ! command -v pm2 >/dev/null 2>&1; then
    return
  fi

  if [[ ! -f "${ECOSYSTEM_FILE}" ]]; then
    return
  fi

  warn "Restarting PM2 apps with the restored release"
  pm2 startOrReload "${ECOSYSTEM_FILE}" --env production || true
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  warn "Deployment failed at line ${line_no} with exit code ${exit_code}"

  if [[ "${RELEASE_COMMITTED}" == false ]]; then
    rollback_swaps
    restart_after_rollback
  fi

  dump_pm2_diagnostics
  exit "${exit_code}"
}

on_signal() {
  local signal="$1"
  warn "Deployment interrupted by ${signal}; terminating child processes"
  trap - ERR EXIT HUP INT TERM

  if [[ "${RELEASE_COMMITTED}" == false ]]; then
    rollback_swaps
    restart_after_rollback
  fi

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

acquire_lock() {
  if mkdir "${LOCK_DIR}" 2>/dev/null; then
    return
  fi

  fail "Another deployment appears to be running (${LOCK_DIR})"
}

manifest_field() {
  local field="$1"
  node -e '
    const fs = require("fs");
    const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const value = manifest[process.argv[2]];
    process.stdout.write(value === undefined || value === null ? "" : String(value));
  ' "${MANIFEST_FILE}" "${field}"
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

commit_exists() {
  git cat-file -e "${1}^{commit}" 2>/dev/null
}

git_has_changes_between() {
  local from_ref="$1"
  local to_ref="$2"
  shift 2

  # An unknown baseline (first deploy, force-push, pruned history) must be
  # treated as "everything changed" so nothing is silently skipped.
  if ! commit_exists "${from_ref}"; then
    return 0
  fi

  if (($# == 0)); then
    ! git diff --quiet "${from_ref}" "${to_ref}"
    return
  fi

  ! git diff --quiet "${from_ref}" "${to_ref}" -- "$@"
}

sync_repo() {
  local release_sha="$1"

  log "Fetching ${GIT_REMOTE}/${DEPLOY_BRANCH}"
  run_with_timeout "${FETCH_TIMEOUT_SECONDS}" \
    git fetch --prune "${GIT_REMOTE}" "${DEPLOY_BRANCH}"

  if git show-ref --verify --quiet "refs/heads/${DEPLOY_BRANCH}"; then
    git checkout "${DEPLOY_BRANCH}"
  else
    git checkout -B "${DEPLOY_BRANCH}" --track "${GIT_REMOTE}/${DEPLOY_BRANCH}"
  fi

  commit_exists "${release_sha}" \
    || fail "Release commit ${release_sha} is not present after fetching ${GIT_REMOTE}/${DEPLOY_BRANCH}"

  # Reset to the exact commit the artifacts were built from, not to the branch
  # tip, so the source tree and the uploaded build can never disagree.
  git reset --hard "${release_sha}"
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

require_free_space() {
  local needed_kb="$1"
  local available_kb

  available_kb="$(df -Pk "${REPO_ROOT}" | awk 'NR == 2 { print $4 }')"
  if [[ -z "${available_kb}" ]]; then
    warn "Could not determine free disk space for ${REPO_ROOT}; continuing"
    return
  fi

  if ((available_kb < needed_kb)); then
    fail "Insufficient disk space on ${REPO_ROOT}: ${available_kb}KB available, ${needed_kb}KB required"
  fi

  log "Disk space check passed (${available_kb}KB available, ${needed_kb}KB required)"
}

archive_size_kb() {
  local archive="$1"
  local size_bytes

  if [[ ! -f "${archive}" ]]; then
    printf '0\n'
    return
  fi

  size_bytes="$(wc -c <"${archive}" | tr -d ' ')"
  printf '%s\n' "$(((size_bytes + 1023) / 1024))"
}

cleanup_incoming_artifacts() {
  # Deliberately leaves deploy-ec2.sh in place: this script is executed from
  # ${INCOMING_DIR}, and the workflow clears the whole directory before each
  # upload anyway.
  rm -f "${INCOMING_DIR}/backend-dist.tar.gz" \
    "${INCOMING_DIR}/frontend-dist.tar.gz" \
    "${INCOMING_DIR}/backend-node-modules.tar.gz" \
    "${MANIFEST_FILE}"
}

extract_archive() {
  local archive="$1"
  local destination="$2"

  rm -rf "${destination}"
  mkdir -p "${destination}"
  run_with_timeout "${EXTRACT_TIMEOUT_SECONDS}" \
    tar -xzf "${archive}" -C "${destination}"
}

swap_directory() {
  local staged="$1"
  local live="$2"
  local backup="$3"

  [[ -d "${staged}" ]] || fail "Staged directory ${staged} is missing"

  rm -rf "${backup}"
  if [[ -e "${live}" ]]; then
    mv "${live}" "${backup}"
  fi
  mv "${staged}" "${live}"
  SWAPPED_PATHS+=("${live}|${backup}")
  log "Activated ${live}"
}

verify_backend_dist() {
  local dist_dir="$1"
  local entrypoint

  for entrypoint in "${BACKEND_ENTRYPOINTS[@]}"; do
    [[ -f "${dist_dir}/${entrypoint}" ]] \
      || fail "Backend artifact is incomplete: ${dist_dir}/${entrypoint} is missing"
  done
}

verify_frontend_dist() {
  local dist_dir="$1"

  [[ -f "${dist_dir}/index.html" ]] \
    || fail "Frontend artifact is incomplete: ${dist_dir}/index.html is missing"
  [[ -d "${dist_dir}/assets" ]] \
    || fail "Frontend artifact is incomplete: ${dist_dir}/assets is missing"
}

detect_prisma_binary_target() {
  (cd "${BACKEND_DIR}" && node -e '
    import("@prisma/get-platform")
      .then(async (mod) => {
        const helper = mod.default ?? mod;
        process.stdout.write(await helper.getBinaryTargetForCurrentPlatform());
      })
      .catch(() => process.exit(1));
  ' 2>/dev/null) || true
}

verify_prisma_engines() {
  local needs_schema_engine="$1"
  local target
  local query_engine
  local schema_engine

  target="$(detect_prisma_binary_target)"
  if [[ -z "${target}" ]]; then
    warn "Could not detect the Prisma binary target on this host; skipping engine verification"
    return
  fi

  log "Prisma binary target for this host: ${target}"

  query_engine="$(find "${BACKEND_DIR}/node_modules/.prisma" "${BACKEND_DIR}/node_modules/@prisma" \
    -maxdepth 3 -name "libquery_engine-${target}.*" -print -quit 2>/dev/null || true)"
  [[ -n "${query_engine}" ]] \
    || fail "Prisma query engine for ${target} is missing from node_modules. Rebuild with PRISMA_BINARY_TARGET set to ${target} in the deploy workflow."

  if [[ "${needs_schema_engine}" == true ]]; then
    schema_engine="$(find "${BACKEND_DIR}/node_modules/@prisma/engines" \
      -maxdepth 1 -name "schema-engine-${target}*" -print -quit 2>/dev/null || true)"
    [[ -n "${schema_engine}" ]] \
      || fail "Prisma schema engine for ${target} is missing from node_modules; migrations cannot run. Rebuild with PRISMA_BINARY_TARGET set to ${target} in the deploy workflow."
  fi
}

main() {
  require_command git
  require_command node
  require_command npm
  require_command pm2
  require_command curl
  require_command tar

  acquire_lock

  cd "${REPO_ROOT}"
  [[ -d .git ]] || fail "Repository root not found at ${REPO_ROOT}"

  [[ -f "${MANIFEST_FILE}" ]] \
    || fail "Release manifest not found at ${MANIFEST_FILE}. Artifacts must be uploaded by the deploy workflow before this script runs."

  local release_sha
  local release_branch
  local release_deps_fingerprint
  release_sha="$(manifest_field sha)"
  release_branch="$(manifest_field branch)"
  release_deps_fingerprint="$(manifest_field depsFingerprint)"

  [[ -n "${release_sha}" ]] || fail "Release manifest does not contain a commit sha"
  [[ -n "${release_deps_fingerprint}" ]] || fail "Release manifest does not contain a dependency fingerprint"

  if [[ -n "${release_branch}" && "${release_branch}" != "${DEPLOY_BRANCH}" ]]; then
    fail "Release manifest branch ${release_branch} does not match the requested branch ${DEPLOY_BRANCH}"
  fi

  local backend_dist_archive="${INCOMING_DIR}/backend-dist.tar.gz"
  local frontend_dist_archive="${INCOMING_DIR}/frontend-dist.tar.gz"
  local node_modules_archive="${INCOMING_DIR}/backend-node-modules.tar.gz"

  [[ -f "${backend_dist_archive}" ]] || fail "Missing artifact: ${backend_dist_archive}"
  [[ -f "${frontend_dist_archive}" ]] || fail "Missing artifact: ${frontend_dist_archive}"

  local node_modules_shipped=false
  if [[ -f "${node_modules_archive}" ]]; then
    node_modules_shipped=true
  fi

  log "Starting EC2 release activation for branch ${DEPLOY_BRANCH} at ${release_sha}"
  ensure_clean_worktree

  local previous_head
  previous_head="$(git rev-parse HEAD)"

  sync_repo "${release_sha}"

  mkdir -p "${STATE_DIR}"

  local last_deployed_sha=""
  if [[ -f "${RELEASE_MARKER}" ]]; then
    last_deployed_sha="$(tr -d '[:space:]' <"${RELEASE_MARKER}")"
  fi

  local installed_deps_fingerprint=""
  if [[ -f "${DEPS_FINGERPRINT_FILE}" ]]; then
    installed_deps_fingerprint="$(tr -d '[:space:]' <"${DEPS_FINGERPRINT_FILE}")"
  fi

  # The baseline is the last successfully activated release when we know it,
  # so a deploy that failed midway is never mistaken for "already deployed".
  local baseline="${last_deployed_sha}"
  if [[ -z "${baseline}" ]]; then
    baseline="${previous_head}"
  fi
  log "Comparing against baseline ${baseline}"

  if [[ "${last_deployed_sha}" == "${release_sha}" \
    && "${installed_deps_fingerprint}" == "${release_deps_fingerprint}" \
    && "${node_modules_shipped}" == false \
    && -d "${BACKEND_DIR}/dist" \
    && -d "${FRONTEND_DIR}/dist" ]]; then
    log "Release ${release_sha} is already active; nothing to do"
    cleanup_incoming_artifacts
    return
  fi

  local backend_code_changed=false
  local backend_manifest_changed=false
  local prisma_changed=false
  local deploy_script_changed=false
  local frontend_code_changed=false
  local frontend_manifest_changed=false
  local migrations_changed=false

  if git_has_changes_between "${baseline}" "${release_sha}" \
    apps/backend/src \
    apps/backend/tsconfig.json \
    apps/backend/tsconfig.build.json \
    apps/backend/ecosystem.config.cjs; then
    backend_code_changed=true
  fi

  if git_has_changes_between "${baseline}" "${release_sha}" \
    apps/backend/package.json \
    apps/backend/package-lock.json; then
    backend_manifest_changed=true
  fi

  if git_has_changes_between "${baseline}" "${release_sha}" \
    apps/backend/prisma \
    apps/backend/prisma.config.ts; then
    prisma_changed=true
  fi

  if git_has_changes_between "${baseline}" "${release_sha}" \
    apps/backend/scripts/deploy-ec2.sh; then
    deploy_script_changed=true
  fi

  if git_has_changes_between "${baseline}" "${release_sha}" \
    apps/frontend/src \
    apps/frontend/index.html \
    apps/frontend/public \
    apps/frontend/vite.config.ts \
    apps/frontend/tsconfig.json \
    apps/frontend/tsconfig.app.json \
    apps/frontend/tsconfig.node.json; then
    frontend_code_changed=true
  fi

  if git_has_changes_between "${baseline}" "${release_sha}" \
    apps/frontend/package.json \
    apps/frontend/package-lock.json; then
    frontend_manifest_changed=true
  fi

  if git_has_changes_between "${baseline}" "${release_sha}" \
    apps/backend/prisma/migrations; then
    migrations_changed=true
  fi

  local backend_changed=false
  if [[ "${backend_code_changed}" == true \
    || "${backend_manifest_changed}" == true \
    || "${prisma_changed}" == true \
    || "${deploy_script_changed}" == true \
    || "${node_modules_shipped}" == true ]]; then
    backend_changed=true
  fi

  local frontend_changed=false
  if [[ "${frontend_code_changed}" == true || "${frontend_manifest_changed}" == true ]]; then
    frontend_changed=true
  fi

  if [[ ! -d "${BACKEND_DIR}/dist" ]]; then
    log "Backend dist is missing on this host; forcing backend activation"
    backend_changed=true
  fi

  if [[ ! -d "${FRONTEND_DIR}/dist" ]]; then
    log "Frontend dist is missing on this host; forcing frontend activation"
    frontend_changed=true
  fi

  if [[ ! -d "${BACKEND_DIR}/node_modules" && "${node_modules_shipped}" == false ]]; then
    fail "Backend node_modules is missing on this host and the release does not ship one. Re-run the deploy workflow; it uploads dependencies when the host has none."
  fi

  if [[ "${backend_changed}" == false && "${frontend_changed}" == false ]]; then
    log "No deployable changes detected; skipping activation"
    printf '%s\n' "${release_sha}" >"${RELEASE_MARKER}"
    cleanup_incoming_artifacts
    return
  fi

  load_backend_env

  local needed_kb=0
  if [[ "${backend_changed}" == true ]]; then
    needed_kb=$((needed_kb + $(archive_size_kb "${backend_dist_archive}") * 4))
  fi
  if [[ "${frontend_changed}" == true ]]; then
    needed_kb=$((needed_kb + $(archive_size_kb "${frontend_dist_archive}") * 4))
  fi
  if [[ "${node_modules_shipped}" == true ]]; then
    needed_kb=$((needed_kb + $(archive_size_kb "${node_modules_archive}") * 6))
  fi
  require_free_space "$((needed_kb + 262144))"

  mkdir -p "${EXTRACT_DIR}" "${BACKUP_DIR}"

  if [[ "${node_modules_shipped}" == true ]]; then
    run_timed_step "backend dependency extraction" \
      extract_archive "${node_modules_archive}" "${EXTRACT_DIR}/backend-node-modules"
    [[ -d "${EXTRACT_DIR}/backend-node-modules/node_modules/.bin" ]] \
      || fail "Backend dependency artifact is incomplete: node_modules/.bin is missing"
  fi

  if [[ "${backend_changed}" == true ]]; then
    run_timed_step "backend artifact extraction" \
      extract_archive "${backend_dist_archive}" "${EXTRACT_DIR}/backend-dist"
    verify_backend_dist "${EXTRACT_DIR}/backend-dist/dist"
  fi

  if [[ "${frontend_changed}" == true ]]; then
    run_timed_step "frontend artifact extraction" \
      extract_archive "${frontend_dist_archive}" "${EXTRACT_DIR}/frontend-dist"
    verify_frontend_dist "${EXTRACT_DIR}/frontend-dist/dist"
  fi

  # Take the backend down first when migrations are pending so no old code
  # runs against a migrated schema and no process holds the SQLite file.
  if [[ "${migrations_changed}" == true ]]; then
    log "Migrations are pending; stopping PM2 backend apps before activation"
    stop_backend_apps
  fi

  if [[ "${node_modules_shipped}" == true ]]; then
    run_timed_step "backend dependency activation" \
      swap_directory "${EXTRACT_DIR}/backend-node-modules/node_modules" \
      "${BACKEND_DIR}/node_modules" \
      "${BACKUP_DIR}/backend-node-modules"
  fi

  if [[ "${backend_changed}" == true ]]; then
    run_timed_step "backend release activation" \
      swap_directory "${EXTRACT_DIR}/backend-dist/dist" \
      "${BACKEND_DIR}/dist" \
      "${BACKUP_DIR}/backend-dist"
  fi

  if [[ "${frontend_changed}" == true ]]; then
    run_timed_step "frontend release activation" \
      swap_directory "${EXTRACT_DIR}/frontend-dist/dist" \
      "${FRONTEND_DIR}/dist" \
      "${BACKUP_DIR}/frontend-dist"
  fi

  verify_prisma_engines "${migrations_changed}"

  if [[ "${migrations_changed}" == true ]]; then
    run_timed_step "Prisma migrations" \
      run_with_timeout "${MIGRATE_TIMEOUT_SECONDS}" \
      npm --prefix "${BACKEND_DIR}" run prisma:migrate:deploy
  else
    log "Skipping Prisma migrations"
  fi

  if [[ "${backend_changed}" == true ]]; then
    export NODE_ENV="${NODE_ENV:-production}"
    run_timed_step "PM2 ecosystem reload" \
      run_with_timeout "${PM2_TIMEOUT_SECONDS}" \
      pm2 startOrReload "${ECOSYSTEM_FILE}" --env production
    pm2 save

    log "Verifying PM2 process state"
    assert_pm2_online

    run_timed_step "backend health checks" health_check
  elif [[ "${migrations_changed}" == true ]]; then
    # Apps were stopped for the migration but the backend release itself did
    # not change, so bring them back up on the existing build.
    run_timed_step "PM2 ecosystem reload" \
      run_with_timeout "${PM2_TIMEOUT_SECONDS}" \
      pm2 startOrReload "${ECOSYSTEM_FILE}" --env production
    pm2 save
    assert_pm2_online
    run_timed_step "backend health checks" health_check
  fi

  printf '%s\n' "${release_sha}" >"${RELEASE_MARKER}"
  if [[ "${node_modules_shipped}" == true ]]; then
    printf '%s\n' "${release_deps_fingerprint}" >"${DEPS_FINGERPRINT_FILE}"
  fi
  RELEASE_COMMITTED=true

  rm -rf "${BACKUP_DIR}" "${EXTRACT_DIR}"
  cleanup_incoming_artifacts

  log "Deployment finished successfully at ${release_sha}"
}

main "$@"
