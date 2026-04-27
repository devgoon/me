# Removing large files from git history

This document describes options to remove large or sensitive files (for example: `.bacpac`, archived `coverage` outputs) from repository history.

Important: rewriting history is destructive for shared branches. Coordinate with your team and prefer creating a fresh branch or recloning after the rewrite.

Recommended approaches:

1) BFG Repo-Cleaner (easier)
- Install: `brew install bfg` or download from https://rtyley.github.io/bfg-repo-cleaner/
- Example: remove all `.bacpac` files and `coverage` zips

```bash
# make a mirror clone
git clone --mirror git@github.com:devgoon/me.git
cd me.git
# remove files by name
bfg --delete-files "*.bacpac" --delete-folders "coverage" --delete-files "lcov.info"
# cleanup and push
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

2) git-filter-repo (recommended for fine-grained control)
- Install: `brew install git-filter-repo` or follow https://github.com/newren/git-filter-repo
- Example: remove a specific file path

```bash
git clone --mirror git@github.com:devgoon/me.git
cd me.git
git filter-repo --invert-paths --paths db/backup-20260424094440.bacpac
# push back
git push --force
```

3) If you need to keep a copy, archive the files first (outside the repo) and add them to `.gitignore`.

Checklist before rewrite:
- [ ] Notify team and freeze merges to the branch being rewritten
- [ ] Backup current repo and any important tags
- [ ] Rotate any secrets that were checked in
- [ ] After rewrite, all contributors must reclone or run the recommended recovery steps

If you'd like, I can prepare the exact commands for the branch `feature/react` and create a backup archive of large files in `archives/` (locally).
