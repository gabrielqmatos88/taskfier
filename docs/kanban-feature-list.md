# Local Kanban Application — Feature List

**Purpose:** Product-requirements handoff for creating a future development plan. This is a feature inventory, not an implementation plan. Requirements explicitly stated by the requester are marked **Confirmed**; useful extensions are **Suggestions**; product choices that still need an answer are **Open questions**. Suggestions must not be treated as approved scope.

## 1. Product goal

A small, locally run Kanban application for organizing work across multiple boards. Board and card data must persist in IndexedDB. Users should be able to organize cards with editable columns, use an archive without crowding the active board, and manage cards through both direct manipulation and menus.

## 2. Confirmed baseline requirements

### 2.1 Boards

- **REQ-BOARD-001 — Multiple boards:** Users can create and use more than one board.
- **REQ-BOARD-002 — Board title:** Each board has a title.
- **REQ-BOARD-003 — Board background:** Users can change a board's background. The supported background types remain to be decided.

### 2.2 Columns

- **REQ-COL-001 — Default columns:** A new board starts with these columns in this order: **Backlog, To Do, WIP, Done, Archive**.
- **REQ-COL-002 — Custom columns:** Users can add columns to fit their workflow. Rename, reorder, and delete behavior needs product clarification.
- **REQ-COL-003 — Archive visibility:** The Archive column shows the latest 10 archived cards by default. Older archived cards remain hidden until the user asks to see more/all archived cards.

### 2.3 Cards

- **REQ-CARD-001 — Card details:** Each card has a title and description.
- **REQ-CARD-002 — Card colors:** A card can use one of these background colors: yellow (default), green, red, blue, purple, gray, or white.
- **REQ-CARD-003 — Labels:** Cards support labels. Label creation, color, scope, and assignment rules need clarification.
- **REQ-CARD-004 — Card lifecycle:** Users can create and delete cards.
- **REQ-CARD-005 — Move cards:** Users can move cards between columns by drag and drop, or by a card context menu / three-dot menu. The menu provides a way to choose the destination column.
- **REQ-CARD-006 — Ordering:** Cards can be placed in columns. Whether users can manually reorder cards within a column, and how ordering works after a move, needs clarification.

### 2.4 Local persistence and API

- **REQ-DATA-001 — IndexedDB persistence:** Board, column, and card data is stored locally in IndexedDB and is available again after a reload or application restart.
- **REQ-API-001 — Local API:** The application has a local API for board and card operations. At minimum it supports creating boards, creating cards, and deleting cards. Because the requested UI also edits board backgrounds, card details/colors, columns, and card positions, the API must support the corresponding read/update/move operations as well. The API boundary and transport are open questions; do not assume that “local API” means a separate HTTP server.

## 3. Suggested features for consideration

These are candidates for product discussion, not confirmed requirements. Select the ones that improve the intended small/local experience; avoid silently expanding scope.

### 3.1 Card workflow

- Optional priority, due date, checklist, and completion state.
- Card detail view for editing title, description, labels, color, and any approved extra fields.
- Search and filtering by text, label, color, priority, or due date.
- Restore a card from Archive to an active column.
- Optional per-column WIP limits and an indicator when a limit is exceeded.

### 3.2 Board and column workflow

- Rename, reorder, and delete custom columns.
- Copy/duplicate a board, if repeated workflows are common.
- Board-level search/filter and a simple board switcher.
- Optional configurable column limits or other workflow rules.

### 3.3 Usability and data safety

- Keyboard-accessible alternatives for drag and drop and context-menu actions; visible three-dot controls should work on touch devices where right-click is unavailable.
- Undo for accidental moves or deletes, or a confirmation step for destructive actions.
- Export/import or backup/restore for locally stored boards.
- Clear empty states, saved-state feedback, and recoverable errors when IndexedDB operations fail.
- Responsive layout for the target screen sizes, once the supported devices are decided.

## 4. Behavior notes for future requirements refinement

