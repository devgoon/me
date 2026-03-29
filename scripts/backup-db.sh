#!/usr/bin/env bash
set -euo pipefail

# Source env
if [ -f .env.local ]; then
  set -a
  . .env.local
  set +a
fi

printf "Using DATABASE_ADO=[%s]\n" "${DATABASE_ADO:-}"
if [ -z "${DATABASE_ADO:-}" ]; then
  echo "DATABASE_ADO not set in .env.local; please set DATABASE_ADO (ADO-style connection string)" >&2
  exit 1
fi

if ! command -v sqlpackage >/dev/null 2>&1; then
  echo "sqlpackage not found in PATH" >&2
  exit 1
fi

TS=$(date +%Y%m%d%H%M%S)
OUT="db/backup-${TS}.bacpac"

echo "[backup] running sqlpackage export -> ${OUT}"
# Use double quotes around the connection string to preserve semicolons
sqlpackage /Action:Export /SourceConnectionString:"${DATABASE_ADO}" /TargetFile:"${OUT}"
RC=$?
if [ $RC -ne 0 ]; then
  echo "sqlpackage failed with exit code $RC" >&2
  exit $RC
fi

echo "[backup] done: ${OUT}"
