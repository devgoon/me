#!/usr/bin/env bash
set -euo pipefail

# Source env
if [ -f .env.local ]; then
  set -a
  . .env.local
  set +a
fi

TARGET_DB="$1"

if [ -z "${ADMIN_DATABASE_ADO:-}" ]; then
  echo "ADMIN_DATABASE_ADO not set in .env.local; please set ADMIN_DATABASE_ADO (ADO-style connection string)" >&2
  exit 1
fi

if ! command -v sqlpackage >/dev/null 2>&1; then
  echo "sqlpackage not found in PATH" >&2
  exit 1
fi

# If a target DB name was provided, replace or add Initial Catalog in the ADO string
CONN="${ADMIN_DATABASE_ADO}"
if [ -n "${TARGET_DB}" ]; then
  if echo "$CONN" | grep -qi "Initial Catalog="; then
    CONN=$(echo "$CONN" | sed -E "s/(Initial Catalog=)[^;]*/\1${TARGET_DB}/I")
  else
    # append Initial Catalog
    CONN="${CONN};Initial Catalog=${TARGET_DB}"
  fi
fi

TS=$(date +%Y%m%d%H%M%S)
OUT="db/backup-${TS}.bacpac"

SAFE_CONN=$(echo "$CONN" | sed -E 's/(Password=)[^;]*/\1********/Ig')

printf "About to export database using connection: %s\nOutput file: %s\n" "$SAFE_CONN" "$OUT"
read -rp "Proceed with export? Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborting."; exit 1
fi

echo "[backup] running sqlpackage export -> ${OUT}"
# Use double quotes around the connection string to preserve semicolons
sqlpackage /Action:Export /SourceConnectionString:"${CONN}" /TargetFile:"${OUT}"
RC=$?
if [ $RC -ne 0 ]; then
  echo "sqlpackage failed with exit code $RC" >&2
  exit $RC
fi

echo "[backup] done: ${OUT}"