- “Latest 10” needs a defined ordering rule. A likely interpretation is the 10 most recently archived cards, but that is a proposal, not a confirmed rule.
- Hidden archive cards should not be silently deleted. Whether users can expand the list, paginate it, search it, restore cards, or permanently delete them needs clarification.
- Moving a card must persist its destination column and position. The UI and API should agree on the same ordering behavior.
- Drag and drop, the context menu, and the three-dot menu should not create different move semantics; the precise menu layout is open.
- Deleting a column that contains cards needs an explicit outcome so cards are not accidentally lost.
- IndexedDB is browser-local storage, not by itself a standalone backend service. The term “local backend/API” needs a shared definition before implementation planning.

## 5. Decisions from `docs/answers.md`

These answers are confirmed product decisions and supersede any earlier open-question wording above.

- **Q-001 — Backend/API:** Run a Node.js Express API for management so external tools, including AI skills, can register tasks. Keep access local to the host. Required API operations stated so far: list boards, list columns for a board, and create cards in columns. The persistence strategy is still open: IndexedDB is required by the original request, while a small database or another local strategy was also suggested. Resolve whether IndexedDB remains the source of truth and how Express accesses it before planning.
- **Q-002 — Platform:** Chromium-based browsers only; touch-screen support is not required.
- **Q-003 — Archive:** Show the 10 most recently archived cards by default. Older cards remain hidden unless requested. The answer does not specify restore/permanent-delete behavior or how to reveal all older items.
- **Q-004 — Columns:** Users can add, rename, and reorder columns. Backlog is fixed first and Archive fixed last; neither can be reordered or removed. Column deletion and handling of its cards remain undecided.
- **Q-005 — Card features:** Priority, due dates, checklists, and completion state are desired. Attachments and comments are future possibilities, not mandatory initially.
- **Q-006 — API scope:** List boards, list columns on a board, and create cards in a column. Other API operations and whether the API is formally documented remain to be specified.
- **Q-007 — Background:** Board background is a color.
- **Q-008 — Ordering and WIP:** Cards can be manually reordered; new cards appear at the top. Columns have a three-dot configuration menu and a WIP limit that can be soft or hard. Soft-limit visual thresholds/indicators need definition.
- **Q-009 — Use model:** Single-user, local-host-only use; intended to integrate with AI skills that create boards for plans and populate them with tasks. Multi-device sync and collaboration are not required by this answer.
- **Q-010 — Portability and scale:** Import/export should be planned. Boards are expected to stay relatively small, often one board per plan. The backend may use a small database or another local persistence strategy, subject to resolving the IndexedDB requirement above.
- **Q-011 — Deletion:** Deletion requires confirmation; soft deletion is preferred. Retention and recovery rules still need definition.
- **Q-012 — Discovery:** Search by title/description; filter by labels or deadlines.
- **Q-013 — Input/accessibility:** No touch-screen use is expected. Keyboard accessibility was not explicitly decided.
- **Q-014 — Labels:** Users can create labels on demand and assign multiple labels to a card for filtering.

## 6. Remaining questions for planning

1. **Persistence/API boundary:** Does the explicit IndexedDB requirement remain mandatory alongside the Express API? If so, should the browser own IndexedDB and Express call the browser, or is a separate local database intended to replace IndexedDB? A server cannot directly access a browser's IndexedDB.
2. **Archive actions:** How do users reveal older archived cards, restore them, and permanently delete them?
3. **Column deletion:** Can custom columns be deleted, and where do their cards go? Are To Do, WIP, and Done renameable/removable?
4. **WIP thresholds:** What counts toward a limit, and what visual states/colors indicate soft-limit warnings versus hard-limit blocking?
5. **Deletion lifecycle:** How long are soft-deleted boards/cards retained, and can users restore them?
6. **Card/API contract:** Which card fields must external AI tools be able to set (including labels, deadlines, colors, and ordering), and which update/delete/move operations must the Express API expose?
7. **Import/export:** Which format(s) and scope are expected (single board or all local data)?
8. **Keyboard accessibility:** Should drag/drop and menu actions have keyboard alternatives despite desktop-only use?

## 7. Ready-for-planning checklist

A future development plan should resolve or record assumptions for the remaining questions above. It should define:

- The initial release scope versus future attachments/comments.
- Board, column, card, label, archive, and soft-deletion lifecycle rules.
- How the Express API and required local persistence work together.
- API operations and fields needed by the UI and AI skills.
- Soft/hard WIP-limit behavior and card ordering.
- Import/export, deletion recovery, and acceptance criteria for persistence and archive visibility.

