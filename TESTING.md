# Testing Specification And Process

## Scope

This repository is now frontend-only. Automated testing covers:

- `unit`: pure client logic (formatters, jump rules, api-client behavior)
- `integration`: UI structure/interaction wiring and layout safety checks
- `e2e`: frontend smoke verification of entry page and core user flow anchors

## Test Commands

Run from repository root:

```bash
npm run lint
npm run test
npm run test:e2e
```

Or run all gates:

```bash
npm run test:all
```

## Release Gate

Release-ready means:

- `npm run lint` passes
- `npm run test` passes
- `npm run test:e2e` passes

## Feature Completion Rule (Mandatory)

After every functional change, you MUST:

1. Add or update automated test cases (unit/integration/e2e as appropriate).
2. Execute related test commands on current branch.
3. Confirm affected tests pass before marking the feature complete.
