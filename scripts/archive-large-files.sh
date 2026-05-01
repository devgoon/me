#!/usr/bin/env bash
#set -euo pipefail
# Helper to archive large files in the repo working tree into archives/
set -euo pipefail

ARCHIVE_DIR="archives"
mkdir -p "$ARCHIVE_DIR"

# Patterns to archive - adjust as needed
PATTERNS=("db/*.bacpac" "**/coverage/**" "**/lcov-report/**")

for p in "${PATTERNS[@]}"; do
  # Use zip with -r; include files that exist
  shopt -s nullglob globstar
  files=( $p )
  if [ ${#files[@]} -gt 0 ]; then
    name=$(echo "$p" | tr '/ *' '_' | tr -s '_')
    zipfile="$ARCHIVE_DIR/archive-${name}.zip"
    echo "Archiving ${#files[@]} files matching $p to $zipfile"
    zip -r "$zipfile" "${files[@]}" >/dev/null
  fi
done

echo "Done. Review $ARCHIVE_DIR before removing files from history."
