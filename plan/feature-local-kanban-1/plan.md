---
goal: Build a local Kanban application with an Express API and embedded persistence
version: 1.0
date_created: 2026-11-23
status: 'In progress'
last_updated: 2026-11-23
tags: [feature, kanban, express, sqlite, local-first]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Build a single-user Kanban application for Chromium-based browsers, backed by a Node.js Express API bound to localhost and an embedded SQLite database file. The app supports multiple plan-oriented boards, editable columns, cards, labels, WIP limits, archive visibility, and import/export. User decisions are recorded in `findings.md`.

Persistence decision: use embedded SQLite through a Node package such as `better-sqlite3`; do not require users to install or run a separate database server. This supersedes the earlier IndexedDB-only requirement, per the user's latest clarification. Confirm Node runtime/package compatibility during setup.

## 1. Requirements & Constraints

- **REQ-001**: Provide multiple boards with editable title and solid-color background.
- **REQ-002**: New boards start with Backlog, To Do, WIP, Done, Archive in that order.
- **REQ-003**: Backlog remains first and Archive remains last; neither may be removed or reordered. Users may add, rename, and reorder other columns.
- **REQ-004**: Cards contain title, description, labels (multiple per card), priority, deadline, checklist/completion state, color, column, and ordering position.
- **REQ-005**: Card palette is yellow by default plus green, red, blue, purple, gray, and white.
- **REQ-006**: Support create, edit, move, reorder, soft-delete, and restore actions where applicable; deletion requires confirmation.
- **REQ-007**: Support drag/drop and menu-based moves, with three-dot column settings and card actions.
- **REQ-008**: Show the 10 most recently archived cards by default and provide an explicit way to reveal older archived cards.
- **REQ-009**: Support per-column WIP limits configurable as soft or hard. New cards appear at the top; users may manually reorder cards.
- **REQ-010**: Provide title/description search and label/deadline filters.
- **REQ-011**: Provide import/export for local board data.
- **REQ-012**: Express API supports listing boards, listing a board's columns, and creating cards in a specified column. Add corresponding UI/API read, update, move, ordering, and deletion operations required by implemented features.
- **REQ-013**: Run the API only on localhost; support external local tools, including AI skills, that create boards and register tasks.
- **CON-001**: Target Chromium-based browsers; touch-screen support is out of scope.
- **CON-002**: Single user, local host only; no cloud sync, accounts, or collaboration.
- **CON-003**: Use an embedded SQLite database file; no separate database server installation or service.
- **CON-004**: Attachments and comments are explicitly not required for the initial scope.
- **GUD-001**: Keep boards small and usable as one board per plan, but do not rely on that expectation for correctness.
- **GUD-002**: Do not silently discard cards when columns/boards are deleted; define soft-delete and retention behavior before implementation.

## 2. Implementation Steps

### Implementation Phase 1 — Application foundation and persistence

- GOAL-001: Establish the local app/API boundary, durable data model, and safe startup behavior.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-001 | Inspect existing project structure; choose compatible Node LTS and SQLite package; document run/build commands. | ✅ | 2026-11-23 |
| TASK-002 | Define SQLite schema and migrations for boards, columns, cards, labels, checklists, and soft deletion; enforce Backlog/Archive invariants. | ✅ | 2026-11-23 |
| TASK-003 | Initialize the database file in an app-owned local data location; handle first run, locked/unavailable database, and migration failures clearly. | ✅ | 2026-11-23 |
| TASK-004 | Bind Express to loopback only; define JSON validation, consistent errors, and localhost access policy for browser UI and local AI tools. | ✅ | 2026-11-23 |
| TASK-005 | Implement repository/service and API tests for board listing/creation, column listing, card creation, and persistence across process restart. | ✅ | 2026-11-23 |

### Implementation Phase 2 — Boards, columns, and cards

