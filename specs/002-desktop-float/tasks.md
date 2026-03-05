# Tasks: 桌面悬浮小组件适配

**Input**: Design documents from `/specs/002-desktop-float/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are REQUIRED. Every user story includes automated tests and regression coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Introduce minimal desktop shell scaffold with least dependencies

- [X] T001 Add Tauri minimal dependencies and scripts (`tauri:dev`, `tauri:build`) in `package.json`
- [X] T002 Create Tauri scaffold files in `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`
- [X] T003 [P] Add widget entry files in `frontend/src/widget/widget-main.js` and `frontend/src/widget/widget-styles.css`
- [X] T004 [P] Add desktop run notes in `specs/002-desktop-float/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core desktop runtime and shared primitives required by all stories

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement Tauri multi-window bootstrap and main/widget window registration in `src-tauri/src/main.rs`
- [X] T006 [P] Implement widget preference read/write primitives (JSON file) in `src-tauri/src/preference_store.rs`
- [X] T007 [P] Implement widget window behavior primitives (show/hide/focus/topmost/position bounds check) in `src-tauri/src/widget_window.rs`
- [X] T008 Implement frontend widget API bridge wrapper (only Tauri core API usage) in `frontend/src/widget/widget-bridge.js`
- [X] T009 [P] Extend existing API client for widget realtime snapshot polling in `frontend/src/api-client.js`
- [X] T010 Add shared widget state model and error-state mapper in `frontend/src/widget/widget-state.js`
- [X] T011 [P] Add Rust unit test harness for preference/window primitives in `src-tauri/src/preference_store.rs` and `src-tauri/src/widget_window.rs`

**Checkpoint**: Desktop foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 桌面悬浮实时余额展示 (Priority: P1) MVP

**Goal**: Widget continuously shows latest balance on desktop with clear states

**Independent Test**: Open widget and verify per-second update plus loading/empty/error/success states

### Tests for User Story 1 (REQUIRED)

- [X] T012 [P] [US1] Add unit tests for widget balance state transitions in `tests/unit/widget-balance-state.test.js`
- [X] T013 [P] [US1] Add integration test for widget realtime polling and 2s update latency in `tests/integration/widget-realtime-flow.test.js`
- [X] T014 [P] [US1] Add integration regression test for API unavailable/error recovery in `tests/integration/widget-api-error-flow.test.js`

### Implementation for User Story 1

- [X] T015 [US1] Implement widget realtime loop and tick rendering in `frontend/src/widget/widget-main.js`
- [X] T016 [P] [US1] Implement widget display states (loading/empty/error/success) in `frontend/src/widget/widget-main.js`
- [X] T017 [P] [US1] Implement widget visual style and readability rules in `frontend/src/widget/widget-styles.css`
- [X] T018 [US1] Reuse existing currency formatter for widget display consistency in `frontend/src/formatters.js`

**Checkpoint**: User Story 1 should be independently functional and testable

---

## Phase 4: User Story 2 - 悬浮组件通用交互控制 (Priority: P1)

**Goal**: Widget supports drag, topmost toggle, collapse/expand, close/hide

**Independent Test**: Complete all common floating interactions in one session without crash

### Tests for User Story 2 (REQUIRED)

- [X] T019 [P] [US2] Add Rust unit tests for topmost/collapse/window visibility transitions in `src-tauri/src/widget_window.rs`
- [X] T020 [P] [US2] Add integration test for widget interaction commands in `tests/integration/widget-interaction-flow.test.js`
- [X] T021 [P] [US2] Add UX/a11y regression test for widget control accessibility labels and keyboard fallback in `tests/integration/widget-a11y-controls.test.js`

### Implementation for User Story 2

- [X] T022 [US2] Implement Tauri commands for topmost/collapse/show/hide/focus in `src-tauri/src/main.rs`
- [X] T023 [P] [US2] Implement widget control handlers (topmost, collapse, close) in `frontend/src/widget/widget-main.js`
- [X] T024 [P] [US2] Implement compact mode styles and interaction affordances in `frontend/src/widget/widget-styles.css`
- [X] T025 [US2] Wire main-window activation from widget quick control in `src-tauri/src/widget_window.rs` and `frontend/src/widget/widget-main.js`

**Checkpoint**: User Story 2 should be independently functional and testable

---

## Phase 5: User Story 3 - 组件快速操作与主应用联动 (Priority: P2)

**Goal**: Widget can open main app and trigger quick ledger actions with data consistency

**Independent Test**: Trigger quick action in widget and verify event appears in main app with consistent balance

### Tests for User Story 3 (REQUIRED)

