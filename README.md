# me

## Project Overview
Personal website and AI-assisted portfolio for Lodovico Minnocci.

- Static frontend pages (home, auth, admin, experience/fit views)
- Azure Functions API (`api/`)
- PostgreSQL schema and seed files (`db/`)
- CI/CD workflows for deploy and database provisioning

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

Recommended:
- Azure CLI (`az`) for provisioning and infra operations
- GitHub CLI (`gh`) for workflow dispatch and PR automation
- `pdftotext` (from poppler) for spellcheck PDF extraction used in `make check`

macOS install example for `pdftotext`:
```bash
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

Provision Azure PostgreSQL via workflow:
- `.github/workflows/provision-postgres.yml`
- Trigger manually with `workflow_dispatch`
- Optional workflow inputs:
  - `apply_schema` (default `true`) to execute `db/schema.sql`
  - `apply_seed` (default `false`) to execute `db/seed.sql`

Default behavior is non-destructive for production usage.

Safety checks before running seed on any environment:
1. Confirm workflow target variables: `AZURE_PG_SERVER_NAME` and `database_name`.
2. Keep `apply_seed=false` unless you intentionally want to replace data.
3. If seeding, verify `db/seed.sql` includes destructive statements you expect (for this repo it uses `TRUNCATE ... RESTART IDENTITY CASCADE`).

Required GitHub repository variables/secrets for DB workflow:
- Vars: `AZURE_RESOURCE_GROUP`, `AZURE_LOCATION`, `AZURE_PG_SERVER_NAME`, `AZURE_PG_ADMIN_USER`
- Secrets: `AZURE_CREDENTIALS`, `AZURE_PG_ADMIN_PASSWORD`

## Deploy

Main deploy workflow:
- `.github/workflows/webapp.yml`

Trigger conditions:
- Manual `workflow_dispatch`

### Required GitHub secrets
- `AZURE_CREDENTIALS`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `ANTHROPIC_API_KEY`
- `DATABASE_URL`

### Required GitHub variables
- `AI_MODEL`
- `AZURE_RESOURCE_GROUP`
- `AZURE_STATIC_WEB_APP_NAME`
- `SITE_HOSTNAME`

Deployment workflow does:
- quality/security checks
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

- The deploy workflow currently targets the `ai-portfolio` branch.
- Local auth behavior uses SWA auth emulator flow and may differ from cloud login UX.
- If you see port/process issues locally, run `make stop` before `make start`.