- GOAL-002: Implement the core board/card workflow and stable ordering rules.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-006 | Implement board CRUD needed by UI/API, default columns, title, and background color. | ✅ | 2026-11-23 |
| TASK-007 | Implement column add/rename/reorder; lock Backlog first and Archive last; resolve/delete non-empty custom columns without data loss. | ✅ | 2026-11-23 |
| TASK-008 | Implement card create/edit/soft-delete/restore, colors, labels, priority, deadlines, checklists, and completion state. | ✅ | 2026-11-23 |
| TASK-009 | Implement card move and stable manual ordering; insert new cards at the top; expose matching API operations. | ✅ | 2026-11-23 |
| TASK-010 | Implement WIP configuration (soft/hard) and visible soft-limit warning thresholds; hard limit rejects moves/creates that exceed capacity. | ✅ | 2026-11-23 |
| TASK-011 | Add focused validation/error tests for malformed input, missing board/column/card, invalid moves, and duplicate/retried requests. (Resource-not-found, invalid-move, and retry/idempotency cases remain to be tested/decided.) | | |

### Implementation Phase 3 — Browser experience

- GOAL-003: Deliver a usable Chromium UI for board organization and task discovery.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-012 | Build board switcher, board title/background editing, and responsive desktop board layout. | ✅ | 2026-11-23 |
| TASK-013 | Build card creation/detail editing, palette, multi-label editing, priority, deadline, and checklist controls. | ✅ | 2026-11-23 |
| TASK-014 | Implement drag/drop across and within columns plus menu-based move/reorder actions with the same semantics. | ✅ | 2026-11-23 |
| TASK-015 | Implement column three-dot configuration and soft/hard WIP limit UI. | ✅ | 2026-11-23 |
| TASK-016 | Implement Archive showing the 10 most recently archived cards, with an explicit reveal-all/older-items control. | ✅ | 2026-11-23 |
| TASK-017 | Implement title/description search and label/deadline filters; verify combined filters and empty results. | ✅ | 2026-11-23 |
| TASK-018 | Add confirmation and restore flows for soft-deleted records; display persistence and API errors without losing user input. | ✅ | 2026-11-23 |

### Implementation Phase 4 — Data portability, integration, and release verification

- GOAL-004: Make local data portable and verify end-to-end API/UI behavior.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-019 | Define and implement versioned import/export format for boards and related entities; validate imports before committing. | ✅ | 2026-11-23 |
| TASK-020 | Add API integration coverage for AI-tool use: create/list board, list columns, create cards in columns, and retrieve resulting state. | ✅ | 2026-11-23 |
| TASK-021 | Test localhost-only binding, malformed payloads, and rejection of access from non-loopback interfaces. | ✅ | 2026-11-23 |
| TASK-022 | Run end-to-end Chromium scenarios: create board, configure columns, create/move/reorder/filter/archive cards, restart server, import/export. Chromium browser is not installed; only API tests and HTTP asset smoke check were run. | | |
| TASK-023 | Document install/run, database location, backup/export, API contract, and recovery behavior. | ✅ | 2026-11-23 |

## 3. Edge Case Handling

- **EDGE-INPUT-001**: Empty or malformed titles/fields → Validate server-side and return field-specific 4xx errors; UI keeps entered values.
- **EDGE-STATE-001**: API process restart → SQLite is the durable source of truth; verify board/card state survives restart.
- **EDGE-STATE-002**: Repeated create requests → Define idempotency for AI integrations or document that retries can create duplicates; settle during API contract task.
- **EDGE-STATE-003**: Concurrent reorder/move requests → Persist ordering transactionally and use a deterministic position/reindex strategy.
- **EDGE-DATA-001**: Delete non-empty custom column → Do not cascade-delete cards; require a destination column or block until cards are moved.
- **EDGE-DATA-002**: Archive contains more than 10 cards → Show 10 most recently archived; older cards remain stored and are reachable via reveal-all.
- **EDGE-DATA-003**: Soft-deleted record → Hide from normal views, require confirmation, and provide restore; retention duration remains an explicit assumption to settle before implementation.
- **EDGE-DATA-004**: Invalid/partial import → Validate the complete document before write; apply import atomically or leave existing data unchanged.
- **EDGE-ERROR-001**: Database cannot open or migration fails → Fail startup with actionable diagnostics; never silently create an empty replacement database.
- **EDGE-PERM-001**: Non-local network access → Bind only to loopback and test it; this is not a substitute for authentication if the network boundary changes.
- **EDGE-PERF-001**: Soft WIP exceeded → Render a warning state; exact thresholds/color rules must be set during implementation design. Hard limits reject the operation with a clear reason.
- **EDGE-COMPAT-001**: Non-Chromium browser/touch support → Out of scope; verify against the chosen Chromium browser baseline.
- **EDGE-ROLLBACK-001**: Failed schema migration → Keep migrations transactional where possible and require a backup/export before destructive migration.
- **EDGE-TEST-001**: Core behavior → Cover default columns, protected endpoints, card ordering, archive limit, filtering, persistence, and API/UI parity.

