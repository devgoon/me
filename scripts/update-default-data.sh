#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'USAGE'
Usage: update-default-data.sh [options]

Options:
  -u, --base-url URL     Base URL for the API (default: https://lodovi.co)
  -t, --timeout MS       Timeout in ms for each request (default: 120000)
  -r, --retries N        Number of retries for slow endpoints (default: 5)
  -n, --node CMD         Node command to run (default: node)
  -h, --help             Show this help

Examples:
  ./scripts/update-default-data.sh
  BASE_URL=http://localhost:7071 ./scripts/update-default-data.sh
  ./scripts/update-default-data.sh -u https://lodovi.co -t 60000 -r 3
USAGE
}

# Defaults
BASE_URL=${BASE_URL:-https://lodovi.co}
TIMEOUT_MS=${TIMEOUT_MS:-120000}
RETRIES=${RETRIES:-5}
NODE_CMD=${NODE_CMD:-node}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -u|--base-url)
      BASE_URL="$2"; shift 2;;
    -t|--timeout)
      TIMEOUT_MS="$2"; shift 2;;
    -r|--retries)
      RETRIES="$2"; shift 2;;
    -n|--node)
      NODE_CMD="$2"; shift 2;;
    -h|--help)
      show_help; exit 0;;
    *)
      echo "Unknown option: $1" >&2; show_help; exit 2;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
SCRIPT="$ROOT_DIR/scripts/update-default-data.js"

echo "Running update-default-data with BASE_URL=${BASE_URL}, TIMEOUT_MS=${TIMEOUT_MS}, RETRIES=${RETRIES}"

BASE_URL="$BASE_URL" TIMEOUT_MS="$TIMEOUT_MS" RETRIES="$RETRIES" "$NODE_CMD" "$SCRIPT"
