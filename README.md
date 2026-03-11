

# me: AI-Assisted Portfolio

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Visual Documentation](#2-architecture--visual-documentation)
3. [Prerequisites & Environment Setup](#3-prerequisites--environment-setup)
4. [Install & Build](#4-install--build)
5. [Run Locally](#5-run-locally)
6. [Quality Checks & Testing](#6-quality-checks--testing)
7. [Database](#7-database)
8. [AI Response Cache](#8-ai-response-cache)
9. [Database Migration & Validation Workflow](#9-database-migration--validation-workflow)
10. [Deploy](#10-deploy)
11. [Notes & Caveats](#11-notes--caveats)
12. [Database Schema](#12-database-schema)
13. [API Flow Diagrams](#13-api-flow-diagrams)

## 1. Project Overview
Personal website and AI-assisted portfolio for Lodovico Minnocci. The site combines static marketing pages, an interactive admin surface for profile management, serverless API endpoints, and AI-assisted features powered by cached model responses.

Key features
- Key features

*Note: This project is Azure-centric — designed for deployment on Azure Static Web Apps with Azure PostgreSQL for persistence.*

- Static frontend: public pages including home, resume, experience, projects, and specialty AI-assisted views (`experience-ai`, `fit-ai`). These are located in the project root HTML and `assets/` for CSS/JS.

- Authentication: Azure Static Web Apps (SWA) authentication with provider integrations (AAD and other providers). Admin pages are protected and require sign-in.

- Admin panel: full profile editing (personal details, experiences, skills, gaps, values/culture, FAQ, AI instruction rules). Features include:
  - Draft autosave to `localStorage` and manual `Save All` to persist to the backend.
  - Client-side no-op save guard that avoids unnecessary POSTs when nothing changed.
  - Cache Report tab to inspect AI response cache and client-side filtering of the last-fetched report.
  - Cache Report: admin-only UI to view, refresh, and inspect AI response cache (calls `GET /api/cache-report`).

- AI/chat features: server endpoints that forward prompts to an AI model (configured via `ANTHROPIC_API_KEY`/`AI_MODEL`) and return responses to the frontend.
  - Responses are cached in PostgreSQL (`ai_response_cache`) to reduce model calls and improve latency.
  - Cache invalidation is triggered by profile changes in the admin panel and recorded with `invalidated_at` timestamps.

- Backend/API: Azure Functions (Node.js) under `api/` exposing endpoints for authentication (`/api/auth/*`), admin panel data (`/api/panel-data`), cache report (`/api/cache-report`), chat (`/api/chat`), health checks, and other utilities.

- Database: PostgreSQL schema and migration files in `db/` and `migrations/`. The project includes Makefile targets and utilities to backup, migrate, and verify schema changes.

- Observability & testing: lightweight request tracing helpers in `api/_shared/observability`, unit tests under `api/__tests__`, and CI checks in the repository's workflows.

Deployment & development
- Local development: `make start` brings up the local stack; `swa` emulator settings found in `swa-cli.config.json` and `local.settings.example.json` for Functions runtime.
- Build: frontend TypeScript and asset build via `npm run build` (and `npm run build:ts`).
- CI/CD: GitHub Actions workflow (webapp.yml) builds and deploys the static site and functions to Azure Static Web Apps.

Find the admin client code in `assets/js/admin.js`, server handlers under `api/`, and database objects in `db/`.

## 2. Architecture & Visual Documentation

Mermaid diagrams are embedded in this README for quick reference (ERD and API flows).

### Architecture Diagram
````mermaid
flowchart TD
  User -->|Browser| SWA[Azure Static Web Apps]
  SWA -->|API| Functions[Azure Functions]
  Functions -->|DB| Postgres[Azure PostgreSQL]
  Functions -->|AI| Anthropic[Claude API]
````

### Function Routes

````mermaid
flowchart LR
  subgraph Static
    A[index.html]
    B[admin.html]
  end

  subgraph API[Azure Functions]
    P1["/api/panel-data<br/>(api/admin/index.js)"]
    P2["/api/cache-report<br/>(api/cache-report/index.js)"]
    P3["/api/chat<br/>(api/chat/index.js)"]
    P4["/api/auth/*<br/>(api/auth/index.js)"]
    P5["/api/health<br/>(api/health/index.js)"]
  end

  A -->|auth| API
  B -->|admin| P1
  B -->|cache UI| P2
  A -->|chat| P3
  P1 --> Postgres
  P2 --> Postgres
  P3 --> Anthropic
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
Build frontend assets (TypeScript):
```bash
make build-ui
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
Run the full quality pipeline that the project uses:

```bash
make check
```

What `make check` runs:

- **Spellcheck**: runs `cspell` and a PDF text extraction helper (via `spellcheck` target).
- **Build UI**: compiles frontend TypeScript assets (`make build-ui`).
- **API unit tests**: runs Jest tests under `api/` (`make unit-test` or `cd api && npm test -- --runInBand`).
- **Link check**: validates internal links with `linkinator` (`make link-check`).

Run individual checks:

```bash
make spellcheck
make build-ui
make unit-test
make link-check
```

API tests include cache report and `is_cached` flag validation.

## 7. Database

Schema and export files:
- `db/schema.sql`

## 8. AI Response Cache

AI responses are cached in the PostgreSQL table `ai_response_cache` to avoid redundant AI calls and improve performance.
- `is_cached` flag indicates valid cache
- Cache invalidated after relevant data changes
- Records are never deleted
- Admin page includes Cache Report tab

### Example cache record
The `ai_response_cache` table stores cached AI responses and metadata. Columns:

- `hash` (TEXT, PK): deterministic hash key for the request/response pair.
- `question` (TEXT): the user prompt or question cached.
- `model` (TEXT): model identifier used for the response (e.g., `claude-sonnet-4-20250514`).
- `response` (TEXT): the model's response (stored but not shown in the admin cache table by default).
- `cache_hit_count` (INTEGER): number of times this cached response was used.
- `last_accessed` (TIMESTAMPTZ): most recent timestamp the cache entry was read.
- `updated_at` (TIMESTAMPTZ): last time the cache row was written/updated.
- `invalidated_at` (TIMESTAMPTZ, nullable): timestamp when the cache was invalidated (set when related profile data changed).
- `is_cached` (BOOLEAN): whether the entry is currently considered valid (true) or hidden/invalidated (false).

Admin Cache Report shows a subset of these fields (question, model, cache hits, last accessed, invalidated at, and hidden state). Example:

| Question | Model | Cache Hits | Last Accessed | Updated At | Invalidated At | Cached? |
|---|---:|---:|---|---|---|---|
| What is AI? | claude-sonnet-4-20250514 | 5 | 2026-03-09T12:00:00Z | 2026-03-09T12:00:00Z |  | Yes |
| What is ML? | claude-sonnet-4-20250514 | 2 | 2026-03-09T11:00:00Z | 2026-03-09T11:00:00Z | 2026-03-10T09:00:00Z | No |

## 9. Database Migration & Validation Workflow

Robust Makefile-based workflow for migration, schema validation, and rollback.

### Migration Workflow
1. Dump pre-migration schema: `make pre-migration-schema`
2. Apply migrations: `make migrate-db`
3. Dump post-migration schema: `make post-migration-schema`
4. Verify migration: `make verify-migration` (compares pre/post schemas and rolls back on mismatch)

Notes:

- `verify-migration` compares schemas while ignoring pg_dump metadata (comments, connection headers, etc.).
- If a schema mismatch is detected, `verify-migration` will invoke `make rollback-db` to restore from the most recent backup.
- Always create a backup before running migrations: `make backup-db`.

### Database Operations
- Backup: `make backup-db`
- Profile data backup: `make profile-data-backup`
- Profile data upload: `make profile-data-upload`
- Deploy (all steps): `make deploy-db`

### Quality & Utility
- Schema validation: `make verify-schema`

## 10. Deploy
Deployment workflow (CI/CD)

- Runs checks (`make check`): spellcheck, frontend build, API tests, link checks.
- Builds frontend assets (TypeScript) and bundles static files.
- Builds/packages Azure Functions (Oryx/runtime) and uploads them to the Static Web App.
- Deploys the static site and function app together so the site and APIs remain in sync.

## 11. Notes & Caveats

- Local auth uses SWA emulator flow
- Run `make stop` before `make start` if port/process issues

## 12. Database Schema

### Entity Relationship Diagram (ERD)

````mermaid
erDiagram
  candidate_profile ||--o{ experiences : has
  candidate_profile ||--o{ skills : has
  candidate_profile ||--o{ gaps_weaknesses : has
  candidate_profile ||--o{ values_culture : has
  candidate_profile ||--o{ faq_responses : has
  candidate_profile ||--o{ ai_instructions : has
  ai_response_cache }|..|{ candidate_profile : cache_for

  candidate_profile {
    id BIGINT PK
    name TEXT
    email TEXT
    %% additional fields omitted
  }
  experiences {
    id BIGINT PK
    candidate_id BIGINT FK
    company_name TEXT
    %% additional fields omitted
  }
  skills {
    id BIGINT PK
    candidate_id BIGINT FK
    skill_name TEXT
    %% additional fields omitted
  }
  gaps_weaknesses {
    id BIGINT PK
    candidate_id BIGINT FK
    gap_type TEXT
    %% additional fields omitted
  }
  values_culture {
    id BIGINT PK
    candidate_id BIGINT FK
    must_haves TEXT[]
    %% additional fields omitted
  }
  faq_responses {
    id BIGINT PK
    candidate_id BIGINT FK
    question TEXT
    %% additional fields omitted
  }
  ai_instructions {
    id BIGINT PK
    candidate_id BIGINT FK
    instruction_type TEXT
    %% additional fields omitted
  }
  ai_response_cache {
    hash TEXT PK
    question TEXT
    model TEXT
    response TEXT
    %% additional fields omitted
  }
````

### Table Definitions

- **candidate_profile**: Main candidate record, personal and professional info
- **experiences**: Work history, achievements, challenges
- **skills**: Skills, category, rating, evidence
- **gaps_weaknesses**: Gaps, weaknesses, learning interests
- **values_culture**: Values, dealbreakers, preferences
- **faq_responses**: FAQ answers, common questions
- **ai_instructions**: AI prompt instructions, tone, honesty, boundaries
- **ai_response_cache**: AI response cache, keyed by hash, question, model

---

### Schema is now documented for quick reference and onboarding.

## 13. API Flow Diagrams

### Chat API Flow

````mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant API
  participant DB
  participant AI

  User->>Frontend: Submit question
  Frontend->>API: POST /api/chat {message}
  API->>DB: Check ai_response_cache (hash, is_cached)
  DB-->>API: Return cached response (if found)
  API-->>Frontend: Return cached response
  Frontend-->>User: Show cached response
  API->>AI: Call AI model (if not cached)
  AI-->>API: Return AI response
  API->>DB: Insert/Update ai_response_cache
  API-->>Frontend: Return AI response
  Frontend-->>User: Show AI response
````

### Admin Cache Report Flow

````mermaid
sequenceDiagram
  participant Admin
  participant Frontend
  participant API
  participant DB

  Admin->>Frontend: Open Cache Report
  Frontend->>API: GET /api/cache-report
  API->>DB: Query ai_response_cache
  DB-->>API: Return cache records
  API-->>Frontend: Return cache data
  Frontend-->>Admin: Display cache table (client-side filter)
````

---