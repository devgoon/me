#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [--repo owner/repo] [--env-file path] [--dry-run] [--force]

Reads a dotenv-style file (default: .env.local) and creates/upserts
GitHub repository secrets or repository variables using the `gh` CLI.

Conventions:
- Keys containing SECRET, TOKEN, PASSWORD, PASS, KEY, or API are created as GitHub Secrets.
- All other keys are created as GitHub Variables.

Options:
  --repo owner/repo   Target repository (defaults to current repo as discovered by `gh repo view`).
  --env-file PATH     Path to dotenv file (default: .env.local)
  --dry-run           Print the GH commands that would be executed
  --force             Don't prompt; run commands
  -h, --help          Show this help
EOF
}

ENV_FILE=.env.local
DRY_RUN=0
FORCE=0
REPO=""

while [ $# -gt 0 ]; do
  case "$1" in
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI not found. Install and authenticate before running this script." >&2
  exit 2
fi

if [ -z "${REPO}" ]; then
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
  if [ -z "${REPO}" ]; then
    echo "Unable to determine repository. Pass --repo owner/repo." >&2
    exit 3
  fi
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 4
fi

echo "Using repo: ${REPO}"
echo "Reading env file: ${ENV_FILE}"

count=0
skipped=0

while IFS= read -r raw || [ -n "$raw" ]; do
  line="$raw"
  # Strip leading/trailing whitespace
  line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  # Skip comments and blank lines
  if [ -z "$line" ] || [[ "$line" =~ ^# ]]; then
    continue
  fi
  # Skip lines without '='
  if ! echo "$line" | grep -q '='; then
    echo "Skipping non-assignment line: $line"
    skipped=$((skipped+1))
    continue
  fi

  key="${line%%=*}"
  value="${line#*=}"
  # Remove surrounding double quotes if present
  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value:1:${#value}-2}"
  fi
  # Remove surrounding single quotes if present
  if [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  # Uppercase key for matching
  key_uc=$(echo "$key" | tr '[:lower:]' '[:upper:]')

  is_secret=0
  case "$key_uc" in
    *SECRET*|*TOKEN*|*PASSWORD*|*PASS*|*KEY*|*API*|*DATABASE*) is_secret=1;;
  esac

  if [ "$is_secret" -eq 1 ]; then
    cmd=(gh secret set "${key}" --body "${value}" --repo "${REPO}")
    kind="secret"
  else
    cmd=(gh variable set "${key}" "${value}" --repo "${REPO}")
    kind="variable"
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "DRY-RUN: Would create ${kind}: ${key}"
    echo "  ${cmd[*]}"
  else
    if [ "$FORCE" -eq 0 ]; then
      printf "Create/update %s '%s' in %s? [y/N] " "$kind" "$key" "$REPO"
      read -r reply
      if [[ ! "$reply" =~ ^[Yy] ]]; then
        echo "Skipping $key"
        skipped=$((skipped+1))
        continue
      fi
    fi
    echo "Setting ${kind}: ${key}"
    if "${cmd[@]}"; then
      count=$((count+1))
    else
      echo "Failed to set ${kind} ${key}" >&2
    fi
  fi
done < "${ENV_FILE}"

echo "Done. Created/updated: ${count}. Skipped: ${skipped}."

exit 0
