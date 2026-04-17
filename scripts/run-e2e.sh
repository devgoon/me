#!/usr/bin/env bash
set -euo pipefail

# Diagnostics
printf "(env) BASE_URL='%s'\n" "${BASE_URL:-}"

# If BASE_URL is provided (CI / deployed preview), don't start local stack.
if [ -n "${BASE_URL:-}" ]; then
  echo "BASE_URL is set to ${BASE_URL}; running Playwright tests against remote host"
  # Expect the CI workflow to provide E2E_PREVIEW_ENFORCES_AUTH. Default to 0
  # for backward compatibility if it's not present.
  export E2E_PREVIEW_ENFORCES_AUTH=${E2E_PREVIEW_ENFORCES_AUTH:-0}
  echo "E2E_PREVIEW_ENFORCES_AUTH=${E2E_PREVIEW_ENFORCES_AUTH}"
  if npm run test:e2e; then
    RESULT=0
  else
    RESULT=$?
    echo "Playwright tests failed (exit ${RESULT})"
  fi
  exit ${RESULT}
fi

# Start local stack (same logic as Makefile start) and run tests
echo "Starting local app stack in background for e2e tests..."
command -v nc >/dev/null 2>&1 || { echo "Error: 'nc' (netcat) is required to wait for ports"; exit 1; }

# Start the existing start target in the background
make start & START_MAKE_PID=$!

# Wait for the app port to be ready
until nc -z localhost 4280 >/dev/null 2>&1; do
  echo -n '.'; sleep 0.5
done
echo; echo "App is listening on http://localhost:4280"

# Wait for Functions / API health endpoint to report healthy before running tests
HEALTH_URL="http://localhost:4280/api/health"
MAX_WAIT=60
WAITED=0
echo "Waiting for ${HEALTH_URL} to return 200..."
until curl -sSf "$HEALTH_URL" >/dev/null 2>&1; do
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    echo "Timed out waiting for ${HEALTH_URL} after ${MAX_WAIT}s"
    # Show a snippet of function host logs to help debugging
    echo "--- Functions host health check failed; dumping recent logs (last 200 lines) ---"
    if command -v lsof >/dev/null 2>&1; then
      ps aux | grep -i "func" | head -n 5 || true
    fi
    break
  fi
  echo -n '.'; sleep 1; WAITED=$((WAITED+1))
done
echo; echo "Health check finished (waited ${WAITED}s)"

# Run Playwright tests
# Ensure the env flag is explicitly set for local runs (default to 0)
export E2E_PREVIEW_ENFORCES_AUTH=${E2E_PREVIEW_ENFORCES_AUTH:-0}
echo "E2E_PREVIEW_ENFORCES_AUTH=${E2E_PREVIEW_ENFORCES_AUTH} (local run)"

if npm run test:e2e; then
  RESULT=0
else
  RESULT=$?
  echo "Playwright tests failed (exit ${RESULT})"
fi

# Stop local stack
make stop || true
exit ${RESULT}
