#!/usr/bin/env bash
set -euo pipefail

# prepare-history-rewrite.sh
# Safe helper to prepare a mirror clone and show / run commands to remove large files
# Usage: ./prepare-history-rewrite.sh --repo git@github.com:devgoon/me.git --branch feature/react --paths "db/backup-20260424094440.bacpac" [--run]

print_usage() {
  cat <<'USAGE'
prepare-history-rewrite.sh --repo <repo-url> --branch <branch> --paths "path1 path2" [--run]

Options:
  --repo   remote repo URL (SSH or HTTPS)
  --branch branch to rewrite (e.g. feature/react)
  --paths  space-separated file paths to remove from history (quoted)
  --run    actually run the filter command (dangerous) - without this flag the script only prints commands

Example:
  ./prepare-history-rewrite.sh --repo git@github.com:devgoon/me.git --branch feature/react --paths "db/backup-20260424094440.bacpac" --run
USAGE
}

if [ "$#" -eq 0 ]; then
  print_usage
  exit 1
fi

REPO_URL=""
BRANCH=""
PATHS=""
DO_RUN=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --repo)
      REPO_URL="$2"; shift 2;;
    --branch)
      BRANCH="$2"; shift 2;;
    --paths)
      PATHS="$2"; shift 2;;
    --run)
      DO_RUN=1; shift;;
    -h|--help)
      print_usage; exit 0;;
    *)
      echo "Unknown arg: $1"; print_usage; exit 1;;
  esac
done

if [ -z "$REPO_URL" ] || [ -z "$BRANCH" ] || [ -z "$PATHS" ]; then
  echo "Missing required args"; print_usage; exit 1
fi

MIRROR_DIR="$(mktemp -d)/me-repo.git"
echo "Creating mirror clone in $MIRROR_DIR"
git clone --mirror "$REPO_URL" "$MIRROR_DIR"
cd "$MIRROR_DIR"

echo "Prepared mirror clone. The following commands will rewrite history to remove paths: $PATHS"

echo
echo "=== git-filter-repo (recommended) ==="
echo "# Install git-filter-repo if needed: https://github.com/newren/git-filter-repo"
IFS=' ' read -r -a ARR <<< "$PATHS"
CMD="git filter-repo --force"
for p in "${ARR[@]}"; do
  CMD="$CMD --invert-paths --paths $p"
done
CMD="$CMD --refs refs/heads/$BRANCH"
echo "$CMD"
echo

echo "=== BFG (alternative) ==="
echo "# Install BFG: https://rtyley.github.io/bfg-repo-cleaner/"
echo "bfg --delete-files '$(echo "$PATHS" | sed 's/ /'" -or "'/g')'"
echo

if [ $DO_RUN -eq 1 ]; then
  echo "Running git-filter-repo now (destructive). Proceed? (type 'yes' to continue)"
  read -r CONFIRM
  if [ "$CONFIRM" = "yes" ]; then
    echo "Executing: $CMD"
    eval $CMD
    echo "Cleaning refs and GC"
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    echo "Done. You must force-push the rewritten branch to origin manually from this mirror when ready."
    echo "Example: git push --force origin refs/heads/$BRANCH"
  else
    echo "Aborting run. No changes made."
  fi
else
  echo "Dry run: no destructive commands executed. Re-run with --run to perform rewrite (not recommended without coordination)."
fi

echo "Mirror clone kept at: $MIRROR_DIR"
echo "When finished you may remove the mirror by deleting the directory."
