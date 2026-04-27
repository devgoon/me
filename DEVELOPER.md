# DEVELOPER NOTES

## Prerequisites / external binaries

- `sqlcmd` — SQL execution helper (used by some scripts for applying SQL)
- `sqlpackage` — Microsoft tooling to Export/Import bacpac and Extract/Script databases
- `node` and `npm` — Node.js runtime and package manager

If you don't already have `sqlcmd` / `sqlpackage` on macOS or Linux, the repository includes helper installers:

- `scripts/install-sqlcmd.sh`
- `scripts/install-sqlpackage.sh`

Run those scripts to install the matching platform binaries (they download the official Microsoft packages).

## Recommended Node version

- Use Node 22+ (LTS). If you use `nvm`, run:

```bash
nvm install 22
nvm use 22
```

## Getting started (project setup)

1. Install Node dependencies:

```bash
make install
```

2. Create your local environment file from the example and update connection details:

```bash
cp .env.local.example .env.local
# edit .env.local and set DATABASE_ADO (ADO-style connection string)
```

3. Run the standard checks and tests:

```bash
make check     # spellcheck, lint, unit tests, link check, coverage
```

4. Run the local frontend/static site during development:

```bash
make start
```

## Prompt eval workflow

Use these commands to validate prompt/output quality for both fit and chat behavior.

- Run the full eval pipeline via Make:

```bash
make evals
```

- Equivalent npm commands:

```bash
npm run test:evals
```

- Export draft chat eval cases from historical cache rows in `ai_response_cache`:

```bash
npm run evals:export:chat-cache -- --limit 100 --min-hits 1
```

- Output file for generated draft cases:

  - `tests/evals/fixtures/chat-eval-cases.generated.json`

- Notes:
  - Generated cases are draft fixtures; review them before using in CI policy checks.
  - The export script includes basic redaction for email, phone-like strings, and URLs.

## DB helpers and Make targets

Scripts that work with Azure SQL live in the `scripts/` folder and produce artifacts under `db/`:

- `scripts/dump-schema.sh` → `db/schema.sql` (Make target: `make dump-schema`)
- `scripts/backup-db.sh` → `db/backup-<timestamp>.bacpac` (Make target: `make backup-db TARGET_DB=<name>`)
- `scripts/restore-db.sh` (Make target: `make restore-db BACPAC=<file> TARGET_DB=<name>`)

## How the scripts read credentials

- Primary source: the `.env.local` file's `DATABASE_ADO` value (ADO-style: `Data Source=...;Initial Catalog=...;User ID=...;Password=...`).
- For non-interactive runs you can export `SOURCE_USER` and `SOURCE_PASS` in your shell; the scripts will prefer those if present.
- The tools prefer SQL authentication (username/password). Integrated/Kerberos authentication can fail on macOS and in CI environments ("Cannot generate SSPI context"). When in doubt, use SQL auth.

## Common commands

Dump current schema to `db/schema.sql`:

```bash
make dump-schema
```

Export a bacpac for `lodovico` (will prompt for confirmation):

```bash
make backup-db TARGET_DB=lodovico
```

Restore a bacpac into `lodovico-test` (will prompt for confirmation and may prompt for password unless `SOURCE_USER`/`SOURCE_PASS` are set):

```bash
make restore-db BACPAC=db/backup-20260329200807.bacpac TARGET_DB=lodovico-test
```

## Notes and safety

- These operations are potentially destructive — restores can overwrite objects. Always take a bacpac backup before restoring to an existing database.
- If you need non-interactive CI usage, set `SOURCE_USER` and `SOURCE_PASS` and pass the `BACPAC`/`TARGET_DB` arguments; the scripts will run without interactive prompts where possible. If you want a `FORCE` flag added to skip confirmations, ask and I'll add it.
- If `dump-schema` generates a `:setvar DatabaseName` with a different name, inspect `db/schema.sql` before applying; during local testing the file may be patched to target `lodovico-test`.

## Troubleshooting

- Authentication errors: prefer SQL auth (username/password). Integrated auth often fails outside Windows domain environments.
- Network/connectivity: ensure your client IP is allowed on the Azure SQL server firewall and port 1433 is reachable.
- `sqlpackage` incompatibilities: if a command fails, update to the latest `sqlpackage` (see `scripts/install-sqlpackage.sh`) or run the Extract→.dacpac→Script fallback used by `scripts/dump-schema.sh`.

## Where outputs appear

- Schema script: `db/schema.sql`
- Bacpac exports: `db/backup-<timestamp>.bacpac`

## GitHub secrets sync

You can synchronize local environment keys into GitHub repository Secrets and Variables using the helper script `scripts/gh-sync-env-to-gh.sh`.

- Purpose: read a dotenv-style file (default: `.env.local`) and create/update GitHub Secrets or Repository Variables for the current repo.
- Rule-of-thumb: keys containing `SECRET`, `TOKEN`, `PASSWORD`/`PASS`, `KEY`, or `API` are created as GitHub Secrets; other keys become GitHub Variables. The script prints which class it will create for each key and supports a `--dry-run` mode.
- Basic usage / dry-run:

```bash
./scripts/gh-sync-env-to-gh.sh --env-file .env.local --repo owner/repo --dry-run
```

- Create/update interactively:

```bash
./scripts/gh-sync-env-to-gh.sh --env-file .env.local --repo owner/repo
```

- Non-interactive (CI):

```bash
./scripts/gh-sync-env-to-gh.sh --env-file .env.local --repo owner/repo --force
```

- Notes:
  - The script requires the `gh` CLI to be installed and authenticated with permissions to modify repository Secrets/Variables.
  - Always run with `--dry-run` first to verify which keys will become Secrets vs Variables.

## Make target

- `make gh-sync-env REPO=owner/repo ENV_FILE=.env.local` — interactive wrapper that prompts before running the sync script.
  - Example:

```bash
make gh-sync-env REPO=devgoon/me ENV_FILE=.env.local
```

## End-to-end tests (E2E)

- Run the full Playwright e2e suite locally (starts the local app stack):

```bash
make e2e
```

## UI tests (Vitest)

- Run the repository-level UI tests (uses `vite.config.ui.js` and the frontend's devDependencies):

```bash
npm run test:ui
```

- The `Makefile` `unit-test` target now calls the repo `test:ui` script; running `make unit-test` will run evals, UI tests (with coverage) and API tests.

- Note: the old `frontend-react/tests-react` bridge approach has been removed — if you need to run frontend tests from the `frontend-react` package directly, use the package's local scripts or re-create a bridge as needed.

- Run tests against a deployed preview (do NOT start the local stack):

```bash
# preferred: set HOST (CI uses this) or BASE_URL
HOST=preview-app-name.azurestaticapps.net make e2e
# or
BASE_URL=https://preview.example.com make e2e
```

- Notes:

  - `make e2e` will start the local SWA emulator and Azurite when no `BASE_URL`/`HOST` is provided. Ensure `nc` (netcat) is installed and `.env.local` contains any required storage settings (for example `AzureWebJobsStorage=UseDevelopmentStorage=true`) when running locally.
  - In CI the deployment workflow sets `HOST`/`BASE_URL` after a successful deploy and the e2e job runs against the deployed site. The standalone e2e workflow has been removed so e2e only runs post-deploy (not on PRs/branch pushes).

- The Make target will attempt to detect the repo if `REPO=` is not supplied, and it requires you to type `yes` to proceed.
