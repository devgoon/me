# Consolidation Backlog

Date: 2026-04-05

Purpose: collect duplicated patterns and small utility code worth extracting into shared modules/components to reduce repetition and improve maintainability.

Priority guidance: High ROI items first — small surface area and used in many places.

Candidates

1. Typing indicator (JS + CSS)
   - Locations:
     - frontend/assets/js/main.js (chat typing helper)
     - frontend/assets/js/skills.js (skills loading indicator)
     - frontend/assets/js/experience-ai.js (experience/skills loading)
     - frontend/assets/css/style.css (typing-dot styles)
     - frontend/assets/css/experience-ai.css (typing/loader styles)
   - Suggested new files:
     - frontend/assets/js/lib/typing-indicator.js
     - frontend/assets/css/components/typing.css
   - Rationale: consistent visuals and behavior; accessible/ reduced-motion support centralized.

2. Fetch / timeout helpers
   - Locations:
     - frontend/assets/js/skills.js (fetchWithTimeout)
     - api/health/index.js (fetchWithTimeout pattern)
     - api/experience/index.js, api/chat/index.js, frontend/assets/js/fit-ai.js, etc.
   - Suggested new files:
     - frontend/assets/js/lib/fetch.js (browser-friendly helper)
     - api/_shared/abort.js or api/_shared/fetch.js (server-side helper)
   - Rationale: unify retry/backoff and AbortController usage; avoid duplicated timeout/abort boilerplate.

3. HTML escaping & DOM utilities
   - Locations:
     - frontend/assets/js/experience-ai.js (`escapeHtml`, `normalizeList`)
     - frontend/assets/js/admin.js (`escapeHtml` used extensively)
     - frontend/assets/js/skills.js (`createTag`)
   - Suggested new file:
     - frontend/assets/js/lib/dom-utils.js
   - Rationale: single safe-escape implementation and small helpers reduce XSS risk and duplication.

4. Loading/spinner components
   - Locations:
     - frontend/assets/css/experience-ai.css (`.loading`)
     - frontend/assets/css/style.css (`.loading`)
     - scripts that inject `.loading` (fit-ai.js, skills.js before replacement)
   - Suggested action: consolidate or remove in favor of the typing component; place styles in `frontend/assets/css/components/loading.css`.

5. AbortController timeout boilerplate for APIs
   - Locations:
     - api/health/index.js
     - api/fit/index.js
     - api/chat/index.js
   - Suggested new file:
     - api/_shared/abort.js (returns `{ signal, clear }` or helper wrapper)
   - Rationale: server-side reuse and easier testing.

6. Role-card / small HTML template helpers
   - Locations:
     - frontend/assets/js/experience-ai.js (renderExperience)
     - frontend/assets/js/admin.js (renderers building `article.role-card` blocks)
   - Suggested new file:
     - frontend/assets/js/lib/templates.js
   - Rationale: reduce duplicate HTML construction and allow safer templating.

7. Test fixtures and DOM stubs
   - Locations:
     - tests/helpers.js (partial)
     - many tests add the same `#add-*` buttons and lists
   - Suggested action: expand `tests/helpers.js::baseDom()` to include common add-button IDs and list containers.
   - Rationale: reduce test duplication and fragile per-test setup.

Notes & next steps
- I created this backlog file to track the work; I can scaffold the top-priority items (typing-indicator + dom-utils) next.  
- When extracting helpers, pay attention to runtime differences (browser vs Node): keep server helpers under `api/_shared` and browser helpers under `frontend/assets/js/lib`.

