---
goal: Migrate the Kanban frontend to Vite and React while preserving the Express API
version: 1.0
date_created: 2026-11-23
status: 'In progress'
last_updated: 2026-11-24
tags: [refactor, frontend, react, vite, migration]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Replace the imperative frontend in `public/` with a modular Vite + React application using functional components. Keep Express, SQLite, all API paths/contracts, and local data unchanged. Vite proxies API calls in development; production Express serves the static Vite build. The approved design is `docs/superpowers/specs/2026-11-23-vite-react-frontend-design.md`; discovery findings are in `findings.md`.

## 1. Requirements & Constraints

- **REQ-001**: Build the browser UI using Vite, React, and functional components.
- **REQ-002**: Organize UI into feature-oriented modules, reusable components, a shared API client, and scoped styles.
- **REQ-003**: Preserve current user-visible behavior: board switching/editing/background color; default and custom columns; WIP limits; card create/edit/delete/restore; colors, labels, priority, deadline, checklist; drag/drop and menus; search/filters; archive reveal; import/export.
- **REQ-004**: Preserve `src/server.js` API paths, methods, request/response semantics, `Idempotency-Key` behavior, SQLite schema/data, localhost binding, and API error behavior.
- **REQ-005**: Use same-origin `/api` calls. Vite dev server proxies `/api` to Express; production Express serves the Vite build from `dist/`.
- **REQ-006**: Keep existing API integration tests passing unchanged.
- **REQ-007**: Add focused React component/interaction tests and production-build serving verification.
- **REQ-008**: Use React portals for action menus that need to escape overflow containers; retain columns that grow with content.
- **CON-001**: Frontend-only scope. Do not refactor backend modules, change database/API formats, or add unrelated product features.
- **CON-002**: Production must not depend on the Vite dev server, a separate frontend service, CORS configuration, cloud access, or third-party runtime resources.
- **CON-003**: Replace the old frontend in one cutover; do not retain a parallel legacy UI or compatibility shim.
- **GUD-001**: Start with React state/hooks and a small API client; add a global state library only if concrete state complexity requires it.
- **GUD-002**: Preserve the existing visual language; no unrelated redesign.

## 2. Implementation Steps

### Implementation Phase 1 — Vite build and serving integration

- GOAL-001: Establish a development/build workflow and production static serving without changing the backend API or data.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-001 | Add compatible React, React DOM, Vite, and React plugin dependencies; keep Express/SQLite dependencies and Node runtime requirements intact. | ✅ | 2026-11-24 |
| TASK-002 | Add root `index.html`, `vite.config.js`, and scripts for Vite development/build. Configure `/api` proxy to the existing Express server and output production files to `dist/`. | ✅ | 2026-11-24 |
| TASK-003 | Update Express static serving to serve `dist/` in production while keeping API routes before any page fallback; ensure API 404s/errors remain JSON. | ✅ | 2026-11-24 |
| TASK-004 | Verify Vite dev startup/proxy and production build/static serving. Keep the old frontend available until the new production build serves successfully. | ✅ | 2026-11-24 |
| TASK-005 | Run existing `test/api.test.js` against the unchanged API and verify existing SQLite data is not reset or migrated. | ✅ | 2026-11-24 |

### Implementation Phase 2 — React shell, API client, and shared UI structure

- GOAL-002: Establish modular React boundaries and implement board loading and common layout.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-006 | Create `src/client/main.jsx` and `App.jsx`; mount React and establish loading/error state without introducing a global store. | ✅ | 2026-11-24 |
| TASK-007 | Implement `src/client/api/client.js` for JSON requests, error decoding, board/card/column/label endpoints, and import/export; preserve `Idempotency-Key` support for API clients that create cards. | ✅ | 2026-11-24 |
| TASK-008 | Build shared app shell, board switcher, board header/title/background, and feature module directories under `src/client/`. | ✅ | 2026-11-24 |
| TASK-009 | Move shared CSS tokens and visual rules into `src/client/styles/` and component/feature CSS Modules; preserve current visual language and content-sized columns. | ✅ | 2026-11-24 |
| TASK-010 | Add focused tests for API client success/error behavior and board loading/switching states. | ✅ | 2026-11-24 |

