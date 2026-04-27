# Remove `.bacpac` (or other large files) from branch history

This file shows two safe ways to remove a large file (for example `db/backup-20260424094440.bacpac`) from the git history on the branch `feature/react`. Both approaches rewrite history and require coordination with other contributors.

Important notes before proceeding:
- Back up your repo (or work on a mirror clone). Rewriting history is destructive.
- After force-pushing the rewritten history, all collaborators must reclone or follow the recovery steps.
- Rotate any secrets that were exposed in history.

Option A — Using `git-filter-repo` (recommended)

1. Create a mirror clone (safe working copy):

```bash
git clone --mirror git@github.com:devgoon/me.git me-repo.git
cd me-repo.git
```

2. Remove the specific path from history (example):

```bash
git filter-repo --force --invert-paths --paths db/backup-20260424094440.bacpac --refs refs/heads/feature/react
```

3. Cleanup and push the rewritten branch back to origin:

```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force origin refs/heads/feature/react
```

Option B — Using BFG Repo-Cleaner (easier for simple deletions)

1. Mirror clone and run BFG:

```bash
git clone --mirror git@github.com:devgoon/me.git
cd me.git
bfg --delete-files "*.bacpac" --replace-text passwords.txt
```

2. Clean and push:

```bash
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

If you only want to operate on `feature/react`, limit refs or push only that branch after cleaning.

Archiving the files before removal (recommended)

From your working tree (on the branch that contains the large files):

```bash
# create archives dir
mkdir -p archives
# collect backups into a zip (adjust pattern as needed)
zip -r archives/db-backups.zip db/*.bacpac
# verify contents
unzip -l archives/db-backups.zip
```

Then add `archives/` to `.gitignore` (the repo already ignores `archives/`). Commit the zip if you want it in history (not recommended) or keep it externally (recommended).

Recovery for collaborators after a force-push

- Everyone should run:

```bash
git fetch origin
git checkout feature/react
git reset --hard origin/feature/react
```

or reclone the repository.

If you'd like, I can produce the exact commands tailored to your environment and create the `archives/db-backups.zip` locally if the `.bacpac` file exists in your working tree.
