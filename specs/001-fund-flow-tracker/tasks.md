# Tasks: 资金动向登记与实时余额看板

**Input**: Design documents from `/specs/001-fund-flow-tracker/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are REQUIRED. Every user story includes automated tests and regression coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and baseline tooling

- [X] T001 Initialize Node + Vite workspace and scripts in `package.json`
- [X] T002 Create frontend/backend/test directory skeleton in `frontend/`, `backend/`, `tests/`
- [X] T003 [P] Configure lint rules in `.eslintrc.cjs`
- [X] T004 [P] Configure format rules in `.prettierrc`
- [X] T005 [P] Configure Vitest runtime in `vitest.config.js`
- [X] T006 Add Vite entry shell for app bootstrap in `frontend/index.html`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**?? CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement SQLite connection and schema bootstrap in `backend/src/db.js`
- [X] T008 [P] Implement shared money/time validation helpers in `backend/src/lib/validators.js`
- [X] T009 [P] Implement shared response/error helpers in `backend/src/lib/http.js`
- [X] T010 Implement snapshot repository primitives in `backend/src/repositories/snapshot-repository.js`
- [X] T011 [P] Implement event repository primitives in `backend/src/repositories/event-repository.js`
- [X] T012 Implement deterministic balance calculation engine in `backend/src/services/balance-service.js`
- [X] T013 [P] Wire API router registration in `backend/src/routes/index.js`
- [X] T014 Implement backend HTTP server bootstrap in `backend/src/server.js`
- [X] T015 [P] Add contract baseline test harness for OpenAPI in `tests/contract/openapi-contract.test.js`
- [X] T052 [P] Add validators to reject forbidden identity fields (`userId`, `accountId`) in `backend/src/lib/validators.js`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 初始化并查看当前存款 (Priority: P1) ?? MVP

**Goal**: 用户可以初始化存款并在主页查看最新存款

**Independent Test**: 首次录入初始化存款后刷新页面，余额保持一致显示

### Tests for User Story 1 (REQUIRED)

- [X] T016 [P] [US1] Add contract tests for `GET/PUT /api/snapshot` in `tests/contract/snapshot-contract.test.js`
- [X] T017 [P] [US1] Add integration test for snapshot init and reload flow in `tests/integration/snapshot-flow.test.js`
- [X] T018 [P] [US1] Add unit tests for snapshot validation edge cases in `tests/unit/snapshot-validation.test.js`

### Implementation for User Story 1

- [X] T019 [US1] Implement snapshot service orchestration in `backend/src/services/snapshot-service.js`
- [X] T020 [US1] Implement snapshot routes (`GET/PUT /api/snapshot`) in `backend/src/routes/snapshot-routes.js`
- [X] T021 [P] [US1] Implement frontend API client for snapshot endpoints in `frontend/src/api-client.js`
- [X] T022 [P] [US1] Implement balance formatter utilities in `frontend/src/formatters.js`
- [X] T023 [US1] Implement homepage initialization/deposit interaction in `frontend/src/main.js`
- [X] T024 [US1] Implement empty/loading/error/success UI states for snapshot flow in `frontend/src/styles.css`

**Checkpoint**: User Story 1 should be independently functional and testable

---

## Phase 4: User Story 2 - 登记一次性资金入项/出项 (Priority: P1)

**Goal**: 用户可以新增一次性入项/出项并看到余额更新

**Independent Test**: 添加一条一次性事件后，余额在 2 秒内正确变化

### Tests for User Story 2 (REQUIRED)

- [X] T025 [P] [US2] Add contract tests for `POST /api/events` (one_time) in `tests/contract/events-create-contract.test.js`
- [X] T026 [P] [US2] Add integration tests for one-time inflow/outflow balance updates in `tests/integration/one-time-event-flow.test.js`
- [X] T027 [P] [US2] Add unit tests for one-time event validation rules in `tests/unit/one-time-event-validation.test.js`
- [X] T053 [P] [US2] Add contract tests to reject `userId/accountId` in write payloads in `tests/contract/single-user-contract.test.js`

### Implementation for User Story 2

- [X] T028 [US2] Implement event service create/list logic for one-time events in `backend/src/services/event-service.js`
- [X] T029 [US2] Implement event routes (`POST/GET /api/events`) for one-time flows in `backend/src/routes/event-routes.js`
- [X] T030 [P] [US2] Implement one-time event form and submit actions in `frontend/src/main.js`
- [X] T031 [P] [US2] Implement one-time event form styles and validation feedback in `frontend/src/styles.css`
- [X] T032 [US2] Integrate one-time event writes with snapshot recomputation in `backend/src/services/snapshot-service.js`

**Checkpoint**: User Story 2 should be independently functional and testable

---

## Phase 5: User Story 3 - 登记周期性资金事件并驱动实时跳动 (Priority: P1)

**Goal**: 用户可以登记周期性事件，首页按秒持续跳动

**Independent Test**: 创建一条周期事件后，首页金额每秒变化且符合线性分摊规则

### Tests for User Story 3 (REQUIRED)

- [X] T033 [P] [US3] Add contract tests for recurring event fields in `tests/contract/events-recurring-contract.test.js`
- [X] T034 [P] [US3] Add integration tests for recurring event create/pause/delete and balance tick in `tests/integration/recurring-event-flow.test.js`
- [X] T035 [P] [US3] Add unit tests for linear-per-second proration math in `tests/unit/recurring-proration.test.js`
- [X] T054 [P] [US3] Add integration tests for Asia/Shanghai timezone boundary handling in `tests/integration/timezone-boundary-flow.test.js`

### Implementation for User Story 3

- [X] T036 [US3] Extend event service for recurring event lifecycle (`active/paused/deleted`) in `backend/src/services/event-service.js`
- [X] T037 [US3] Implement event update route (`PATCH /api/events/{id}`) for pause/resume/soft-delete in `backend/src/routes/event-routes.js`
- [X] T038 [US3] Implement realtime balance tick endpoint (`GET /api/realtime-balance`) in `backend/src/routes/realtime-routes.js`
- [X] T039 [P] [US3] Implement frontend realtime polling and tick rendering loop in `frontend/src/balance-engine.js`
- [X] T040 [US3] Integrate recurring event form controls and realtime display updates in `frontend/src/main.js`
- [X] T055 [US3] Ensure event persistence and balance calculation consistently apply local timezone (`Asia/Shanghai`) in `backend/src/services/event-service.js`

**Checkpoint**: User Story 3 should be independently functional and testable

---

## Phase 6: User Story 4 - 查看资金事件与最新存款数据 (Priority: P2)

**Goal**: 用户可以查看最新存款与近期事件摘要，理解余额来源

**Independent Test**: 打开主页可见最新存款与近期事件列表，且与后台数据一致

### Tests for User Story 4 (REQUIRED)

- [X] T041 [P] [US4] Add contract tests for `GET /api/events` query/filter behavior in `tests/contract/events-list-contract.test.js`
- [X] T042 [P] [US4] Add integration tests for latest snapshot + recent events rendering in `tests/integration/dashboard-summary-flow.test.js`
- [X] T043 [P] [US4] Add unit tests for event summary mapping/ordering in `tests/unit/event-summary-mapper.test.js`

### Implementation for User Story 4

- [X] T044 [US4] Implement recent-events query and ordering in `backend/src/services/event-service.js`
- [X] T045 [US4] Add recent-event summary payload support in `backend/src/routes/event-routes.js`
- [X] T046 [P] [US4] Implement recent-event list rendering logic in `frontend/src/main.js`
- [X] T047 [P] [US4] Implement recent-event list and latest-balance presentation styles in `frontend/src/styles.css`

**Checkpoint**: User Story 4 should be independently functional and testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T048 [P] Add performance benchmark tests for p95 balance computation in `tests/integration/performance-budget.test.js`
- [X] T049 [P] Add accessibility checks for loading/empty/error/success states in `tests/integration/ux-state-a11y.test.js`
- [X] T050 Run full quality gates (`lint`, `test`, contract validation) and document results in `specs/001-fund-flow-tracker/quickstart.md`
- [X] T051 [P] Update implementation notes and endpoint examples in `specs/001-fund-flow-tracker/quickstart.md`
- [X] T056 [P] Add usability survey template and scoring rubric for SC-005 in `specs/001-fund-flow-tracker/quickstart.md`
- [ ] T057 Execute internal usability run (n>=20) and record SC-005 pass/fail evidence in `specs/001-fund-flow-tracker/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories
- **Phase 3-6 (User Stories)**: Depend on Phase 2 completion; execute in priority order for incremental delivery
- **Phase 7 (Polish)**: Depends on all selected user stories completed