### Implementation Phase 3 — Feature parity and legacy frontend cutover

- GOAL-003: Rebuild the current Kanban interactions as modular React components, then remove the old imperative frontend.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-011 | Implement `BoardView`, `KanbanColumn`, and `KanbanCard` components with default/custom columns, card ordering, WIP indicators, and protected Backlog/Archive positions. | ✅ | 2026-11-24 |
| TASK-012 | Implement card create/edit forms for title, description, color, labels, priority, deadline, checklist, completion, and card deletion/restore. | ✅ | 2026-11-24 |
| TASK-013 | Implement column create/rename/reorder/delete and WIP settings; preserve server validation and non-empty column deletion behavior. | ✅ | 2026-11-24 |
| TASK-014 | Implement drag/drop movement and in-column reorder plus card action menus for move/edit/archive/delete. Render menus through React portals so columns/scroll containers cannot clip them. | ✅ | 2026-11-24 |
| TASK-015 | Implement search, label/deadline filters, Archive latest-10/reveal-all behavior, and deleted-card recovery UI. | ✅ | 2026-11-24 |
| TASK-016 | Implement board-color changes, import/export, loading/saved/error feedback, and confirmation flows. | ✅ | 2026-11-24 |
| TASK-017 | Add focused React interaction tests for board/card/column workflows, drag/drop and menu actions, archive, filters, deletion recovery, and API error feedback. | ✅ | 2026-11-24 |
| TASK-018 | Compare the React UI against every feature in `docs/kanban-feature-list.md` and remove `public/index.html`, `public/app.js`, and `public/app.css` only after feature parity is verified. | ✅ | 2026-11-24 |

### Implementation Phase 4 — Production cutover and documentation

- GOAL-004: Verify the complete local workflow and document the new development/runtime commands.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-019 | Run production build and start Express against the built assets; verify `/`, frontend assets, all `/api` routes, API 404/error behavior, and localhost binding. | ✅ | 2026-11-24 |
| TASK-020 | Run the unchanged API test suite and all frontend tests; verify board/card state survives server restart and existing SQLite data remains intact. | ✅ | 2026-11-24 |
| TASK-021 | Run a Chromium end-to-end smoke flow for board/card/column editing, drag/drop, menus, archive, search/filter, import/export, and reload persistence when Chromium is available. No Chromium binary is installed in this environment. | | |
| TASK-022 | Update `README.md` with install, dev, build, production start, API proxy, and data-preservation notes; ensure no obsolete plain-static instructions remain. | ✅ | 2026-11-24 |

## 3. Edge Case Handling

- **EDGE-STATE-001**: Vite dev server is running while Express is unavailable → API client shows a recoverable connection error; dev proxy failure is clear and does not replace the UI with invalid data.
- **EDGE-STATE-002**: Board/card updates complete after a board switch or dialog close → Ignore stale responses or scope them to the active board so old data cannot overwrite the selected board.
- **EDGE-ERROR-001**: API returns non-JSON or error status → Shared API client reports a useful error; components keep unsaved input where currently expected.
- **EDGE-COMPAT-001**: Production `/api/*` path has no matching route → Return the existing JSON API error/404; never return the SPA `index.html` for an API request.
- **EDGE-DATA-001**: Frontend build/cutover fails → Keep the old static UI until production build and API smoke checks pass; do not alter SQLite data or API contracts during rollback.
- **EDGE-DEPLOY-001**: Production build directory is missing → Server startup/health or root request must fail visibly; do not silently serve stale `public/` assets.
- **EDGE-TEST-001**: Chromium is unavailable → Complete build, API, component, and static-serving checks; mark manual visual verification explicitly unrun rather than claiming it passed.

## 4. Alternatives

