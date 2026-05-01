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
  echo ".env.local not found; create .env.local with ADMIN_DATABASE_ADO set" >&2
  exit 1
fi

# source .env.local so quoted values are handled
set -a; . .env.local; set +a

if [ -z "${ADMIN_DATABASE_ADO:-}" ]; then
  echo "ADMIN_DATABASE_ADO not found in .env.local; please add ADO-style connection string (wrap in quotes if it contains semicolons)" >&2
  exit 1
fi

# strip optional surrounding quotes (already sourced, but be safe)
DB_CONN="${ADMIN_DATABASE_ADO}"

# Parse ADO-style connection string (key=value;key2=value2;...)
IFS=';' read -ra PARTS <<< "$DB_CONN"
SERVER=""
DATABASE=""
USER=""
PASSWORD=""
for p in "${PARTS[@]}"; do
  # trim
  p_trim=$(echo "$p" | awk '{$1=$1;print}')
  [ -z "$p_trim" ] && continue
  key=${p_trim%%=*}
  val=${p_trim#*=}
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
  echo "ADMIN_DATABASE_ADO appears to be missing User ID or Password; include credentials in .env.local" >&2
  exit 1
fi
if [ -z "$SERVER" ]; then
  echo "Could not parse Server from ADMIN_DATABASE_ADO" >&2
  exit 1
fi

echo "Using server: $SERVER"
SQLCMD_ARGS=( -S "$SERVER" -U "$USER" -P "$PASSWORD" )
if [ -n "$DATABASE" ]; then
  SQLCMD_ARGS+=( -d "$DATABASE" )
fi
SQLCMD_ARGS+=( -i "$SQL_FILE" )
sqlcmd "${SQLCMD_ARGS[@]}"

echo "SQL file execution complete."
