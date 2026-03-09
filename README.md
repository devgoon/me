## Database Schema & API Flow

See README-db-schema.md for a comprehensive database schema (ERD).
See README-api-flow.md for API flow diagrams for chat and admin cache reporting.
# me

## Project Overview
Personal website and AI-assisted portfolio for Lodovico Minnocci.

- Static frontend pages (home, auth, admin, experience/fit views)
- Azure Functions API (`api/`)
- PostgreSQL schema and seed files (`db/`)

## Architecture

````mermaid
flowchart TD
  User -->|Browser| SWA[Azure Static Web Apps]
  SWA -->|API| Functions[Azure Functions]
  Functions -->|DB| Postgres[Azure PostgreSQL]
  Functions -->|AI| Anthropic[Claude API]
````

SWA = Azure Static Web Apps, a Microsoft service for hosting static sites and serverless APIs.

## Visual Documentation with Mermaid

You can use Mermaid diagrams in markdown to visually document architecture, workflows, and API flows. GitHub and VS Code support Mermaid syntax for rendering charts.

### Sequence Diagram Example

````mermaid
sequenceDiagram
  participant User
  participant SWA
  participant API
  participant DB
  participant AI

  User->>SWA: Request /chat
  SWA->>API: Forward request
  API->>DB: Check cache
  API->>AI: Call AI (if cache miss)
  AI-->>API: Return response
  API->>DB: Store in cache
  API-->>SWA: Return answer
  SWA-->>User: Show response
````

## Prerequisites & Environment Setup

Required:
- Node.js 20+
- npm
- GNU Make
- PostgreSQL client tools (for pg_dump, psql)

Recommended:
- Azure CLI (`az`) for provisioning and infra operations
- `pdftotext` (from poppler) for spellcheck PDF extraction used in `make check`

macOS install example for PostgreSQL client tools and pdftotext:
```bash
brew install postgresql
brew install poppler
```

### Environment setup

1. Copy `.env.example` values into your local environment file(s) used by SWA/Functions.
2. Copy `local.settings.example.json` to `local.settings.json` for local Functions runtime values.
3. Keep `local.settings.json` untracked (it is gitignored) and store only placeholders in committed files.
4. Set values:
   - `ANTHROPIC_API_KEY`
   - `AI_MODEL`
   - `DATABASE_URL`

Example from `.env.example`:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_MODEL=claude-sonnet-4-20250514
DATABASE_URL=postgresql://username:password@server.postgres.database.azure.com:5432/database?sslmode=require
```

## Install & Build

Install dependencies:
```bash
make install
```

TypeScript frontend build:
```bash
npm run build:ts
```

Typecheck only:
```bash
npm run typecheck
```

## Run Locally

Start local stack (SWA + Functions + Azurite):
```bash
make start
```

Stop local stack:
```bash
make stop
```

SWA local config is in `swa-cli.config.json` (`me-local`, host `127.0.0.1`, port `4280`, API `7071`).

## Quality Checks & Testing

Run all checks:
```bash
make check
```

Current staged checks:
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

API tests include validation of the cache report and the `is_cached` flag.

## Database

Schema and seed files:
- `db/schema.sql`
- `db/seed.sql`


## Deploy

- Azure login
- sync API app settings to Static Web App
- deploy app + API
- smoke test AAD login endpoint

## AI Response Cache

The AI response cache is stored in the PostgreSQL table `ai_response_cache`. Each entry is keyed by a hash of the AI model and question. The cache is used to avoid redundant AI calls and improve performance.

- The `is_cached` flag indicates whether a record is valid for cache lookup.
- When relevant data changes (profile, experience, skills, gaps, values, FAQ, AI instructions), all cache records are invalidated by setting `is_cached = FALSE`.
- Records are never deleted, so all questions and responses are available for reporting.
- The admin page includes a Cache Report tab showing questions, models, cache hits, last accessed, and cached status.

### Example cache record
| Question         | Model                  | Cache Hits | Last Accessed         | Cached |
|------------------|------------------------|------------|-----------------------|--------|
| What is AI?      | claude-sonnet-4-20250514 | 5          | 2026-03-09T12:00:00Z | Yes    |
| What is ML?      | claude-sonnet-4-20250514 | 2          | 2026-03-09T11:00:00Z | No     |

## Notes & Caveats

- Local auth behavior uses SWA auth emulator flow and may differ from cloud login UX.
- If you see port/process issues locally, run `make stop` before `make start`.

## Database Migration & Validation Workflow

This project uses a robust Makefile-based workflow for database migration, schema validation, and automated rollback.

### Migration Workflow

1. **Dump pre-migration schema**
   ```bash
   make pre-migration-schema
   ```
2. **Apply migrations**
   ```bash
   make migrate-db
   ```
3. **Dump post-migration schema**
   ```bash
   make post-migration-schema
   ```
4. **Verify migration and rollback if mismatch**
   ```bash
   make verify-migration
   ```

- `verify-migration` compares pre- and post-migration schemas, ignoring pg_dump metadata and focusing on structural SQL.
- If a mismatch is detected, the database is automatically restored from the latest backup.
- For destructive restores, drop the database or schema before running `make rollback-db`.

### Database Operations

- **Backup database:**
  ```bash
  make backup-db
  ```
- **Profile data backup:**
  ```bash
  make profile-data-backup
  ```
- **Profile data upload:**
  ```bash
  make profile-data-upload
  ```
- **Deploy database (all steps):**
  ```bash
  make deploy-db
  ```

### Quality & Utility

- **Schema validation against canonical schema:**
  ```bash
  make verify-schema
  ```

### Makefile Organization

The Makefile is organized into:
- Automated Migration Validation & Rollback
- Database Operations
- Migration Workflow
- Quality & Utility
- Local Development

See comments in the Makefile for details and usage examples.
