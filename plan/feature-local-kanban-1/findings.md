# Findings

## Discovery Metadata

- **Discovery Date**: 2026-11-23
- **Plan Purpose**: Build a local Kanban application with an Express API and embedded persistence
- **Plan Type**: feature

## Initial Analysis

- The repository contains `docs/kanban-feature-list.md` and `docs/answers.md`, but no existing application source or plan directory.
- The requested plan covers a new application: browser UI, local Node.js/Express API, persistent data, and AI/local-tool integration.
- Plan output location follows the plan-create skill because no `client/` directory exists: `plan/feature-local-kanban-1/`.

## User Clarifications

### Q1: Local backend and persistence

- **Question**: Should the app use browser IndexedDB or a local backend database, and should the API be accessible to other tools?
- **Answer**: Use a Node.js Express API for management so external tools can register tasks. The user clarified that IndexedDB is not mandatory; select a backend data store that supports data management and does not require a separate database installation/service, such as SQLite.
- **Plan decision**: Use an embedded SQLite database file through a Node package (proposed `better-sqlite3`), with Express as the API and SQLite as the source of truth. It requires no separate database server. Validate package/runtime compatibility and first-run install experience before implementation.
- **Date**: 2026-11-23

### Q2: Platform

- **Question**: Which browsers and devices are in scope?
- **Answer**: Chromium-based browsers only; touch-screen use is not required.
- **Date**: 2026-11-23

### Q3: Archive

- **Question**: What does “latest 10” mean?
- **Answer**: The 10 latest archived cards.
- **Plan decision**: Interpret as the 10 most recently archived cards. Older items remain retained and can be explicitly revealed. Restore/permanent-delete details remain open.
- **Date**: 2026-11-23

### Q4: Columns

- **Question**: Which column operations are allowed?
- **Answer**: Add, rename, and reorder. Backlog is always first and Archive always last; those two cannot be reordered or removed.
- **Plan decision**: Protect Backlog/Archive positions and deletion; include safe handling for deleting other columns, with the exact UX to be selected before implementation.
- **Date**: 2026-11-23

### Q5: Additional card features

- **Question**: Which of priority, due date, checklist, attachments, and comments are required?
- **Answer**: Priority, due dates, checklists, and completion state are desired. Attachments and comments may be future features and are not mandatory initially.
- **Date**: 2026-11-23

### Q6: API operations

- **Question**: What must external clients be able to do?
- **Answer**: List boards, list columns for a board, and create cards in columns.
- **Plan decision**: Include these as minimum AI/local-tool operations; define matching read/update/move/delete operations required by the UI in the API contract.
- **Date**: 2026-11-23

### Q7: Board background

- **Question**: Which background types are required?
- **Answer**: Board background color.
- **Date**: 2026-11-23

### Q8: Ordering and WIP limits

- **Question**: How should cards be ordered and WIP limits behave?
- **Answer**: Manual reorder; new cards at top. Columns have a three-dot configuration menu and WIP limit with soft or hard behavior. Soft limits should visibly indicate overage, with yellow/red or another clear visual rule.
- **Plan decision**: Hard limits reject the operation; soft limits allow it and show warning states. Exact visual thresholds are implementation-level decisions.
- **Date**: 2026-11-23

### Q9: User and network model

- **Question**: Is the app single-user/local-only or collaborative?
- **Answer**: Single user, localhost only, intended to integrate with AI skills that create a board per plan and populate tasks.
- **Date**: 2026-11-23

### Q10: Portability and expected size

- **Question**: Is import/export needed, and what scale is expected?
- **Answer**: Import/export should be planned. Boards are expected to be relatively small, often one per plan. Backend may manage data with a small database or another local strategy.
- **Plan decision**: Include portable import/export and use SQLite file persistence; do not rely on small board size for correctness.
- **Date**: 2026-11-23

### Q11: Deletion

- **Question**: How should deletion work?
- **Answer**: Require confirmation; soft deletion is preferred.
- **Plan decision**: Use soft deletion and restore affordance; retention duration remains to be decided.
- **Date**: 2026-11-23

### Q12: Search and filters

- **Question**: Which discovery functions are required?
- **Answer**: Search title/description; filter by labels or deadlines.
- **Date**: 2026-11-23

