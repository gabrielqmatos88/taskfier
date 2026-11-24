# Vite + React Frontend Migration Design

## Intent

Replace the current imperative browser UI with a modular React application built by Vite. The goal is to make future Kanban features easier to isolate, compose, test, and maintain without changing the backend or the behavior users and AI tools already depend on.

## Current state

- `public/index.html`, `public/app.js`, and `public/app.css` implement the browser UI. Most UI state and event handling currently live in a single JavaScript file, and styles are concentrated in one stylesheet.
- `src/server.js` contains the Express API and SQLite persistence. It serves the current static frontend from `public/`.
- `test/api.test.js` exercises the existing HTTP API, including boards, columns, cards, labels, archive visibility, import/export, and idempotent card creation.
- The API is bound to localhost. Local AI tools depend on the existing endpoints and `Idempotency-Key` behavior.

## Goals

- Build the frontend with Vite and React functional components.
- Split the UI into focused components and feature-oriented modules.
- Preserve current user-visible behavior: boards, custom columns, WIP limits, cards, colors, labels, priority, deadlines, checklists, search/filtering, drag/drop, card/column menus, archive expansion, deletion recovery, and import/export.
- Preserve the Express API, SQLite database, API paths, request/response formats, localhost binding, and data files unchanged.
- Keep production deployment local and simple: Express serves the compiled frontend; Vite is a development/build tool, not a production service.
- Keep card menus outside overflow-clipping containers using React portals, and keep columns content-sized.

## Non-goals and anti-goals

- No Express/backend module refactor in this migration.
- No API, SQLite schema, data-file, or import/export format changes.
- No new Kanban features, cloud sync, authentication, multi-user support, SSR, or frontend router unless required by a later request.
- No parallel legacy and React implementations after cutover; avoid compatibility shims and duplicate UI behavior.
- Do not replace the existing browser behavior with mock data or a reduced feature set.

## Constraints

- **Confirmed:** Vite and React; functional components; frontend-only migration.
- **Confirmed:** Keep Express + SQLite and preserve the current API contract.
- **Confirmed approach:** Vite proxies `/api` to the existing local Express server during development; production Express serves the Vite build from `dist/` on the same origin.
- Chromium-based browsers are the supported browser target.
- The app is local and single-user. The production UI must not require an external frontend host or third-party runtime service.
- Existing API tests and existing local SQLite data must continue to work after cutover.

## Approaches considered

### A. Vite development server, Express production server — selected

Vite runs the React UI during development and proxies API requests to Express. A production build emits static assets to `dist/`; Express serves those assets alongside the unchanged `/api` routes. This keeps fast frontend iteration while retaining one local production process and same-origin API calls.

### B. Separate frontend and backend services in production — not selected

Vite/React and Express would be deployed/run as separate services. This separates concerns operationally, but adds process management, origin/CORS configuration, and deployment steps to a single-user localhost app without a current requirement for independently hosted clients.

### C. Gradual dual-UI migration — not selected

Keep the existing UI while migrating parts of the screen into React. The current app is a single page without independent frontend routes, so maintaining both implementations would duplicate state and event behavior and create a temporary compatibility layer with little benefit. Use a clean frontend cutover instead.

## Design decisions

### Frontend structure

Use the repository's existing `src/` directory for the React application and leave `src/server.js` as the Express entry point. Add the Vite HTML entry at the repository root and a Vite config that writes the production build to `dist/`.

Proposed module layout; the implementation plan may refine filenames while retaining these boundaries:

```text
index.html
vite.config.js
src/
  server.js                    # unchanged API/backend entry
  client/
    main.jsx                   # React mount
    App.jsx                    # shell and selected-board state
    api/
      client.js                # same-origin API calls and error decoding
    features/
      boards/                  # board switcher/header/state
      columns/                 # columns, ordering, WIP settings
      cards/                   # card editor, card actions, drag/drop
      labels/                  # label selection and management
      archive/                 # archived/deleted-card views
    components/                # dialogs, buttons, toast, shared controls
    styles/
      tokens.css               # shared colors and design tokens
      *.module.css             # component/feature-scoped styles
```

Do not introduce a global state library initially. Keep board data and view state in React state/hooks; use a reducer only where coordinated board/card actions justify one. Keep server access behind a small API client module so components do not assemble fetch URLs or parse errors independently.

Use React portals for card and column action menus that must escape scroll/overflow containers. Preserve native drag/drop semantics unless implementation evidence requires a focused dependency; do not add a large component or drag/drop framework by default.

### Development and production serving

- Vite development server proxies `/api` to Express on the existing local port.
- Development scripts must make it clear how both processes are started; prefer one documented command that starts both processes if it can be done without unnecessary runtime dependencies.
- Vite production build writes to `dist/`.
- Express keeps API middleware/routes and SQLite initialization; only the static frontend serving path changes from `public/` to the built output. `/api` requests must never fall through to the SPA HTML response.
- Remove the legacy `public/app.js`, `public/app.css`, and old HTML entry only after the React frontend is functional and the production Express build serves it.

### Styling

Preserve the current visual language and CSS variables. Move the existing styles into shared tokens plus feature/component CSS Modules. Avoid CSS-in-JS and unrelated visual redesign. Keep content-sized columns and portal-based menus so the recent clipping/height fixes are retained.

### Testing strategy

- Keep `test/api.test.js` and run it unchanged to demonstrate the Express API and data contract were not broken.
- Add focused component/interaction tests for essential stateful flows: board loading and switching, card creation/editing, moving cards via menus and drag/drop, archive reveal, label/search filters, deletion recovery, and API error display.
- Add a production build smoke test that starts Express with the built frontend and verifies the app entry/assets and `/api` routes are served from the expected locations.
- Run the built UI in Chromium for a manual end-to-end check when a browser is available. Do not claim visual verification if the environment lacks Chromium.

## Acceptance criteria

1. `npm run build` produces a static React frontend in `dist/` and the app starts in production with the existing `npm start` command.
2. `npm run dev` (or documented equivalent) starts Vite with `/api` proxying to the existing Express server.
3. All existing API integration tests pass; SQLite data and API contracts are unchanged.
4. The React UI preserves the current functional feature set and default-board/archive rules.
5. Menus are rendered outside clipping containers; columns grow with their card content.
6. UI code is split into functional components, feature modules, a shared API client, and scoped styling; the old imperative frontend is removed after cutover.
7. No production dependency on the Vite dev server or an external service is introduced.

## Risks and implementation questions left to the builder

- Existing source files combine UI behavior in a single place; behavior inventory and acceptance tests must prevent omissions during the rewrite.
- The development workflow needs both Vite and Express. Choose scripts/process tooling that remains easy to install and run locally.
- Express 5 static/fallback routing must keep API errors and API 404s as JSON instead of returning `index.html`.
- The current environment may not have Chromium available; separate build/API checks from any manual visual verification.
- Use the current package/runtime conventions and select compatible Vite/React versions during planning; do not change backend dependencies unless technically necessary.
