# Testing environment variables (CI & local)

List of environment variables tests expect and how to provide them in CI/local development.

Required for API tests (set in CI as secrets):
- `AZURE_DATABASE_URL` — connection string used by API/db helpers (example format in `.env.local.example`). Tests often set this to a local Postgres URL when mocking DB behavior.
- `ANTHROPIC_API_KEY` — required by AI-calling endpoints; set to a test value for unit tests or add as a CI secret and mock network calls during integration tests.

Optional / runtime:
- `AI_MODEL` — model override for local debugging.
- `AzureWebJobsStorage` — Functions emulator storage connection for local Functions runs.

Recommendations:
- Use `.env.local` for local dev only and keep it out of git. A sample file `.env.local.example` exists in the repo.
- In GitHub Actions, add `ANTHROPIC_API_KEY` and `AZURE_DATABASE_URL` as repository secrets and reference them from workflow files (the repo already uses these secrets in `.github/workflows/webapp.yml`).
- Tests should avoid relying on real external services. Use test fixtures and mocks in `tests/` (see existing tests that set `process.env.*` per-test).

If you'd like, I can:
- Create a shared test-fixtures helper that centralizes env mocking for tests, and
- Add a `tests/ENV_VARS.md` under `tests/` with minimal examples per test suite.