### User Story Dependencies

- **US1 (P1)**: Starts after Foundation; no dependency on other stories
- **US2 (P1)**: Starts after Foundation; depends on US1 snapshot baseline behavior
- **US3 (P1)**: Starts after Foundation; depends on US2 event pipeline for shared event primitives
- **US4 (P2)**: Starts after Foundation; depends on US2/US3 event read models

### Within Each User Story

- Write tests first and confirm they fail
- Implement backend service/repository logic before route wiring
- Implement frontend API usage before UI binding
- Finish story-level integration and regression before moving onward

### Parallel Opportunities

- Setup and foundational tasks marked `[P]` can run concurrently
- Contract, integration, and unit tests within each story marked `[P]` can run concurrently
- Frontend style tasks and backend service tasks in different files marked `[P]` can run concurrently

---

## Parallel Example: User Story 3

```bash
# Parallel test authoring
Task: "T033 [US3] in tests/contract/events-recurring-contract.test.js"
Task: "T034 [US3] in tests/integration/recurring-event-flow.test.js"
Task: "T035 [US3] in tests/unit/recurring-proration.test.js"

# Parallel implementation on different files
Task: "T038 [US3] in backend/src/routes/realtime-routes.js"
Task: "T039 [US3] in frontend/src/balance-engine.js"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Validate `GET/PUT /api/snapshot` and homepage latest balance display
4. Demo/release MVP baseline

### Incremental Delivery

1. Deliver US1 (初始化存款 + 最新余额)
2. Deliver US2 (一次性入/出项)
3. Deliver US3 (周期事件 + 实时跳动)
4. Deliver US4 (近期事件摘要)
5. Complete Phase 7 polish and performance gates

### Parallel Team Strategy

1. Team jointly completes Setup + Foundational
2. Then split by story/file ownership:
   - Dev A: Backend routes/services for current story
   - Dev B: Frontend UI + interaction for current story
   - Dev C: Contract/integration/unit tests