- [X] T026 [P] [US3] Add integration test for widget->main window focus action in `tests/integration/widget-open-main-flow.test.js`
- [X] T027 [P] [US3] Add integration test for quick event creation from widget and snapshot consistency in `tests/integration/widget-quick-event-flow.test.js`
- [X] T028 [P] [US3] Add contract regression test to ensure existing `POST /api/events` behavior is unchanged in `tests/contract/events-create-contract.test.js`

### Implementation for User Story 3

- [X] T029 [US3] Implement widget quick-action panel and submit flow in `frontend/src/widget/widget-main.js`
- [X] T030 [P] [US3] Extend frontend API client with lightweight quick-event helper in `frontend/src/api-client.js`
- [X] T031 [US3] Add backend validation path check for widget-origin quick action payloads in `backend/src/lib/validators.js`
- [X] T032 [P] [US3] Add visual feedback for quick action success/failure in `frontend/src/widget/widget-styles.css`

**Checkpoint**: User Story 3 should be independently functional and testable

---

## Phase 6: User Story 4 - 组件状态持久化与恢复 (Priority: P2)

**Goal**: Persist widget preferences and reliably restore visible state after restart

**Independent Test**: Change widget preferences, restart app, and verify restoration and out-of-bounds recovery

### Tests for User Story 4 (REQUIRED)

- [X] T033 [P] [US4] Add Rust unit tests for preference serialization/default fallback in `src-tauri/src/preference_store.rs`
- [X] T034 [P] [US4] Add integration test for preference persistence across restart in `tests/integration/widget-preference-persistence.test.js`
- [X] T035 [P] [US4] Add integration test for off-screen position recovery in `tests/integration/widget-screen-recovery.test.js`

### Implementation for User Story 4

- [X] T036 [US4] Implement widget preference save/load command wiring in `src-tauri/src/main.rs`
- [X] T037 [P] [US4] Implement startup strategy config (auto-start/manual-open-only) in `src-tauri/tauri.conf.json` and `src-tauri/src/main.rs`
- [X] T038 [P] [US4] Persist UI preference updates from widget controls in `frontend/src/widget/widget-main.js`
- [X] T039 [US4] Implement out-of-bounds correction logic before widget show in `src-tauri/src/widget_window.rs`

**Checkpoint**: User Story 4 should be independently functional and testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening across stories and release evidence

- [X] T040 [P] Add performance budget test for widget refresh/interaction latency in `tests/integration/widget-performance-budget.test.js`
- [X] T041 [P] Add cross-platform desktop smoke checklist (Windows/macOS/Linux) in `specs/002-desktop-float/quickstart.md`
- [X] T042 Validate minimal dependency policy and record justification in `specs/002-desktop-float/research.md`
- [X] T043 Run full quality gates (`npm run lint`, `npm run test`, `npm run test:e2e`) plus `cargo test`, and document results in `specs/002-desktop-float/quickstart.md`
- [X] T044 [P] Update final implementation notes, known limits, and release checklist in `specs/002-desktop-float/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories
- **Phase 3-6 (User Stories)**: Depend on Phase 2 completion; execute by priority
- **Phase 7 (Polish)**: Depends on all selected user stories completed

### User Story Dependencies

- **US1 (P1)**: Starts after Foundation; no dependency on other stories
- **US2 (P1)**: Starts after Foundation; depends on base widget window lifecycle from US1
- **US3 (P2)**: Starts after Foundation; depends on US1 display loop and US2 interaction commands
- **US4 (P2)**: Starts after Foundation; can run alongside US3 but validates full widget lifecycle

### Within Each User Story

- Write tests first and ensure they fail
- Implement Rust/Tauri command primitives before frontend wiring
- Implement frontend behavior before UX refinements
- Complete story-level regression verification before moving on

### Parallel Opportunities

- Setup and foundational tasks marked `[P]` can run in parallel
- Story-level test tasks marked `[P]` can run in parallel
- Rust and frontend tasks in different files marked `[P]` can run in parallel

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Validate widget realtime display + state handling
4. Demo desktop widget MVP

### Incremental Delivery

1. Deliver US1 (desktop realtime visibility)
2. Deliver US2 (common floating interactions)
3. Deliver US3 (quick actions and app linkage)
4. Deliver US4 (persistence and restart recovery)
5. Complete Phase 7 quality and release checks

### Parallel Team Strategy

1. Team completes setup/foundation together
2. Split execution by area:
   - Dev A: Rust/Tauri window and preference commands
   - Dev B: Widget frontend UI and interactions
   - Dev C: Integration/e2e/regression tests
