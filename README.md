

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



## 13. Database Schema

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
    ...
  }
  experiences {
    id BIGINT PK
    candidate_id BIGINT FK
    company_name TEXT
    ...
  }
  skills {
    id BIGINT PK
    candidate_id BIGINT FK
    skill_name TEXT
    ...
  }
  gaps_weaknesses {
    id BIGINT PK
    candidate_id BIGINT FK
    gap_type TEXT
    ...
  }
  values_culture {
    id BIGINT PK
    candidate_id BIGINT FK
    must_haves TEXT[]
    ...
  }
  faq_responses {
    id BIGINT PK
    candidate_id BIGINT FK
    question TEXT
    ...
  }
  ai_instructions {
    id BIGINT PK
    candidate_id BIGINT FK
    instruction_type TEXT
    ...
  }
  ai_response_cache {
    hash TEXT PK
    question TEXT
    model TEXT
    response TEXT
    ...
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

## 14. API Flow Diagrams

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
  Frontend->>API: GET /api/admin/cache
  API->>DB: Query ai_response_cache
  DB-->>API: Return cache records
  API-->>Frontend: Return cache data
  Frontend-->>Admin: Display cache table
````

---

### API flows are now documented for quick reference and onboarding.