- **ALT-001**: Separate production frontend and backend services — rejected because this local app needs one production process and would add CORS/origin/process-management complexity.
- **ALT-002**: Gradual dual-UI migration — rejected because the current UI is one page and maintaining both implementations would duplicate state and behavior.
- **ALT-003**: Rebuild or modularize the backend as part of this change — rejected because the user specified frontend-only scope and external AI tools rely on the current API.
- **ALT-004**: Add a global state framework and drag/drop framework up front — not selected; use React hooks and native drag/drop unless implementation evidence demonstrates a specific need.

## 5. Dependencies

- **DEP-001**: React and React DOM, compatible with the repository's supported Node runtime.
- **DEP-002**: Vite and its React plugin for dev server and production build.
- **DEP-003**: Vitest and React Testing Library (or an equivalent focused React test setup) for component interaction tests.
- **DEP-004**: Existing Express, `better-sqlite3`, `test/api.test.js`, and SQLite data remain unchanged.
- **DEP-005**: Chromium for optional manual end-to-end visual verification.

## 6. Files

- **FILE-001**: `docs/superpowers/specs/2026-11-23-vite-react-frontend-design.md` — approved migration design.
- **FILE-002**: `package.json` and `package-lock.json` — Vite/React/test dependencies and scripts.
- **FILE-003**: `vite.config.js` and root `index.html` — Vite configuration and frontend entry.
- **FILE-004**: `src/client/**` — React entry, API client, feature components, hooks, and CSS modules.
- **FILE-005**: `src/server.js` — static frontend serving path only; API routes, SQLite schema, and persistence remain unchanged.
- **FILE-006**: `public/index.html`, `public/app.js`, `public/app.css` — legacy frontend removed after cutover.
- **FILE-007**: `test/api.test.js` — existing API tests, retained unchanged.
- **FILE-008**: `src/client/**/*.test.*` — new React component and interaction tests.
- **FILE-009**: `README.md` — updated local development/build/start instructions.

## 7. Testing

- **TEST-001**: `npm run build` creates a production frontend in `dist/` without unresolved asset paths.
- **TEST-002**: Vite dev server proxies `/api` to Express; board list/create/card operations function in development mode.
- **TEST-003**: Existing `npm test` API integration tests pass unchanged.
- **TEST-004**: React tests cover data loading, form submission/error state, board switching, menus/portals, drag/drop ordering, archive reveal, filters, and delete/restore behavior.
- **TEST-005**: Production Express smoke test serves `/` and bundled assets while keeping `/api` responses and JSON 404 behavior intact.
- **TEST-006**: Restart test confirms existing SQLite data persists across frontend cutover.
- **TEST-007**: Manual Chromium flow verifies visible layout, growing columns, unclipped menus, keyboard/focus behavior where implemented, and core feature parity when a browser is available.

## 8. Risks & Assumptions

- **RISK-001**: Rewriting the single-file UI can omit an existing interaction; use a feature checklist and behavior-focused tests before removing the old files.
- **RISK-002**: Vite/React dependency versions and build plugins must support the existing Node engine range; select compatible package versions during setup.
- **RISK-003**: Express 5 fallback route ordering can accidentally return HTML for API paths; test API 404 behavior in production mode.
- **RISK-004**: Chromium may be unavailable in the implementation environment; the manual browser test is conditional, but build/API/unit checks remain required.
- **ASSUMPTION-001**: Vite's default root-based build output `dist/` is served by the existing Express process.
- **ASSUMPTION-002**: The app remains a single-page UI without client-side URL routing; no SPA catch-all is required beyond the root entry unless a feature later adds routes.
- **ASSUMPTION-003**: Existing npm scripts can be changed so development starts Vite and Express together or documents the two commands clearly; production continues to use `npm start`.
- **ASSUMPTION-004**: React state/hooks are sufficient for current single-user data volume; no global state library is required at migration start.

## 9. Related Specifications / Further Reading

- [Approved Vite + React migration design](../../docs/superpowers/specs/2026-11-23-vite-react-frontend-design.md)
- [Kanban feature list](../../docs/kanban-feature-list.md)
- [User answers](../../docs/answers.md)
