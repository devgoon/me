Copilot instructions — React (frontend)

Overview
- Frontend-specific guidelines for the React app in frontend-react/.

Stack
- React 19, Vite, react-router-dom v7, Vitest for unit/component tests.

Conventions
- Use functional components and hooks only; prefer small, single-responsibility components.
- Use named exports for components.
- Co-locate component, styles, and tests.
- Tests: use `.test.jsx` or `.test.js` and keep tests alongside the source.

Testing & CI
- Every new or modified frontend feature must include tests covering behavior and edge cases.
- Run: `npm run test:ui` locally; CI will run the same on PRs.

Linting & Formatting
- Follow the repo linting rules; run `npm run lint` and `npm run lint:fix`.
- Pre-commit hooks should run format/lint checks.

PR checklist (frontend)
- Include tests for new/modified code.
- Lint and format with no errors.
- Add screenshots or short video if UI changes are visual.
- Ensure accessibility checks (axe) for new UI.

Recommended tools
- VSCode with ESLint, Prettier, and React/JS extensions
- Browser devtools, Lighthouse, axe-core (for accessibility)
- Playwright for end-to-end tests where applicable

Notes
- Keep components accessible (semantic HTML, keyboard navigation, ARIA where necessary).
- Extract shared UI into a small design-system or shared component folder when reused across pages.