### Q13: Accessibility/input

- **Question**: Is touch or keyboard alternative input required?
- **Answer**: No touch-screen use; single-user goal-oriented board.
- **Plan decision**: Touch support is excluded; keyboard accessibility was not explicitly waived and remains an implementation question.
- **Date**: 2026-11-23

### Q14: Labels

- **Question**: How should labels work?
- **Answer**: Users create labels on demand and can assign multiple labels per card for filtering.
- **Date**: 2026-11-23

## Edge Case Categories Examined

- **Input validation**: empty/malformed card and board data, invalid identifiers, invalid column destinations.
- **State management**: process restart, ordering consistency, API retries, concurrent local tool/UI updates.
- **Error handling**: database unavailable, migration failure, invalid request, failed import.
- **Permissions/access**: local-only listener, unintended network exposure, local API callers.
- **Data migration**: SQLite schema evolution and import document versioning.
- **Compatibility**: Chromium-only browser target and Node/SQLite package compatibility.
- **Performance**: WIP counts, archive with older hidden items, expected small board size without hard assumptions.
- **Rollback**: failed migrations/imports and user-managed export/backup.
- **Testing**: API integration, persistence, UI end-to-end, loopback binding.
- **Deployment**: local first-run startup and no separate DB service installation.

## Edge Case Analysis

| Edge Case ID | Category | Description | Resolution | Status |
|---|---|---|---|---|
| EDGE-INPUT-001 | Input Validation | Empty or malformed fields | Server-side validation with clear errors; retain UI input | Resolved |
| EDGE-STATE-001 | State Management | Express restarts | Embedded SQLite persists canonical state | Resolved |
| EDGE-STATE-002 | State Management | Retried AI create requests | Decide idempotency or document duplicate semantics in API contract | Open |
| EDGE-STATE-003 | State Management | Concurrent move/reorder | Transactional writes and deterministic ordering strategy | Resolved by implementation requirement |
| EDGE-ERROR-001 | Error Handling | Database open/migration failure | Fail visibly; do not silently initialize an empty replacement | Resolved |
| EDGE-PERM-001 | Permissions | Non-local client access | Bind loopback only; validate requests and origins | Resolved |
| EDGE-DATA-001 | Data Management | Delete a non-empty custom column | Move cards or block deletion; do not cascade-delete | Open; policy required before implementation |
| EDGE-DATA-002 | Data Management | More than 10 archived cards | Show 10 most recently archived and allow reveal of older cards | Resolved |
| EDGE-DATA-003 | Data Management | Soft-deleted records | Confirm, hide from normal views, allow restoration; define retention | Partially resolved |
| EDGE-DATA-004 | Data Management | Invalid/partial import | Validate fully before atomic application | Resolved by plan requirement |
| EDGE-COMPAT-001 | Compatibility | Unsupported browser/touch client | Chromium-only; touch support out of scope | Resolved |
| EDGE-PERF-001 | Performance | WIP threshold exceeded | Soft warning or hard rejection by configuration | Partially resolved; visual thresholds open |
| EDGE-ROLLBACK-001 | Rollback | Failed migration | Transactional migrations where possible; export/backup before destructive changes | Resolved by plan requirement |
| EDGE-TEST-001 | Testing | Regression of core workflow | API, persistence, and Chromium end-to-end coverage | Resolved by plan requirement |

## User Questions Asked

The user answered the 14 product questions in `docs/answers.md` and clarified persistence in the conversation. The original blocking persistence question was: **Should IndexedDB remain mandatory alongside Express, or may a local database be used?** The answer was to select an appropriate backend data store that avoids a separate database installation/service; the plan chooses embedded SQLite.

## Development Strategies

- Treat SQLite as the canonical persistent store. Keep SQL access behind a repository/service layer; route handlers validate and translate HTTP/API contracts rather than containing database logic.
- Express binds to loopback only. Define API operations jointly for the browser client and external AI skills; document request/response schemas and errors.
- Model boards, columns, cards, labels, and checklists explicitly. Store sortable ordering and archive timestamps; enforce protected first/last columns in service logic and schema constraints where practical.
- Use database transactions for moves, reorder operations, multi-record imports, and soft-delete changes.
- Use soft deletion with confirmation and restore support. Set retention and purge behavior before implementing permanent deletion.
- Implement the UI around desktop drag/drop plus equivalent menus. Touch-specific optimization is out of scope; do not assume accessibility keyboard needs are waived.
- Keep import/export versioned and validate before write. Preserve unknown/future data only if a clear compatibility policy is selected.
- Test the local API contract directly and through a Chromium user flow; verify localhost binding and persistence after restart.

