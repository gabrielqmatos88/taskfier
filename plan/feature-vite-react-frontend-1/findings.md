# Findings

## Discovery Metadata

- **Discovery Date**: 2026-11-23
- **Plan Purpose**: Migrate the existing Kanban frontend to Vite and React while preserving its local Express/SQLite backend
- **Plan Type**: refactor

## Initial Analysis

- The migration is an approved frontend-only refactor; the design document is `docs/superpowers/specs/2026-11-23-vite-react-frontend-design.md`.
- Current UI is a static page in `public/index.html`, imperative state/event logic in `public/app.js`, and a concentrated stylesheet in `public/app.css`.
- `src/server.js` owns the Express API, SQLite persistence, localhost binding, and currently serves static frontend files. No backend API or schema change is in scope.
- Existing API integration tests are in `test/api.test.js`; preserve them and the current on-disk database.
- The repository has no `client/` directory, so this plan is located at `plan/feature-vite-react-frontend-1/` per the plan-create skill.

## User Clarifications

### Q1: Migration boundary

- **Question**: Should the migration also restructure the Express/SQLite backend, or only the frontend?
- **Answer**: For now, only the frontend.
- **Date**: 2026-11-23

### Q2: Frontend and production serving approach

- **Question**: Which frontend deployment approach should be used?
- **Answer**: User approved Vite dev + Express production serving: Vite proxies `/api` during development; production Express serves the built frontend.
- **Date**: 2026-11-23

### Q3: Design approval

- **Question**: Does the written migration design match the intended scope and behavior?
- **Answer**: User said “proceed” after reviewing the design handoff. A builder-check reviewer found “nothing important left.”
- **Date**: 2026-11-23

## User Questions Asked

The boundary question and approach selection were answered in the conversation before the design was written. The reviewed design left low-level package/script/test-tool choices to implementation planning; no additional user-level questions were required.

## Edge Case Categories Examined

- **Input validation**: Frontend form data continues through the unchanged Express validation and response contract.
- **State management**: Asynchronous API responses after board switches/dialog closes; local React state and active-board scoping.
- **Error handling**: Development proxy failures; non-JSON/4xx/5xx API responses; persistence errors.
- **Permissions/access**: Preserve localhost-only binding and same-origin API access.
- **Data migration**: No SQLite schema/data migration; preserve existing SQLite data.
- **Compatibility**: Vite/React versions must support the repository's Node engine and Chromium target.
- **Performance**: Maintain the current small local-board workflow; avoid premature global state or UI framework dependencies.
- **Rollback**: Do not remove old UI until Vite build and production Express smoke checks pass; keep database untouched.
- **Testing**: Retain API integration tests, add React interaction tests and production serving smoke coverage; manual Chromium test is conditional on browser availability.
- **Deployment**: Vite is development/build only; production remains a single Express process serving `dist/` and API routes.

## Edge Case Analysis

| Edge Case ID | Category | Description | Resolution | Status |
|---|---|---|---|---|
| EDGE-STATE-001 | State Management | An API response for a previous board arrives after board switch | Scope UI updates to active board/request state; ignore stale responses | Plan requirement |
| EDGE-ERROR-001 | Error Handling | API response is an error or non-JSON | Shared API client normalizes errors; preserve user-entered form data where appropriate | Plan requirement |
| EDGE-COMPAT-001 | Compatibility | Express SPA fallback intercepts unknown `/api` route | API routing precedes static/fallback handling; verify API 404 remains JSON | Plan requirement |
| EDGE-DATA-001 | Data Management | Failed frontend cutover or build | Keep old frontend until production assets/API checks pass; do not change SQLite data | Plan requirement |
| EDGE-DEPLOY-001 | Deployment | Missing `dist/` output | Fail visibly; do not silently serve stale old assets | Plan requirement |
| EDGE-TEST-001 | Testing | No Chromium binary is available | Run build, API, component, and serving checks; explicitly leave manual visual test unverified | Conditional manual verification |

## Development Strategies

- Keep `src/server.js` as the backend entry and preserve `/api` routes, SQLite schema, localhost binding, and request/response behavior.
- Add React/Vite frontend under `src/client/`, with a root `index.html` and Vite config. Group UI by boards, columns, cards, labels, and archive features; place shared API functions in `src/client/api/client.js`.
- Use React hooks/local state initially. Use React portals for menus that need to escape overflow contexts and native drag/drop unless tests or behavior demonstrate a need for an additional library.
- Use shared CSS tokens and CSS Modules, preserving the existing visual language and recent column/menu fixes.
- Vite dev mode proxies `/api` to Express. Express serves `dist/` in production; keep API routes ahead of any root page/static fallback.
- Retain `test/api.test.js` without modifications. Add focused component tests and a production smoke test before removing `public/` assets.
- Delete the legacy UI only after full feature parity, tests, build, and production static serving are proven.

