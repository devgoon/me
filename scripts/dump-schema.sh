#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/dump-schema.sh [output-file]
OUT_FILE=${1:-db/schema.sql}

if [ ! -f .env.local ]; then
  echo ".env.local not found; create .env.local with DATABASE_ADO set" >&2
  exit 1
fi

# Load environment (handles quoted values)
set -a; . .env.local; set +a

if [ -z "${DATABASE_ADO:-}" ]; then
  echo "DATABASE_ADO not found in .env.local; please add ADO-style connection string (wrap in quotes if it contains semicolons)" >&2
  exit 1
fi

DB_CONN="${DATABASE_ADO}"

# If connection string is in sqlserver://... format, convert to ADO-style Data Source string
if [[ "$DB_CONN" =~ ^\s*sqlserver:// ]]; then
  # remove prefix
  tmp=${DB_CONN#sqlserver://}
  IFS=';' read -ra PARTS <<< "$tmp"
  first=${PARTS[0]}
  hostport=$first
  host=$hostport
  port=''
  if [[ "$hostport" == *:* ]]; then
    port=${hostport##*:}
    host=${hostport%%:*}
  fi
  declare -A kv
  for ((i=1;i<${#PARTS[@]};i++)); do
    p=${PARTS[i]}
    if [[ "$p" == *"="* ]]; then
      k=${p%%=*}
      v=${p#*=}
      kv["$k"]="$v"
    fi
  done
  dataSource=$host
  if [ -n "$port" ]; then dataSource="$host,$port"; fi
  built="Data Source=$dataSource;"
  if [ -n "${kv[database]:-}" ]; then built+="Initial Catalog=${kv[database]};"; fi
  if [ -n "${kv[user]:-}" ]; then built+="User ID=${kv[user]};"; fi
  if [ -n "${kv[password]:-}" ]; then built+="Password=${kv[password]};"; fi
  if [ -n "${kv[encrypt]:-}" ]; then built+="Encrypt=${kv[encrypt]};"; fi
  DB_CONN="$built"
fi

if ! command -v sqlpackage >/dev/null 2>&1; then
  echo "sqlpackage not found; run 'make install-sqlpackage' or install sqlpackage manually" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT_FILE")"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Generating schema to $OUT_FILE (temp: $TMPDIR)"
# Parse database name from connection string for TargetDatabaseName
TARGET_DB=""
IFS=';' read -ra PARTS <<< "$DB_CONN"
for p in "${PARTS[@]}"; do
  p_trim=$(echo "$p" | awk '{$1=$1;print}')
  [ -z "$p_trim" ] && continue
  key=${p_trim%%=*}
  val=${p_trim#*=}
  key=$(echo "$key" | awk '{$1=$1;print}')
  val=$(echo "$val" | awk '{$1=$1;print}')
  case "$key" in
    "Initial Catalog"|"InitialCatalog"|"database"|"Database") TARGET_DB="$val" ;;
  esac
done

if [ -z "$TARGET_DB" ]; then
  echo "Could not parse target database name from DATABASE_ADO. Set Initial Catalog or DATABASE in .env.local or set TARGET_DB env var." >&2
  exit 1
fi

# Parse target server name from connection string (Data Source / Server)
TARGET_SERVER=""
for p in "${PARTS[@]}"; do
  p_trim=$(echo "$p" | awk '{$1=$1;print}')
  [ -z "$p_trim" ] && continue
  key=${p_trim%%=*}
  val=${p_trim#*=}
  key=$(echo "$key" | awk '{$1=$1;print}')
  val=$(echo "$val" | awk '{$1=$1;print}')
  case "$key" in
    "Data Source"|"DataSource"|"Server"|"server"|"data source") TARGET_SERVER="$val" ;;
  esac
done

# Allow override via env var
TARGET_SERVER="${TARGET_SERVER:-${TARGET_SERVER_ENV:-}}"
if [ -z "$TARGET_SERVER" ]; then
  echo "Could not parse target server name from DATABASE_ADO. Set Data Source/Server in .env.local or set TARGET_SERVER env var." >&2
  exit 1
fi

# Parse user/password from connection string if present
PARSED_USER=""
PARSED_PASS=""
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

# Final source credentials: prefer parsed values from DATABASE_ADO, fall back to SOURCE_USER/SOURCE_PASS env vars
SOURCE_USER_FINAL="${PARSED_USER:-${SOURCE_USER:-}}"
SOURCE_PASS_FINAL="${PARSED_PASS:-${SOURCE_PASS:-}}"

# Allow overriding target server/db via env vars
TARGET_SERVER="${TARGET_SERVER:-${TARGET_SERVER_ENV:-}}"
TARGET_DB="${TARGET_DB:-${TARGET_DB_ENV:-}}"

# Prefer DeployScriptPath which writes the generated script directly.
DACPAC="$TMPDIR/db.dacpac"

echo "Extracting dacpac to $DACPAC"
# Use explicit server/db and credentials if available to avoid integrated auth issues
EXTRACT_CMD=(sqlpackage /Action:Extract /SourceServerName:"$TARGET_SERVER" /SourceDatabaseName:"$TARGET_DB" /TargetFile:"$DACPAC")
if [ -n "$SOURCE_USER_FINAL" ]; then
  EXTRACT_CMD+=(/SourceUser:"$SOURCE_USER_FINAL" /SourcePassword:"$SOURCE_PASS_FINAL")
fi
if ! "${EXTRACT_CMD[@]}"; then
  echo "sqlpackage Extract failed" >&2
  exit 1
fi

echo "Generating script from dacpac to $OUT_FILE"
# Build Script command and include explicit target credentials to avoid SSPI/Integrated auth
# Use a non-existent target DB name by default to force a full CREATE script (so sqlpackage
# emits object creation statements rather than a minimal publish script). Override with
# DUMP_TARGET_DB env var if you want a specific target name.
SCRIPT_TARGET_DB="${DUMP_TARGET_DB:-${TARGET_DB}_dump}"
SCRIPT_CMD=(sqlpackage /Action:Script /SourceFile:"$DACPAC" /TargetServerName:"$TARGET_SERVER" /TargetDatabaseName:"$SCRIPT_TARGET_DB" /DeployScriptPath:"$OUT_FILE" /p:ScriptDatabaseOptions=true)
if [ -n "$SOURCE_USER_FINAL" ]; then
  SCRIPT_CMD+=(/TargetUser:"$SOURCE_USER_FINAL" /TargetPassword:"$SOURCE_PASS_FINAL")
fi
if "${SCRIPT_CMD[@]}"; then
  echo "Schema export complete: $OUT_FILE"
else
  echo "Primary sqlpackage invocation failed; attempting to locate any generated SQL in temp dir..." >&2
  found=$(find "$TMPDIR" -type f -name '*.sql' -print -quit || true)
  if [ -n "$found" ]; then
    mv "$found" "$OUT_FILE"
    echo "Moved generated script from $found -> $OUT_FILE"
  else
    echo "No generated SQL found in $TMPDIR. Trying alternate Script invocation to a single file..." >&2
    ALT_OUT="$TMPDIR/out.sql"
    ALT_CMD=(sqlpackage /Action:Script /SourceFile:"$DACPAC" /TargetServerName:"$TARGET_SERVER" /TargetDatabaseName:"$TARGET_DB" /OutputPath:"$ALT_OUT" /p:ScriptDatabaseOptions=true)
    if [ -n "$SOURCE_USER_FINAL" ]; then
      ALT_CMD+=(/TargetUser:"$SOURCE_USER_FINAL" /TargetPassword:"$SOURCE_PASS_FINAL")
    fi
    echo "Running: ${ALT_CMD[*]}" >&2
    if "${ALT_CMD[@]}"; then
      if [ -f "$ALT_OUT" ] && [ -s "$ALT_OUT" ]; then
        mv "$ALT_OUT" "$OUT_FILE"
        echo "Moved alternate generated script -> $OUT_FILE"
      else
        echo "Alternate invocation produced no script file or file empty." >&2
        echo "Please inspect sqlpackage output above for errors." >&2
        exit 1
      fi
    else
      echo "Alternate sqlpackage invocation failed. Please run with debug for more info." >&2
      exit 1
    fi
  fi
fi
