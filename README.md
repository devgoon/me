
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
Personal website and AI-assisted portfolio for Lodovico Minnocci. Combines static marketing pages, an interactive admin panel, serverless API endpoints, and AI-powered features.

**Key features:**

*Note: This project is Azure-centric — designed for deployment on Azure Static Web Apps with Azure PostgreSQL for persistence.*


- **Static frontend:** Public pages (home, resume, experience, projects, AI-assisted views) in root HTML and `assets/` for CSS/JS. Source: `src/ui/`, output: `assets/js/` (not versioned).
- **Authentication:** Azure Static Web Apps (SWA) auth with AAD and other providers. Admin pages require sign-in.
- **Admin panel:** Full profile editing, autosave, manual save, cache report, and change tracking.
- **AI/chat features:** API endpoints forward prompts to an AI model (Claude, etc.), cache responses in PostgreSQL, and support cache invalidation on profile/model changes.
- **Backend/API:** Azure Functions (Node.js, TypeScript) in `src/api/`, built to `api/`. Endpoints: auth, admin data, cache report, chat, health, etc.
- **Database:** PostgreSQL schema and migrations in `db/` and `migrations/`. Makefile targets for backup, migration, and validation.

**Find the admin client source in `src/ui/admin.ts` (compiled to `assets/js/admin.js`), API handlers in `src/api/`, and database objects in `db/`.**
  - Cache invalidation is triggered by profile changes in the admin panel or changes to the AI Model and recorded with `invalidated_at` timestamps.

- Backend/API: Azure Functions (Node.js) under `api/` exposing endpoints for authentication (`/api/auth/*`), admin panel data (`/api/panel-data`), cache report (`/api/cache-report`), chat (`/api/chat`), health checks, and other utilities.

- Database: PostgreSQL schema and migration files in `db/` and `migrations/`. The project includes Makefile targets and utilities to backup, migrate, and verify schema changes.



**Development & deployment:**
- Local: `make start` launches the stack (see `swa-cli.config.json` for emulator settings).
- Build: `make build-ui` (frontend), `make build-api` (API), or `make build` (both). Output: `assets/js/` and `api/`.
- CI/CD: GitHub Actions workflow builds and deploys static site and API to Azure Static Web Apps. All build output is generated at deploy time.

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
- Azure subscription (for deployment and cloud resources)
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
1. Copy `.env.local.example` to `.env.local` and fill in all required values (DO NOT commit `.env.local`).
2. Optionally copy `local.settings.example.json` to `local.settings.json` for Functions defaults — remove secrets before committing.


**Required environment keys in `.env.local`:**

- `FUNCTIONS_WORKER_RUNTIME` — must be `node` (required by Azure Functions)
- `AzureWebJobsStorage` — local or Azure storage connection string (e.g., `UseDevelopmentStorage=true` for local dev)
- `ANTHROPIC_API_KEY` — your Anthropic API key (required for AI features)
- `DATABASE_URL` — PostgreSQL connection string (required for all data features)
- `AI_MODEL` — AI model name (e.g., `claude-sonnet-4-20250514`)

**Required GitHub Actions secrets and variables for CI/CD:**

- `ANTHROPIC_API_KEY` (Secret) — Anthropic API key for deploy job
- `DATABASE_URL` (Secret) — PostgreSQL connection string for deploy job
- `AZURE_STATIC_WEB_APPS_API_TOKEN` (Secret) — Azure Static Web Apps deploy token
- `AI_MODEL` (Variable) — AI model name
- `AZURE_RESOURCE_GROUP` (Variable) — Azure resource group name
- `SITE_HOSTNAME` (Variable) — Site hostname (e.g., `lodovi.co`)
- `AZURE_STATIC_WEB_APP_NAME` (Variable) — Azure Static Web App name



## 4. Install & Build

Install dependencies:
```bash
make install
```
Build all assets (UI & API):
```bash
make build
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
Run the full quality pipeline:

```bash
make check
```

This runs:
- **Spellcheck:** `cspell` and PDF text extraction
- **API unit tests:** Jest tests in `src/api/__tests__/`
- **Link check:** Validates internal links with `linkinator`

Build separately with:
```bash
make build
```
Or run individual steps:
```bash
make spellcheck
make build-ui
make build-api
make unit-test
make link-check
```

## 7. Database

Schema and export files:
- `db/schema.sql`

## 8. AI Response Cache

AI responses are cached in the PostgreSQL table `ai_response_cache` to avoid redundant AI calls and improve performance. The admin panel includes a Cache Report tab for inspection and management.

Key columns:
- `hash` (PK): deterministic hash key
- `question`, `model`, `response`, `cache_hit_count`, `last_accessed`, `updated_at`, `invalidated_at`, `is_cached`

Example:

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
 - Running locally is not fully functional: the SWA emulator does not fully mimic provider auth flows (AAD, social providers) and some authenticated API behavior may differ from a deployed Azure environment. For full auth behavior deploy to Azure Static Web Apps.

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