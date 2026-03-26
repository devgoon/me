DEVELOPER NOTES
================

Required external binaries
-------------------------
- `psql` (Postgres client)
- `pg_dump` (Postgres backup)
- `lsof` (process/port checks)
- `node` and `npm` (Node.js runtime and package manager)

Recommended Node version
------------------------
- Use Node 18+ (LTS) for compatibility with dev tools.

Local developer tooling (installed as devDependencies)
--------------------------------------------------
The project uses local dev tools (installed via `npm install`) for reproducible commands invoked with `npx`:

- `eslint` — linting
- `cspell` — spellcheck
- `linkinator` — link checker
- `azurite` — local Azure storage emulator
- `@azure/static-web-apps-cli` — Static Web Apps CLI (SWA)
- `jest` / `jest-environment-jsdom` — unit tests

Uninstall global versions (optional but recommended)
------------------------------------------------
If you previously installed any of these tools globally, uninstall them to avoid PATH precedence issues:

```bash
npm uninstall -g eslint cspell linkinator azurite @azure/static-web-apps-cli jest
```

Install project dependencies and run checks
-----------------------------------------
```bash
npm install
cd api && npm install
make doctor    # verify required binaries are present
make check     # run lint, spellcheck, tests, link checks
```

If you need to run the SWA emulator locally:

```bash
make start
```

Backup & restore
----------------
Use `make backup-db` to create a `db/export.sql` dump (plain format). Test restores regularly with `psql`/`pg_restore` as appropriate.
