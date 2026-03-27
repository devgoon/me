#!/usr/bin/env bash
set -euo pipefail

SQL_FILE=${1:-}
if [ -z "$SQL_FILE" ]; then
  echo "Usage: $0 <sql-file>" >&2
  exit 2
fi
if [ ! -f "$SQL_FILE" ]; then
  echo "SQL file not found: $SQL_FILE" >&2
  exit 2
fi

if [ ! -f .env.local ]; then
  echo ".env.local not found; create .env.local with AZURE_SQL_CONN set" >&2
  exit 1
fi
AZ_LINE=$(grep -E '^AZURE_SQL_CONN=' .env.local || true)
if [ -z "$AZ_LINE" ]; then
  echo "AZURE_SQL_CONN not found in .env.local; please add it (wrap in quotes if it contains semicolons)" >&2
  exit 1
fi
# strip prefix and optional surrounding quotes
AZ_CONN=$(printf "%s" "$AZ_LINE" | sed -E 's/^AZURE_SQL_CONN=//; s/^"(.*)"$/\1/')
if [ -z "$AZ_CONN" ]; then
  echo "AZURE_SQL_CONN in .env.local is empty; please set it" >&2
  exit 1
fi

# If it looks like ADO-style connection string, parse key/value pairs separated by ;
if echo "$AZ_CONN" | grep -Ei 'Server=|Data Source=' >/dev/null 2>&1; then
  IFS=';' read -ra PARTS <<< "$AZ_CONN"
  SERVER=""
  DATABASE=""
  USER=""
  PASSWORD=""
  for p in "${PARTS[@]}"; do
    [ -z "$p" ] && continue
    key=${p%%=*}
    val=${p#*=}
    key=$(echo "$key" | awk '{$1=$1;print}')
    val=$(echo "$val" | awk '{$1=$1;print}')
    case "$key" in
      "Server"|"server"|"Data Source"|"DataSource"|"data source") SERVER="$val" ;;
      "Initial Catalog"|"InitialCatalog"|"database") DATABASE="$val" ;;
      "User ID"|"UserID"|"user") USER="$val" ;;
      "Password"|"password") PASSWORD="$val" ;;
      *) ;;
    esac
  done
  if [ -z "$USER" ] || [ -z "$PASSWORD" ]; then
    echo "AZURE_SQL_CONN appears to be an ADO string but missing User ID or Password; include credentials in .env.local" >&2
    exit 1
  fi
  if [ -z "$SERVER" ]; then
    echo "Could not parse Server from AZURE_SQL_CONN" >&2
    exit 1
  fi
  echo "Using server: $SERVER" 
  SQLCMD_ARGS=( -S "$SERVER" -U "$USER" -P "$PASSWORD" )
  if [ -n "$DATABASE" ]; then
    SQLCMD_ARGS+=( -d "$DATABASE" )
  fi
  SQLCMD_ARGS+=( -i "$SQL_FILE" )
  sqlcmd "${SQLCMD_ARGS[@]}"
else
  # treat AZ_CONN as server name
  echo "Using AZURE_SQL_CONN as server string: $AZ_CONN"
  sqlcmd -S "$AZ_CONN" -i "$SQL_FILE"
fi

echo "SQL file execution complete." 
