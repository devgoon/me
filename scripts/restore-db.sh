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

# Try to derive server and credentials from .env.local ADMIN_DATABASE_ADO
SERVER=""
CONN=""
PARSED_USER=""
PARSED_PASS=""
if [ -f .env.local ]; then
  # shellcheck disable=SC1091
  set -a; . .env.local; set +a || true
fi

if [ -n "${ADMIN_DATABASE_ADO:-}" ]; then
  CONN="$ADMIN_DATABASE_ADO"
  # Extract Data Source value from ADO string: Data Source=server;...
  SERVER=$(printf "%s" "$CONN" | sed -n 's/.*Data Source=\([^;]*\).*/\1/p')

  IFS=';' read -ra PARTS <<< "$CONN"
  for p in "${PARTS[@]}"; do
    p_trim=$(echo "$p" | awk '{$1=$1;print}')
    [ -z "$p_trim" ] && continue
    key=${p_trim%%=*}
    val=${p_trim#*=}
    key=$(echo "$key" | awk '{$1=$1;print}')
    val=$(echo "$val" | awk '{$1=$1;print}')
    case "$key" in
      "User ID"|"UserID"|"user"|"User") PARSED_USER="$val" ;;
      "Password"|"password") PARSED_PASS="$val" ;;
    esac
  done
fi

if [ -z "$SERVER" ]; then
  echo "Target server not detected from .env.local. Set ADMIN_DATABASE_ADO." >&2
  echo "You can also set TARGET_SERVER env var before running this script." >&2
  exit 1
fi

# Use credentials from ADMIN_DATABASE_ADO (required)
SOURCE_USER="${PARSED_USER:-}"
SOURCE_PASS="${PARSED_PASS:-}"
if [ -z "$SOURCE_USER" ] || [ -z "$SOURCE_PASS" ]; then
  echo "ADMIN_DATABASE_ADO must include User ID and Password for restore operations." >&2
  exit 1
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
