## Database Schema

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

## API Flow Diagrams

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

### Schema and API flows are now documented for quick reference and onboarding.
