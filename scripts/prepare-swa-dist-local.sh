#!/usr/bin/env bash
set -euo pipefail

echo "Preparing local swa-dist (like CI)"
if [ -d swa-dist ]; then
  echo "Cleaning existing swa-dist contents"
  chmod -R u+w swa-dist || true
  find swa-dist -mindepth 1 -maxdepth 1 -exec rm -rf {} + || true
else
  rm -rf swa-dist || true
fi
mkdir -p swa-dist
shopt -s dotglob || true

for p in *; do
  case "$p" in
    .git|swa-dist|db|.azurite|coverage|.nyc_output|node_modules)
      echo "Skipping $p"
      continue
      ;;
  esac
  cp -a "$p" swa-dist/ || true
done

# Remove common archive/backup artifacts if copied
find swa-dist -type f \( -name "*.bacpac" -o -name "*.zip" -o -name "*.tar" -o -name "*.tgz" -o -name "*.bak" \) -exec rm -f {} + || true

# Install API dependencies directly into swa-dist/api so local emulator can run
if [ -d swa-dist/api ]; then
  echo "Installing API dependencies into swa-dist/api"
  pushd swa-dist/api >/dev/null
  npm ci && npm prune --production
  popd >/dev/null
else
  echo "No swa-dist/api directory found; skipping API install"
fi

# Show size
SIZE_MB=$(du -sm swa-dist | awk '{print $1}') || true
echo "swa-dist size: ${SIZE_MB:-0} MB"

echo "Done. Run the emulator with: npx @azure/static-web-apps-cli@latest start swa-dist --api-location swa-dist/api --port 4280"