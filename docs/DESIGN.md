## Design Overview

**Purpose:** Describe the high-level architecture, data flows, security and operational considerations for the `me` site, focusing on LLM integration, prompt centralization, caching, and CI quality gates.

**Scope:** frontend static site + Azure Functions API (chat/fit/experience), Azure SQL Database (managed), ai_response_cache, prompt builders (`api/prompts.js`), and the Anthropic LLM provider.

---

**Architecture (high-level)**

```mermaid
flowchart LR
  Browser[Browser / Static Frontend] -->|HTTP| SWA[Static Web App]
  SWA --> FrontendJS[assets/js/main.js + UI]
  FrontendJS -->|POST /api/chat, /api/fit, /api/experience| API[Azure Functions: api/*]
  API -->|SQL| DB[(Azure SQL Database)]
  API -->|reads/writes| Cache[(ai_response_cache)]
  API -->|prompts| Prompts[api/prompts.js]
  API -->|LLM calls| Anthropic[(Anthropic LLM)]
```

**Key components**

- Frontend: static pages, UI wires to `/api/*` endpoints in `assets/js/*`.
- API: Azure Functions endpoints in `api/` (chat, fit, experience). Centralized prompt builders live in `api/prompts.js`.
- DB: Azure SQL Database (managed) holds `candidate_profile`, `skills`, `skill_equivalence`, `ai_response_cache`, etc. Use the `AZURE_DATABASE_URL` connection string and enable transient fault retry/backoff logic appropriate for Azure SQL.

---

## Request Sequence

This sequence shows a typical chat request lifecycle.

```mermaid
sequenceDiagram
  participant U as User
  participant B as Browser
  participant F as Frontend
  participant A as API
  participant DB as AzureSQL
  participant C as Cache
  participant L as LLM

  U->>B: user types prompt / clicks canned suggestion
  B->>F: frontend posts to /api/chat (message)
  F->>A: HTTP POST /api/chat
  A->>DB: loadCandidateContext() (profile, skills, equivalents, faq, ai_instructions)
  A->>DB: loadCandidateContext() (profile, skills, equivalents, certifications, faq, ai_instructions)
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
  participant DB as AzureSQL
  participant C as Cache
  participant L as LLM

  U->>B: user requests experience summary / export
  B->>F: frontend posts to /api/experience (options)
  F->>A: HTTP POST /api/experience
  A->>DB: loadCandidateContext(profile, experiences, skills, equivalents, education, ai_instructions)
  A->>DB: loadCandidateContext(profile, experiences, skills, equivalents, certifications, education, ai_instructions)
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
  participant DB as AzureSQL
  participant C as Cache
  participant L as LLM

  U->>B: user submits job description or selects canned fit check
  B->>F: frontend posts to /api/fit (job_description, options)
  F->>A: HTTP POST /api/fit
  A->>DB: loadCandidateContext(profile, skills, equivalents, experiences, ai_instructions)
  A->>DB: loadCandidateContext(profile, skills, equivalents, certifications, experiences, ai_instructions)
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

  CERTIFICATIONS {
    uuid id PK
    uuid candidate_id FK
    string name
    string issuer
    date issue_date
    date expiration_date
    string credential_id
    string verification_url
    text notes
    integer display_order
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
  CANDIDATE_PROFILE ||--o{ CERTIFICATIONS : has

  %% AI_RESPONSE_CACHE is keyed by hash (model+question) and is not directly tied to a candidate
```
