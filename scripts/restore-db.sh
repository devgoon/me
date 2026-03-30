#!/usr/bin/env bash
set -euo pipefail

BACPAC_PATH="$1"
TARGET_DB="$2"

if [ -z "$BACPAC_PATH" ] || [ -z "$TARGET_DB" ]; then
  echo "Usage: $0 /path/to/file.bacpac target_database_name"
  exit 1
fi

if [ ! -f "$BACPAC_PATH" ]; then
  echo "BACPAC file not found: $BACPAC_PATH"
  exit 1
fi

# Try to derive server from .env.local DATABASE_ADO if available
SERVER=""
if [ -f .env.local ]; then
  # shellcheck disable=SC1091
  set -a; . .env.local; set +a || true
fi

if [ -n "${DATABASE_ADO:-}" ]; then
  # Extract Data Source value from ADO string: Data Source=server;...
  SERVER=$(printf "%s" "$DATABASE_ADO" | sed -n 's/.*Data Source=\([^;]*\).*/\1/p')
fi

if [ -z "$SERVER" ]; then
  echo "Target server not detected from .env.local. Set DATABASE_ADO or export TARGET_SERVER." >&2
  echo "You can also set TARGET_SERVER env var before running this script." >&2
  exit 1
fi

# Ask for credentials if not provided
if [ -z "${SOURCE_USER:-}" ]; then
  read -rp "SQL admin user (for import) [lodovico]: " SOURCE_USER
  SOURCE_USER=${SOURCE_USER:-lodovico}
fi
if [ -z "${SOURCE_PASS:-}" ]; then
  read -rsp "SQL admin password: " SOURCE_PASS
  echo
fi

printf "About to import bacpac:\n  file: %s\n  server: %s\n  target db: %s\n  user: %s\n" "$BACPAC_PATH" "$SERVER" "$TARGET_DB" "$SOURCE_USER"
read -rp "Proceed with import? Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborting."; exit 1
fi

# Attempt import using sqlpackage if available
if command -v sqlpackage >/dev/null 2>&1; then
  echo "Running sqlpackage import..."
  sqlpackage /a:Import /sf:"$BACPAC_PATH" /tsn:"$SERVER" /tdn:"$TARGET_DB" /tu:"$SOURCE_USER" /tp:"$SOURCE_PASS"
  rc=$?
  if [ $rc -ne 0 ]; then
    echo "sqlpackage returned exit code $rc"; exit $rc
  fi
  echo "Import completed."
else
  echo "sqlpackage not found. Install it (scripts/install-sqlpackage.sh) or run the following command manually:" >&2
  echo "sqlpackage /a:Import /sf:\"$BACPAC_PATH\" /tsn:\"$SERVER\" /tdn:\"$TARGET_DB\" /tu:\"$SOURCE_USER\" /tp:\"$SOURCE_PASS\"" >&2
  exit 1
fi
