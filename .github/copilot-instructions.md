# Copilot Instructions

## Project Overview

This project is my personal brand website and portfolio, showcasing my work and skills as a software developer.
This is a full-stack web app with a React 19 frontend (`frontend-react/`) and a Node.js API (`api/`), built with Vite and deployed via Azure Static Web Apps.

## Goals

- Represent personal brand: present a polished, professional site and maintain a clean, well-documented repository and codebase that reflects staff-engineer quality.

## Frontend (React)

Refer to docs/copilot-react.md for frontend-specific conventions, testing commands, and tooling.

## API (Node.js)

Refer to docs/copilot-api.md for API-specific conventions, testing, and deployment guidance.

## Testing

- All new or modified code must include tests; PRs should not be merged without appropriate tests.
- Use the Makefile task for local and CI checks: run `make check` to execute tests, linting, and formatting checks. (Legacy: `npm run test:ui`, `npm run test:api`, `npm test`)

## Linting

- Run: `npm run lint`
- Auto-fix: `npm run lint:fix`
- Covers `api/**/*.js` and `frontend-react/src/**/*.{js,jsx}`

## CI Enforcement

- CI must run tests, lint, and formatting checks on every PR; branch protection requires passing checks before merge.
- PRs should include test runs and any required coverage reports; failing CI blocks merges.
- CI should also run security and dependency scans where feasible (e.g., Snyk, GitHub Code Scanning).

## Secrets Handling

- Never commit secrets or credentials to the repo. Use environment variables and provide a `.env.example` for local setup.
- Store runtime secrets in GitHub Secrets (for CI) and Azure Key Vault (for production) and document their usage.
- Add pre-commit checks or automated scans to detect accidental secret commits (e.g., detect-secrets, GitGuardian).

## Dependabot

- Dependabot is enabled to open dependency update PRs regularly. Review and merge updates promptly.
- Configure Dependabot schedules and auto-merge rules for low-risk updates; require human review for major version bumps.
- Use semantic versioning and changelog checks when evaluating dependency upgrades.