## File Analysis

### FILE-001 — Product feature list

- **Path**: `docs/kanban-feature-list.md`
- **Purpose**: Baseline feature inventory and remaining questions.
- **Limitations**: Contains earlier wording about IndexedDB; later user clarification permits a backend database. This plan records SQLite as the chosen option.
- **Key Functions/Classes**: Not applicable; product document.
- **Relevant Patterns**: Confirmed requirements, suggestions, and open questions are separated.

### FILE-002 — User answers

- **Path**: `docs/answers.md`
- **Purpose**: User's decisions for the feature-list questions.
- **Limitations**: Does not specify exact SQLite driver, soft-delete retention, column-delete outcome, or import/export format.
- **Key Functions/Classes**: Not applicable; decision record.
- **Relevant Patterns**: Numbered question/answer decisions.

### FILE-003 — Application source and tests

- **Path**: `src/server.js`, `public/index.html`, `public/app.js`, `public/app.css`, `test/api.test.js`, `README.md`, `package.json`
- **Purpose**: Express API and SQLite persistence, local browser UI, API integration tests, and setup/API documentation.
- **Limitations**: Chromium is not installed in the execution environment, so browser-driven end-to-end verification could not be run. Idempotency is supported on card creation when callers provide `Idempotency-Key`; retention of idempotency records is unbounded.
- **Key Functions/Classes**: `boardView`, `cardsForColumn`, `reorderCards`, Express route handlers, browser `render`, `moveMenu`, and `saveCard`.
- **Relevant Patterns**: Same-origin JSON API, server-side validation, SQLite transactions for multi-record updates, and versioned JSON import/export.

## Technical Discoveries

- IndexedDB belongs to a browser context; a separate Node.js process cannot directly use the browser's IndexedDB. A backend database is the simpler source of truth for both Express and external local tools.
- Embedded SQLite stores data in a local file without a separate database server process. The selected driver still needs compatibility/install validation against supported OS and Node runtime.
- Binding to localhost limits network exposure but does not authenticate local processes. API validation and documented caller assumptions are needed.

## Architecture Decisions

- **ADR-001 — Persistence**: Embedded SQLite database file as the sole source of truth; no parallel IndexedDB store. Rationale: user permits a backend DB and wants Express management plus no separate DB service.
- **ADR-002 — API**: Node.js Express local HTTP API bound to loopback for browser and AI/local-tool integrations.
- **ADR-003 — User model**: Single user and local-only operation; no cloud sync or collaboration in scope.
- **ADR-004 — Deletion**: Soft delete with confirmation and restore; retention/purge policy remains open.
- **ADR-005 — Packaging**: Prefer SQLite driver/package that does not require external database installation; verify native dependency behavior before finalizing.

## Implementation Progress

- Implemented API CRUD/workflow routes, SQLite schema version 2, seeded board, transactional column/card ordering, WIP limits, soft deletion and restore, archive visibility, labels, filters, import/export, localhost checks, and retry-safe card creation.
- Implemented static UI for board switching/editing, content-growing columns, portaled card menus that avoid scroll-container clipping, column management, card editing, labels/checklists, drag/drop, search/filters, archive expansion, deletion recovery, and import/export.
- **Verification run**: `npm test` passed 7 tests; `node --check src/server.js` and `node --check public/app.js` passed; live HTTP smoke check returned 200 for `/`, `/app.js`, `/app.css`, and `/api/health`, and confirmed the five seed columns.
- **Not run**: Chromium end-to-end test; no Chromium binary is installed. Plan task TASK-022 remains open.
- **Dependency note**: `npm install` succeeded, but npm reported the `better-sqlite3` install script was not approved; the installed package successfully opened SQLite and passed integration tests in this environment. Confirm package install-script policy for fresh user environments.
