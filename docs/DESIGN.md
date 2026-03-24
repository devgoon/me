## Design Overview

**Purpose:** Describe the high-level architecture, data flows, security and operational considerations for the `me` site, focusing on LLM integration, prompt centralization, caching, and CI quality gates.

**Scope:** frontend static site + Azure Functions API (chat/fit/experience), Postgres DB, ai_response_cache, prompt builders (`api/prompts.js`), and the Anthropic LLM provider.

---

**Architecture (high-level)**

```mermaid
flowchart LR
  Browser[Browser / Static Frontend] -->|HTTP| SWA[Static Web App]
  SWA --> FrontendJS[assets/js/main.js + UI]
  FrontendJS -->|POST /api/chat, /api/fit, /api/experience| API[Azure Functions: api/*]
  API -->|SQL| DB[(Postgres)]
  API -->|reads/writes| Cache[(ai_response_cache)]
  API -->|prompts| Prompts[api/prompts.js]
  API -->|LLM calls| Anthropic[(Anthropic LLM)]
  Tests[Unit & Integration Tests] --- CI[CI / Makefile]
  CI -->|runs| Lint[ESLint]
  CI -->|runs| Tests
  CI -->|runs| Spellcheck
```

**Key components**
- Frontend: static pages, UI wires to `/api/*` endpoints in `assets/js/*`.
- API: Azure Functions endpoints in `api/` (chat, fit, experience). Centralized prompt builders live in `api/prompts.js`.
- DB: Postgres holds candidate_profile, skills, skill_equivalence, ai_response_cache, etc.
- LLM: Anthropic-style API used via `callAnthropic()` wrapper with retry/backoff and timeout handling.
- Cache: `ai_response_cache` table keyed by SHA-256 of model+question to reduce LLM calls.

---

## Request Sequence

This sequence shows a typical chat request lifecycle.

```mermaid
sequenceDiagram
  participant U as User
  participant B as Browser
  participant F as Frontend
  participant A as API
  participant DB as Postgres
  participant C as Cache
  participant L as LLM

  U->>B: user types prompt / clicks canned suggestion
  B->>F: frontend posts to /api/chat (message)
  F->>A: HTTP POST /api/chat
  A->>DB: loadCandidateContext() (profile, skills, equivalents, faq, ai_instructions)
  DB-->>A: returns rows
  A->>C: getCache(model, question)
  C-->>A: cached response? (yes/no)
  alt cache hit
    C-->>F: return cached response
  else cache miss
    A->>L: callAnthropic(systemPrompt, userMessage)
    L-->>A: LLM response
    A->>C: setCache(model, question, response)
    A-->>F: response
  end
  F-->>B: render assistant response
  B-->>U: UI shows result
```


### Experience Request Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant B as Browser
  participant F as Frontend
  participant A as API
  participant DB as Postgres
  participant C as Cache
  participant L as LLM

  U->>B: user requests experience summary / export
  B->>F: frontend posts to /api/experience (options)
  F->>A: HTTP POST /api/experience
  A->>DB: loadCandidateContext(profile, experiences, skills, equivalents, education, ai_instructions)
  DB-->>A: returns rows
  A->>C: getCache(model, question)
  C-->>A: cached response? (yes/no)
  alt cache hit
    C-->>F: return cached response
  else cache miss
    A->>L: callAnthropic(buildExperiencePrompt(systemPrompt, context, options))
    L-->>A: LLM response
    A->>C: setCache(model, question, response)
    A-->>F: response
  end
  F-->>B: render assistant response
  B-->>U: UI shows result
```

### Fit Check Request Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant B as Browser
  participant F as Frontend
  participant A as API
  participant DB as Postgres
  participant C as Cache
  participant L as LLM

  U->>B: user submits job description or selects canned fit check
  B->>F: frontend posts to /api/fit (job_description, options)
  F->>A: HTTP POST /api/fit
  A->>DB: loadCandidateContext(profile, skills, equivalents, experiences, ai_instructions)
  DB-->>A: returns rows
  A->>C: getCache(model, question)
  C-->>A: cached response? (yes/no)
  alt cache hit
    C-->>F: return cached response
  else cache miss
    A->>L: callAnthropic(buildFitPrompt(systemPrompt, context, job_description))
    L-->>A: LLM response
    A->>C: setCache(model, question, response)
    A-->>F: response
  end
  F-->>B: render assistant response
  B-->>U: UI shows result
```
## Prompting & Privacy
- Centralized prompt builders: `api/prompts.js` — all prompt text and helper logic lives here to make tuning and audits straightforward.
- Prompt length guard: code trims equivalents or other optional context when prompt size exceeds configured chars (to avoid token limits).
- Sensitive fields: salary and contact details should NOT be included in prompts. Existing code was audited — `target_titles` is included per request, but `salary_min` / `salary_max` are not included. Redact any sensitive profile fields before logging or caching.

