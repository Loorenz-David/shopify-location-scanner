#!/usr/bin/env bash
set -euo pipefail

# Create a SQLite online backup and optionally prune old backups.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/item-scanner}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (env var or ${ENV_FILE})." >&2
  exit 1
fi

if [[ "$DATABASE_URL" != file:* ]]; then
  echo "DATABASE_URL must be SQLite file URL (file:...)." >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 command is required for backup." >&2
  exit 1
fi

DB_PATH="${DATABASE_URL#file:}"
if [[ "$DB_PATH" != /* ]]; then
  DB_PATH="${PROJECT_DIR}/${DB_PATH}"
fi

if [[ ! -f "$DB_PATH" ]]; then
  echo "SQLite file not found: $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/app_${TIMESTAMP}.db"

sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
gzip -f "$BACKUP_FILE"

find "$BACKUP_DIR" -type f -name '*.db.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup created: ${BACKUP_FILE}.gz"
