# Scripts directory

This folder contains convenience scripts used for DB backups, schema dumps, exporting evals and other maintenance tasks. Review before removing.

Files:
- `backup-db.sh` — wrapper to export database backups (uses `AZURE_DATABASE_URL` or admin connection).
- `dump-schema.sh` — exports DB schema.
- `export-chat-cache-evals.js` — Node script that exports chat cache/evaluations to a file (uses `AZURE_DATABASE_URL`).
- `generate-ui-coverage-summary.js` — utility to aggregate coverage from UI runs.
- `gh-sync-env-to-gh.sh` — sync local env vars to GitHub repo secrets (use with care).
- `install-sqlcmd.sh` / `install-sqlpackage.sh` — helper installers for CI/dev.
- `prepare-swa-dist-local.sh` — prepares static web app distribution for local testing.
- `run-e2e.sh` / `run-sql-file.sh` / `restore-db.sh` — operational scripts used in local dev/CI.
- `update-default-data.js` / `update-default-data.sh` — seed/update default DB data.

Recommendations:
- Keep scripts that are actively used in CI or local workflows; otherwise, move to `archives/scripts/` or add documentation describing why they're kept.
- Add an explicit `README.md` (this file) to explain purpose — done.

History rewrite helper
- `prepare-history-rewrite.sh` — prepares a mirror clone and prints the `git-filter-repo` and `bfg` commands needed to remove large files from history. Use with extreme caution and coordinate with your team.
