Copilot instructions — API (Node.js)

Overview
- API-specific guidelines for the Node.js code in api/.

Conventions
- Keep route handlers small and extract business logic into services.
- Prefer explicit input validation and clear error responses.
- Document public endpoints (OpenAPI or README examples).

Testing & CI
- All new/modified backend code must include unit tests and, for critical flows, integration tests.
- Run: `npm run test:api` locally; CI will run the same on PRs.

API Contracts
- Use OpenAPI/Swagger where feasible; keep API changes backward-compatible when possible.
- Add contract/integration tests when changing request/response shapes.

Error handling & logging
- Use structured logging and meaningful error codes/messages.
- Do not leak sensitive info in error responses; log details server-side.

Security
- Validate and sanitize inputs; apply rate limiting and auth where appropriate.
- Store secrets in environment variables and external secret stores.

PR checklist (API)
- Tests added or updated for new/modified behavior.
- Lint and formatting checks pass.
- Documentation updated for public API changes.

Recommended tools
- Postman/HTTPie for manual API checks
- OpenAPI/Swagger for spec-driven development
- Snyk or GitHub code scanning for security checks

Notes
- Keep API surface minimal and well-documented; favor clear, typed shapes (JSDoc or TypeScript where used).