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

### API flows are now documented for quick reference and onboarding.
