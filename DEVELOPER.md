DEVELOPER NOTES
================

Prerequisites / external binaries
--------------------------------
- `sqlcmd` — SQL execution helper (used by some scripts for applying SQL)
- `sqlpackage` — Microsoft tooling to Export/Import bacpac and Extract/Script databases
- `node` and `npm` — Node.js runtime and package manager

If you don't already have `sqlcmd` / `sqlpackage` on macOS or Linux, the repository includes helper installers:

- `scripts/install-sqlcmd.sh`
- `scripts/install-sqlpackage.sh`

Run those scripts to install the matching platform binaries (they download the official Microsoft packages).

Recommended Node version
------------------------
- Use Node 18+ (LTS). If you use `nvm`, run:

```bash
nvm install --lts
nvm use --lts
```

Getting started (project setup)
--------------------------------
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

DB helpers and Make targets
---------------------------
Scripts that work with Azure SQL live in the `scripts/` folder and produce artifacts under `db/`:

- `scripts/dump-schema.sh` → `db/schema.sql` (Make target: `make dump-schema`)
- `scripts/backup-db.sh` → `db/backup-<timestamp>.bacpac` (Make target: `make backup-db TARGET_DB=<name>`)
- `scripts/restore-db.sh` (Make target: `make restore-db BACPAC=<file> TARGET_DB=<name>`)

How the scripts read credentials
--------------------------------
- Primary source: the `.env.local` file's `DATABASE_ADO` value (ADO-style: `Data Source=...;Initial Catalog=...;User ID=...;Password=...`).
- For non-interactive runs you can export `SOURCE_USER` and `SOURCE_PASS` in your shell; the scripts will prefer those if present.
- The tools prefer SQL authentication (username/password). Integrated/Kerberos authentication can fail on macOS and in CI environments ("Cannot generate SSPI context"). When in doubt, use SQL auth.

Common commands
---------------
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

Notes and safety
----------------
- These operations are potentially destructive — restores can overwrite objects. Always take a bacpac backup before restoring to an existing database.
- If you need non-interactive CI usage, set `SOURCE_USER` and `SOURCE_PASS` and pass the `BACPAC`/`TARGET_DB` arguments; the scripts will run without interactive prompts where possible. If you want a `FORCE` flag added to skip confirmations, ask and I'll add it.
- If `dump-schema` generates a `:setvar DatabaseName` with a different name, inspect `db/schema.sql` before applying; during local testing the file may be patched to target `lodovico-test`.

Troubleshooting
---------------
- Authentication errors: prefer SQL auth (username/password). Integrated auth often fails outside Windows domain environments.
- Network/connectivity: ensure your client IP is allowed on the Azure SQL server firewall and port 1433 is reachable.
- `sqlpackage` incompatibilities: if a command fails, update to the latest `sqlpackage` (see `scripts/install-sqlpackage.sh`) or run the Extract→.dacpac→Script fallback used by `scripts/dump-schema.sh`.

Where outputs appear
--------------------
- Schema script: `db/schema.sql`
- Bacpac exports: `db/backup-<timestamp>.bacpac`

