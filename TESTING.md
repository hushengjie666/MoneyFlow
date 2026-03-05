# Testing Specification And Process

## Scope

This project uses layered automated testing plus one manual evidence gate:

- `unit`: pure logic (validation, proration math, format mapping)
- `integration`: API behaviors with in-memory DB, UX state hooks, performance budget
- `contract`: endpoint shape/behavior aligned with `contracts/openapi.yaml`
- `e2e`: full user journey over real HTTP + SQLite file with restart persistence check
- `manual`: SC-005 usability survey (`n>=20`) with evidence record in `quickstart.md`

## Test Commands

Run from repository root:

```bash
npm run lint
npm run test
npm run test:e2e
```

Or run all automated gates in one command:

```bash
npm run test:all
```

## E2E Flow Definition

`tests/e2e/full-user-journey.e2e.test.js` validates:

1. Initialize snapshot (`PUT /api/snapshot`)
2. Create one-time outflow event (`POST /api/events`)
3. Create recurring inflow event (`POST /api/events`)
4. Verify realtime balance tick (`GET /api/realtime-balance`)
5. Soft delete recurring event (`PATCH /api/events/{id}`)
6. Verify balance recomputes correctly
7. Restart server with same SQLite file and verify data persistence

## Release Gate

Release-ready means:

- `npm run lint` passes
- `npm run test` passes
- `npm run test:e2e` passes
- SC-005 survey evidence is recorded (manual gate)

If SC-005 evidence is not yet available, release can proceed only as an internal build with an explicit open manual-evidence follow-up item.

## Feature Completion Rule (Mandatory)

After every functional development change, you MUST:

1. Add or update corresponding automated test cases (unit/integration/contract/e2e as appropriate).
2. Execute the related test commands on the current branch.
3. Confirm all newly affected tests pass before marking the feature as complete.

A change is not considered complete if tests are missing or unverified.

## Process Cleanup Rule (Mandatory)

After finishing any startup, integration, or E2E verification that launches runtime processes, you MUST terminate all test-created processes before ending the task.

Important boundary:

- Do NOT stop pre-existing user development processes (for example processes already running in VSCode before test execution).
- Only stop processes created during the current test run.
- If validation requires refresh, prefer restart/reload of the same process instead of full shutdown.

Minimum cleanup checklist:

1. Stop frontend dev server processes (for example `npm run dev` / Vite).
2. Stop backend API processes (for example `npm run dev:api` / Node server).
3. Verify test ports are released (current project defaults: `5173`, `8787`).
4. Confirm no leftover test terminals/processes remain.

This cleanup is required even when tests pass.
