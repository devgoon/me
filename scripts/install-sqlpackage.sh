#!/usr/bin/env bash
set -euo pipefail

if command -v sqlpackage >/dev/null 2>&1; then
  echo "sqlpackage is already installed: $(command -v sqlpackage)"
  exit 0
fi

OS=$(uname -s)
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

install_to=/usr/local/bin

echo "Installing sqlpackage (temporary dir: $TMPDIR)"

case "$OS" in
  Linux)
    URL="https://aka.ms/sqlpackage-linux"
    ARCHIVE="$TMPDIR/sqlpackage.tar.gz"
    echo "Downloading sqlpackage from $URL"
    curl -fsSL -o "$ARCHIVE" "$URL"
    mkdir -p "$TMPDIR/extract"
    tar -xzf "$ARCHIVE" -C "$TMPDIR/extract"
    # extracted folder contains sqlpackage executable
    # Move entire extracted package into a predictable directory and create wrapper
    PKGDIR=/usr/local/lib/sqlpackage
    sudo rm -rf "$PKGDIR" || true
    sudo mkdir -p "$PKGDIR"
    sudo cp -a "$TMPDIR/extract/." "$PKGDIR/"
    # If sqlpackage executable exists, ensure it's executable and symlink
    if [ -f "$PKGDIR/sqlpackage" ]; then
      sudo chmod +x "$PKGDIR/sqlpackage" || true
      sudo ln -sf "$PKGDIR/sqlpackage" "$install_to/sqlpackage" || true
      echo "sqlpackage installed to $PKGDIR (wrapper at $install_to/sqlpackage)"
      exit 0
    fi
    # If package provides sqlpackage.dll (requires dotnet), create a wrapper that runs dotnet
    if [ -f "$PKGDIR/sqlpackage.dll" ]; then
      if ! command -v dotnet >/dev/null 2>&1; then
        echo "dotnet runtime not found; installing via Homebrew..."
        if command -v brew >/dev/null 2>&1; then
          brew install --cask dotnet || brew install --cask dotnet-sdk || true
        else
          echo "Homebrew not found; please install dotnet runtime manually" >&2
        fi
      fi
      cat <<'EOF' | sudo tee "$install_to/sqlpackage" >/dev/null
#!/usr/bin/env bash
DIR="/usr/local/lib/sqlpackage"
exec dotnet "$DIR/sqlpackage.dll" "$@"
EOF
      sudo chmod +x "$install_to/sqlpackage"
      echo "sqlpackage wrapper created at $install_to/sqlpackage"
      exit 0
    fi
    echo "Failed to find sqlpackage executable or sqlpackage.dll after extraction." >&2
    exit 1
    ;;
  Darwin)
    URL="https://aka.ms/sqlpackage-macos"
    ARCHIVE="$TMPDIR/sqlpackage.zip"
    echo "Downloading sqlpackage from $URL"
    curl -fsSL -o "$ARCHIVE" "$URL"
    mkdir -p "$TMPDIR/extract"
    unzip -q "$ARCHIVE" -d "$TMPDIR/extract"
    PKGDIR=/usr/local/lib/sqlpackage
    sudo rm -rf "$PKGDIR" || true
    sudo mkdir -p "$PKGDIR"
    sudo cp -a "$TMPDIR/extract/." "$PKGDIR/"
    EXE=$(find "$PKGDIR" -type f -name sqlpackage -print -quit || true)
    if [ -n "$EXE" ]; then
      sudo chmod +x "$EXE" || true
      sudo ln -sf "$EXE" "$install_to/sqlpackage" || true
      echo "sqlpackage installed to $PKGDIR (wrapper at $install_to/sqlpackage)"
      exit 0
    fi
    if [ -f "$PKGDIR/sqlpackage.dll" ]; then
      if ! command -v dotnet >/dev/null 2>&1; then
        echo "dotnet runtime not found; installing via Homebrew..."
        if command -v brew >/dev/null 2>&1; then
          brew install --cask dotnet || brew install --cask dotnet-sdk || true
        else
          echo "Homebrew not found; please install dotnet runtime manually" >&2
        fi
      fi
      cat <<'EOF' | sudo tee "$install_to/sqlpackage" >/dev/null
#!/usr/bin/env bash
DIR="/usr/local/lib/sqlpackage"
exec dotnet "$DIR/sqlpackage.dll" "$@"
EOF
      sudo chmod +x "$install_to/sqlpackage"
      echo "sqlpackage wrapper created at $install_to/sqlpackage"
      exit 0
    fi
    echo "Failed to find sqlpackage executable or sqlpackage.dll after extraction." >&2
    exit 1
    ;;
  *)
    echo "Unsupported OS: $OS. Please install sqlpackage manually." >&2
    exit 1
    ;;
esac