## Caching
- Cache entries keyed by SHA-256(model + "|" + question).
- On cache hit: update `cache_hit_count` and `last_accessed`.
- Cache invalidation: manual invalidation endpoint exists (`/api/cache-report` usage); consider TTL-based expiry for long-term scaling.

## Reliability & Backoff
- `callAnthropic` uses retries with exponential backoff for transient 429/503/529 responses and an AbortController for timeouts.
- Timeouts and retries are configurable via constants in each handler.

## Quality & CI
- `Makefile` defines `make lint` (ESLint), `make unit-test` (Jest), `make spellcheck` (cspell), and `make check` that runs all gates.
- `package.json` includes `lint` and `lint:fix` scripts. The linter run has been tuned to ignore test directories during linting as required.

```mermaid
flowchart TD
  Makefile[Makefile / CI] --> Lint[ESLint]
  Makefile --> Tests[Jest]
  Makefile --> Spellcheck[cspell]
  Tests -->|if pass| Deploy[Optional deploy step]
```

## Security & Logging
- Avoid logging full profile objects; redact or omit `salary_*` and contact fields in logs.
- Cache entries should not leak PII; do not include full profile in cache keys — cache is keyed by model+question only.

## Operational Notes
- Monitor LLM latencies and cache hit ratio; surface metrics in app logs.
- Keep `ANTHROPIC_API_KEY` and `DATABASE_URL` in environment (not source).
- Consider rate-limiting/quotas on endpoints that trigger LLM calls.

## Testing & Local Development
- Unit tests exist under `api/__tests__` (Jest). Run via `npm test` at repo root and `cd api && npm test` for API tests.
- Linting: `npm run lint` and auto-fix `npm run lint:fix`. `make check` includes linting as a gate.

---

If you want, I can: (a) add a diagram for the database schema, (b) generate a simple runbook for LLM incidents, or (c) open a PR with this `docs/DESIGN.md` file.

---

## Database Schema (ER diagram)

The following Mermaid ER diagram summarizes the primary tables and relationships used for candidate context, skills/equivalences, and the AI response cache.

```mermaid
erDiagram
  CANDIDATE_PROFILE {
    uuid id PK
    string name
    string title
    string email
    text elevator_pitch
    text target_titles
    integer salary_min
    integer salary_max
    timestamp created_at
    timestamp updated_at
  }

  EXPERIENCES {
    uuid id PK
    uuid candidate_id FK
    string company_name
    string title
    date start_date
    date end_date
    boolean is_current
    text actual_contributions
    integer display_order
  }

  SKILLS {
    uuid id PK
    uuid candidate_id FK
    string skill_name
    string category
    integer self_rating
    text honest_notes
    integer years_experience
    date last_used
  }

  SKILL_EQUIVALENCE {
    uuid id PK
    string skill_name FK
    string equivalent_name
  }

  GAPS_WEAKNESSES {
    uuid id PK
    uuid candidate_id FK
    text description
    text why_its_a_gap
    boolean interested
  }

  VALUES_CULTURE {
    uuid id PK
    uuid candidate_id FK
    text must_haves
    text dealbreakers
  }

  FAQ_RESPONSES {
    uuid id PK
    uuid candidate_id FK
    text question
    text answer
    boolean is_common_question
  }

  EDUCATION {
    uuid id PK
    uuid candidate_id FK
    string institution
    string degree
    string field_of_study
    date start_date
    date end_date
    boolean is_current
    text notes
  }

  AI_INSTRUCTIONS {
    uuid id PK
    uuid candidate_id FK
    integer priority
    text instruction_text
  }

  AI_RESPONSE_CACHE {
    string hash PK
    text question
    string model
    text response
    integer cache_hit_count
    timestamp last_accessed
    timestamp updated_at
    boolean is_cached
  }

  CANDIDATE_PROFILE ||--o{ EXPERIENCES : has
  CANDIDATE_PROFILE ||--o{ SKILLS : has
  SKILLS ||--o{ SKILL_EQUIVALENCE : has
  CANDIDATE_PROFILE ||--o{ GAPS_WEAKNESSES : has
  CANDIDATE_PROFILE ||--o{ VALUES_CULTURE : has
  CANDIDATE_PROFILE ||--o{ FAQ_RESPONSES : has
  CANDIDATE_PROFILE ||--o{ EDUCATION : has
  CANDIDATE_PROFILE ||--o{ AI_INSTRUCTIONS : has

  %% AI_RESPONSE_CACHE is keyed by hash (model+question) and is not directly tied to a candidate
```

Notes:
- `AI_RESPONSE_CACHE` is global (hash of model + question) to maximize reuse across requests. Be careful not to include PII in cached responses.
- `skill_equivalence` stores textual equivalents for a canonical skill name to aid prompt generation and matching.
- Replace any remaining `SELECT *` usage in handlers with explicit column lists when exposing public endpoints.
