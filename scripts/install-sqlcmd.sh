#!/usr/bin/env bash
set -euo pipefail

if command -v sqlcmd >/dev/null 2>&1; then
  echo "sqlcmd is already installed: $(command -v sqlcmd)"
  exit 0
fi

OS=$(uname -s)
case "$OS" in
  Linux)
    if command -v apt-get >/dev/null 2>&1; then
      echo "Detected Debian/Ubuntu. Installing msodbcsql17 and mssql-tools via apt"
      curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add - || true
      DIST=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
      RELEASE=$(lsb_release -rs)
      curl -sSL "https://packages.microsoft.com/config/${DIST}/${RELEASE}/prod.list" | sudo tee /etc/apt/sources.list.d/mssql-release.list >/dev/null
      sudo apt-get update
      sudo ACCEPT_EULA=Y apt-get install -y msodbcsql17 mssql-tools unixodbc-dev
      if [ -d /opt/mssql-tools/bin ]; then sudo ln -sf /opt/mssql-tools/bin/sqlcmd /usr/local/bin/sqlcmd || true; fi
      echo "sqlcmd installed via apt"
      exit 0
    elif command -v yum >/dev/null 2>&1 || command -v dnf >/dev/null 2>&1; then
      echo "Detected RHEL/CentOS. Installing msodbcsql17 and mssql-tools via yum/dnf"
      curl -sSL https://packages.microsoft.com/config/rhel/7/prod.repo | sudo tee /etc/yum.repos.d/msprod.repo >/dev/null
      if command -v yum >/dev/null 2>&1; then
        sudo yum install -y msodbcsql17 mssql-tools unixODBC-devel
      else
        sudo dnf install -y msodbcsql17 mssql-tools unixODBC-devel
      fi
      if [ -d /opt/mssql-tools/bin ]; then sudo ln -sf /opt/mssql-tools/bin/sqlcmd /usr/local/bin/sqlcmd || true; fi
      echo "sqlcmd installed via yum/dnf"
      exit 0
    else
      echo "Unsupported Linux package manager; please install sqlcmd manually"
      exit 1
    fi
    ;;
  Darwin)
    if command -v brew >/dev/null 2>&1; then
      echo "Homebrew found; installing msodbcsql17 and mssql-tools via brew"
      ACCEPT_EULA=Y brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release || true
      ACCEPT_EULA=Y brew update || true
      ACCEPT_EULA=Y brew install msodbcsql17 mssql-tools || { echo "brew install failed"; exit 1; }
      echo "sqlcmd installed via brew"
      exit 0
    else
      echo "Homebrew not found. Installing Homebrew via curl..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || { echo "Homebrew install failed; please install Homebrew manually"; exit 1; }
      if ! command -v brew >/dev/null 2>&1; then
        echo "brew not available after installation; please restart your shell and run 'make install-sqlcmd' again"
        exit 1
      fi
      ACCEPT_EULA=Y brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release || true
      ACCEPT_EULA=Y brew update || true
      ACCEPT_EULA=Y brew install msodbcsql17 mssql-tools || { echo "brew install failed"; exit 1; }
      echo "sqlcmd installed via Homebrew."
      exit 0
    fi
    ;;
  *)
    echo "Unsupported OS: ${OS}. Please install sqlcmd manually."
    exit 1
    ;;
esac
