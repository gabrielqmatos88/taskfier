# Local Kanban

A local-first Kanban board for Chromium-based browsers. The Node.js Express API binds to `127.0.0.1` and stores data in an embedded SQLite file; no separate database server is needed.

## Requirements and startup

- Node.js 22 or newer.
- From the project directory, run `npm install`, then `npm start`.
- Open <http://127.0.0.1:4173> in Chromium.
- `npm run dev` restarts the server when source files change.
- Set `PORT` to change the HTTP port. Set `KANBAN_DATA_DIR` to store `kanban.sqlite` outside the project (default: `./data/kanban.sqlite`).
- Stop the process normally to close the SQLite database. Use Export or back up the SQLite file before making manual changes.

## API

All API routes are local HTTP endpoints under `/api`. The server listens on loopback only and does not enable cross-origin browser access.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET, POST | `/api/boards` | List or create boards |
| GET, PATCH, DELETE | `/api/boards/:boardId` | Read, edit, or soft-delete a board |
| GET, POST | `/api/boards/:boardId/columns` | List or create columns |
| PATCH, DELETE | `/api/columns/:columnId` | Rename/configure a column or delete an empty custom column |
| PUT | `/api/boards/:boardId/columns/order` | Reorder columns, retaining protected first/last columns |
| POST | `/api/columns/:columnId/cards` | Create a card in a column |
| GET | `/api/boards/:boardId/cards` | Search/filter board cards (`q`, `label`, `deadline`) |
| PATCH, DELETE | `/api/cards/:cardId` | Edit/move or soft-delete a card |
| PUT | `/api/columns/:columnId/cards/order` | Persist card order |
| GET | `/api/deleted/cards` | List soft-deleted cards for restoration |
| POST | `/api/cards/:cardId/restore` | Restore a card |
| GET, POST | `/api/boards/:boardId/labels` | List or create labels |
| GET, POST | `/api/export`, `/api/import` | Export all active boards or import versioned JSON |

For card creation and updates, send JSON. Card creation accepts `title`, `description`, `color`, `priority`, `deadline`, `checklist`, and `labelIds`. A move uses `PATCH /api/cards/:cardId` with `columnId` and optional `position`. The API responds with JSON errors shaped as `{ "error": "..." }` for rejected requests.
For retry-safe card creation by automation, send a stable `Idempotency-Key` header (1–200 letters, digits, `.`, `_`, `:`, or `-`). Repeating the same key and request returns the original card; reusing the key with a different request returns `409`. Keys are scoped to their target column.

## Tests

Run `npm test` for isolated API integration tests using temporary SQLite databases. The browser UI is static HTML/CSS/JavaScript served by the same local process; it has no external runtime service dependency.