## 4. Alternatives

- **ALT-001**: Browser IndexedDB as the only store — rejected for this plan because external local AI tools need a Node.js Express management API and the user has now allowed a backend database instead.
- **ALT-002**: Separate SQLite server/service — rejected because it adds a separate installation/service; use an embedded SQLite file.
- **ALT-003**: JSON file as the primary store — not selected because relational entities, transactional moves/imports, and concurrent API requests are better served by SQLite.
- **ALT-004**: Cloud database/synchronization — out of scope for the single-user localhost product.

## 5. Dependencies

- **DEP-001**: Node.js LTS runtime, version selected during Phase 1.
- **DEP-002**: Express for the local HTTP API.
- **DEP-003**: Embedded SQLite driver (proposed `better-sqlite3`); package must avoid requiring a separately installed/running database service and be compatible with the selected Node LTS.
- **DEP-004**: Chromium browser for UI verification.

## 6. Files

- **FILE-001**: `docs/kanban-feature-list.md` — product requirements source.
- **FILE-002**: `docs/answers.md` — user decisions and constraints.
- **FILE-003**: Project source files to be discovered; repository currently has no app implementation.
- **FILE-004**: `plan/feature-local-kanban-1/plan.md` — this implementation plan.
- **FILE-005**: `plan/feature-local-kanban-1/findings.md` — discovery findings and clarifications.

## 7. Testing

- **TEST-001**: Unit tests for validation, business rules, column ordering invariants, WIP limit behavior, labels, and card ordering.
- **TEST-002**: API integration tests for boards, columns, cards, search/filter, soft deletion, restore, and error responses.
- **TEST-003**: Persistence tests across Express process restart and database migration.
- **TEST-004**: Import/export round-trip and invalid-import atomicity.
- **TEST-005**: Chromium end-to-end tests for drag/drop, menu movement, archive visibility, filters, and board/card editing.
- **TEST-006**: Loopback-only network binding verification.

## 8. Risks & Assumptions

- **RISK-001**: The latest user decision permits a backend database instead of IndexedDB; this plan treats SQLite as the sole source of truth. If browser IndexedDB remains a hard requirement, the storage architecture must be revisited before implementation.
- **RISK-002**: `better-sqlite3` may need a compatible prebuilt native module or local build tools for some platforms. Confirm supported OS/Node combinations and installation experience; switch to another embedded option if no-install setup is not met.
- **RISK-003**: Localhost-only access narrows exposure but does not authenticate callers. Keep binding loopback-only, validate requests, and avoid allowing arbitrary remote origins.
- **RISK-004**: Soft deletion retention and explicit column deletion policy are not fully specified; decide before coding destructive workflows.
- **ASSUMPTION-001**: “Only local host is accessible” means the API binds to `127.0.0.1`/loopback, not `0.0.0.0`.
- **ASSUMPTION-002**: SQLite data is stored in an application-owned file and import/export provides the initial user-managed backup path.
- **ASSUMPTION-003**: Board and card deletes are soft deletes; retention duration and purge operation are decided before implementation.
- **ASSUMPTION-004**: Hard WIP limits reject additions/moves that exceed the configured limit; soft limits allow them and display a visible warning.

## 9. Related Specifications / Further Reading

- [Kanban feature list](../../docs/kanban-feature-list.md)
- [User answers](../../docs/answers.md)
- [Plan discovery findings](findings.md)