## File Analysis

### FILE-001 — Approved migration design

- **Path**: `docs/superpowers/specs/2026-11-23-vite-react-frontend-design.md`
- **Purpose**: User-approved scope, selected deployment approach, component/layout direction, risks, and acceptance criteria.
- **Limitations**: Leaves compatible dependency versions and low-level module/test filenames to the implementation plan.
- **Key Functions/Classes**: Not applicable; design document.
- **Relevant Patterns**: Frontend-only migration, Vite proxy, Express production static serving, one-time cutover.

### FILE-002 — Existing frontend

- **Path**: `public/index.html`, `public/app.js`, `public/app.css` (removed after React cutover)
- **Purpose**: Legacy DOM structure, behavior, and styles used as the feature-parity source.
- **Limitations**: No longer served or present; functionality moved into React feature modules.
- **Key Functions/Classes**: Legacy `loadBoards`, `loadBoard`, `render`, `openCard`, `openColumn`, `moveMenu`, `saveCard`, and drag/drop handlers informed the new component behavior.
- **Relevant Patterns**: Same-origin API, native drag/drop, dialogs, card and column action menus.

### FILE-003 — Backend and API

- **Path**: `src/server.js`
- **Purpose**: Express API, SQLite schema/persistence, localhost-only server, existing static file serving.
- **Limitations**: Static serving currently points to `public/`; only this serving configuration should change.
- **Key Functions/Classes**: API route handlers, `boardView`, `cardsForColumn`, `reorderCards`, schema initialization.
- **Relevant Patterns**: Express 5, `better-sqlite3`, same-origin local JSON API.

### FILE-004 — API integration tests

- **Path**: `test/api.test.js`, `test/production.test.js`, and `src/client/**/*.test.*`
- **Purpose**: Existing HTTP/API regression tests, production-serving smoke test, and React component/interaction tests.
- **Limitations**: Automated UI tests run in jsdom; Chromium end-to-end testing is unavailable in this environment.
- **Key Functions/Classes**: Temporary SQLite Express server harness; App board/card flows; ActionMenu portal; `filterCards`; archive visibility.
- **Relevant Patterns**: Node test runner for API/production and Vitest + React Testing Library for UI.

### FILE-005 — Package and documentation

- **Path**: `package.json`, `package-lock.json`, `README.md`
- **Purpose**: Node dependencies/scripts and local development, production, and API documentation.
- **Limitations**: `npm install` warns that package install scripts for `better-sqlite3`/`esbuild` are not approved in this environment; Vite build and tests succeeded with installed packages.
- **Key Functions/Classes**: `dev`, `dev:server`, `dev:client`, `build`, `test`, `test:ui`, `test:api`, `test:production`, `start` scripts.
- **Relevant Patterns**: ESM package; Node >=22; Vite is dev/build tooling only.

## Technical Discoveries

- The existing browser app is single-page; a client-side router is not required for the approved scope.
- The current Express process can remain the only production runtime service; Vite can build static assets and provide a development proxy.
- `test/api.test.js` uses temporary data directories, so frontend work can be validated without altering the user's live SQLite database.
- Existing menu/column fixes are explicit acceptance requirements and should be preserved in React through growing column layout and portals.

## Architecture Decisions

- **ADR-001 — Frontend only**: Replace UI with React/Vite; do not refactor API or SQLite modules.
- **ADR-002 — Development API routing**: Vite proxies `/api` to Express, avoiding CORS and retaining same-origin request paths.
- **ADR-003 — Production serving**: Express serves Vite build assets from `dist/`; Vite is not a production service.
- **ADR-004 — Component/state strategy**: Functional React components, feature-oriented folders, centralized API client, local hooks/state initially, no global store by default.
- **ADR-005 — Styling and overlays**: CSS Modules plus shared tokens; React portals for action menus.
- **ADR-006 — Migration cutover**: Remove old static frontend only after feature parity and build/production checks; keep API tests unchanged.

## Implementation Progress

- Added Vite 6.4.6, React 19.1, plugin-react, Vitest, jsdom, and React Testing Library. Development runs Vite on port 5173 and Express on 4173; Vite proxies `/api`. Production Express serves `dist/` and returns JSON 404s for unknown `/api` paths.
- Replaced the legacy UI with `src/client/` feature modules and removed `public/index.html`, `public/app.js`, and `public/app.css`. Express API routes and SQLite schema/data are unchanged.
- **Verification run**: `npm test` passed 12 React tests and 8 API tests. `npm run test:production` built the Vite app and passed the Express production static/API smoke test. Vite development smoke returned HTTP 200 for the React entry and proxied `/api/health`.
- **Not run**: Chromium end-to-end visual check; no Chromium binary is installed. Plan task TASK-021 remains open.
