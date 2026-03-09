
# me: AI-Assisted Portfolio

## 1. Project Overview
Personal website and AI-assisted portfolio for Lodovico Minnocci.
- Static frontend pages (home, auth, admin, experience/fit views)
- Azure Functions API (`api/`)
- PostgreSQL schema and export files (`db/`)

## 2. Architecture & Visual Documentation

Mermaid diagrams are used for visual documentation. See:
- [README-db-schema.md](README-db-schema.md) for database schema (ERD)
- [README-api-flow.md](README-api-flow.md) for API flow diagrams

### Architecture Diagram
````mermaid
flowchart TD
  User -->|Browser| SWA[Azure Static Web Apps]
  SWA -->|API| Functions[Azure Functions]
  Functions -->|DB| Postgres[Azure PostgreSQL]
  Functions -->|AI| Anthropic[Claude API]
````

## 3. Prerequisites & Environment Setup

Required:
- Node.js 20+
- npm
- GNU Make
- PostgreSQL client tools (pg_dump, psql)

Recommended:
- Azure CLI (`az`)
- pdftotext (poppler)

macOS install example:
```bash
brew install postgresql
brew install poppler
```

### Environment setup
1. Copy `.env.example` values into your local environment file(s)
2. Copy `local.settings.example.json` to `local.settings.json`
3. Keep `local.settings.json` untracked
4. Set values: `ANTHROPIC_API_KEY`, `AI_MODEL`, `DATABASE_URL`

Example:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_MODEL=claude-sonnet-4-20250514
DATABASE_URL=postgresql://username:password@server.postgres.database.azure.com:5432/database?sslmode=require
```

## 4. Install & Build

Install dependencies:
```bash
make install
```
Build TypeScript frontend:
```bash
npm run build:ts
```
Typecheck only:
```bash
npm run typecheck
```

## 5. Run Locally

Start local stack:
```bash
make start
```
Stop local stack:
```bash
make stop
```
SWA local config: `swa-cli.config.json` (host `127.0.0.1`, port `4280`, API `7071`)

## 6. Quality Checks & Testing

Run all checks:
```bash
make check
```
Checks:
1. Spellcheck
2. TypeScript build
3. API JS syntax check
4. Config validation
5. API unit tests
6. Link check

Run API tests only:
```bash
cd api && npm test -- --runInBand
```
API tests include cache report and `is_cached` flag validation.

## 7. Database

Schema and export files:
- `db/schema.sql`
- `db/export.sql`

## 8. AI Response Cache

AI responses are cached in the PostgreSQL table `ai_response_cache` to avoid redundant AI calls and improve performance.
- `is_cached` flag indicates valid cache
- Cache invalidated after relevant data changes
- Records are never deleted
- Admin page includes Cache Report tab

### Example cache record
| Question         | Model                  | Cache Hits | Last Accessed         | Cached |
|------------------|------------------------|------------|-----------------------|--------|
| What is AI?      | claude-sonnet-4-20250514 | 5          | 2026-03-09T12:00:00Z | Yes    |
| What is ML?      | claude-sonnet-4-20250514 | 2          | 2026-03-09T11:00:00Z | No     |

## 9. Database Migration & Validation Workflow

Robust Makefile-based workflow for migration, schema validation, and rollback.

### Migration Workflow
1. Dump pre-migration schema: `make pre-migration-schema`
2. Apply migrations: `make migrate-db`
3. Dump post-migration schema: `make post-migration-schema`
4. Verify migration and rollback if mismatch: `make verify-migration`
- `verify-migration` compares schemas, ignores pg_dump metadata
- Automatic restore from latest backup on mismatch
- Drop database/schema before `make rollback-db` for destructive restores

### Database Operations
- Backup: `make backup-db`
- Profile data backup: `make profile-data-backup`
- Profile data upload: `make profile-data-upload`
- Deploy (all steps): `make deploy-db`

### Quality & Utility
- Schema validation: `make verify-schema`

## 10. Deploy

- Azure login
- Sync API app settings to Static Web App
- Deploy app + API
- Smoke test AAD login endpoint

## 11. Notes & Caveats

- Local auth uses SWA emulator flow
- Run `make stop` before `make start` if port/process issues

## 12. References

- [README-db-schema.md](README-db-schema.md): Database schema (ERD)
- [README-api-flow.md](README-api-flow.md): API flow diagrams
