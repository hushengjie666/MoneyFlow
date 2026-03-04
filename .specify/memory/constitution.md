<!--
Sync Impact Report
- Version change: 1.0.7 -> 1.0.8
- Modified principles:
  - N/A -> I. Code Quality as a Gate
  - N/A -> II. Test Standards Are Mandatory
  - N/A -> III. User Experience Consistency
  - N/A -> IV. Performance Budgets Are Requirements
  - N/A -> V. Maintainability Through Simplicity
- Added sections:
  - Quality & Delivery Constraints
  - Development Workflow & Review Policy
- Removed sections:
  - Placeholder template tokens and example comments
- Templates requiring updates:
  - [updated] .specify/templates/plan-template.md
  - [updated] .specify/templates/spec-template.md
  - [updated] .specify/templates/tasks-template.md
  - [pending] .specify/templates/commands/*.md (directory not present)
- Deferred TODOs:
  - None
-->
# MoneyFlowSpecKitV2 Constitution

## Core Principles

### I. Code Quality as a Gate
All production changes MUST meet repository quality gates before merge: formatting, linting,
static analysis, and code review. Pull requests MUST not be merged with unresolved critical
review comments or failing checks. Architectural shortcuts MUST be documented with explicit
tradeoffs and a tracked follow-up task.

Rationale: Enforced quality gates prevent avoidable regressions and preserve long-term velocity.

### II. Test Standards Are Mandatory
Every behavior change MUST include automated tests at the appropriate level (unit,
integration, or contract). Bug fixes MUST include a regression test that fails before the fix
and passes after it. Flaky tests MUST be fixed or quarantined with owner and expiration date
before release. A feature is NOT considered complete until newly added/updated tests are
executed and pass in the current branch.

Rationale: Reliable tests are the primary mechanism for safe iteration and change confidence.

### III. User Experience Consistency
User-facing behavior MUST remain consistent with established interaction patterns, naming,
error states, and accessibility expectations. New UI flows MUST define loading, empty,
error, and success states. Deviations from existing patterns MUST be intentional, documented,
and approved during review. Frontend layout MUST enforce container-safe rendering: child
elements MUST NOT visually overflow parent containers in normal viewport ranges; responsive
rules MUST prioritize containment over rigid non-wrapping.

Rationale: Consistency reduces user friction, support cost, and implementation ambiguity.

### IV. Performance Budgets Are Requirements
Features MUST define measurable performance budgets before implementation and validate them
before release. At minimum, each feature MUST specify a latency and resource target relevant
to its context (for example, response time, memory, or render time). Any budget breach MUST
block release unless an exception is approved and time-bound.

Rationale: Performance is a functional requirement, not a post-release optimization task.

### V. Maintainability Through Simplicity
Implementations MUST prefer the simplest design that satisfies current requirements.
Unnecessary abstraction, premature generalization, and duplicate logic MUST be avoided.
When complexity is required, the reason MUST be captured in planning artifacts.

Rationale: Simpler systems are easier to test, review, operate, and evolve.

## Quality & Delivery Constraints
- All feature specs MUST include measurable success criteria, including UX and performance
  outcomes where applicable.
- All implementation plans MUST include constitution checks before research and after design.
- All task breakdowns MUST include explicit quality, testing, UX consistency, and performance
  validation work.
- Release candidates MUST pass the full CI suite and any defined performance verification.

## Development Workflow & Review Policy
- Workflow order MUST remain: specify -> clarify (when needed) -> plan -> tasks -> analyze ->
  implement.
- Every functional change (new feature, behavior change, or requirement update) MUST follow the
  Speckit workflow end-to-end (`/speckit.specify` -> `/speckit.clarify` when needed ->
  `/speckit.plan` -> `/speckit.tasks` -> `/speckit.analyze` -> `/speckit.implement`) before merge.
- Code review MUST verify: requirement traceability, test adequacy, UX consistency, and
  performance budget coverage.
- Reviewers MUST reject completion claims when a functional change lacks corresponding test
  cases or when those tests were not executed and verified as passing.
- Changes that weaken any core principle MUST be rejected unless accompanied by a formally
  approved constitutional amendment.
- Post-merge defects MUST result in corrective tests and documented root-cause actions.
- Task completion responses MUST end with the following fixed completion banner (ASCII-safe),
  wrapped in a fenced code block with info string `text`:
  `============================================================`
  `任务完成提醒：<summary>`
  `============================================================`
  This block is mandatory and MUST be the last block in the final response so the user can
  unambiguously know the task is finished.

## Governance
This constitution supersedes conflicting local practices for specification, planning, and
implementation work in this repository.

Amendment policy:
- Amendments MUST be proposed via pull request with rationale, impact analysis, and migration
  notes for affected templates or workflows.
- Approval requires repository maintainers.
- Versioning policy follows semantic intent:
  - MAJOR: Backward-incompatible governance changes or principle removal/redefinition.
  - MINOR: New principle/section or materially expanded guidance.
  - PATCH: Clarifications and non-semantic wording improvements.

Compliance policy:
- Every implementation plan and review MUST include a constitution compliance check.
- Non-compliance discovered during planning, review, or analysis MUST be resolved before
  release.

**Version**: 1.0.9 | **Ratified**: 2026-03-03 | **Last Amended**: 2026-03-04
