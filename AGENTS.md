# AGENTS.md

## Purpose
This file is the single source of execution rules for this repository.
Every new conversation MUST start by applying this file before any code work.

## Mandatory Startup Checklist (Every New Conversation)
1. Read this `AGENTS.md` first.
2. Load the active feature spec folder under `specs/<feature-id>/` using minimal-read strategy first (index/target sections before full file).
3. Apply workflow order: `specify -> clarify (if needed) -> plan -> tasks -> analyze -> implement`.
4. Confirm constitution compliance before coding.
5. Confirm test scope and release gate before claiming completion.

If any required file is missing, state it explicitly and continue with the safest fallback.

## Rule Precedence
1. User explicit instruction (current task)
2. Constitution: `.specify/memory/constitution.md`
3. This `AGENTS.md`
4. Active feature docs in `specs/<feature-id>/`
5. Templates and helper scripts in `.specify/`

If conflicts exist, follow higher-priority rules and explain the conflict in the response.

## Default Low-Token Mode (Mandatory)
This repository defaults to low-token mode in all tasks and all new conversations unless the user explicitly requests full-detail mode.

### Low-Token Execution Rules
1. **Minimal read first**: prefer `rg`/`Select-String`/targeted line reads; avoid full-file `Get-Content -Raw` for large files unless required.
2. **Incremental context loading**: load only directly relevant files/sections first; expand scope only when blocked.
3. **Avoid duplicate reads**: do not repeatedly re-open the same large file unless content changed.
4. **Bounded search output**: narrow search path/patterns to reduce irrelevant matches.
5. **Test scope minimization by default**: run affected tests first during iteration; run full release gate commands only when claiming completion or when user requests full verification.
6. **Concise runtime reporting**: report key outcomes and failures only; avoid dumping long command output unless user asks.
7. **Single-pass edits**: batch related edits to reduce repeated scan/edit cycles.

### Mode Switching
- Default: `low-token mode` ON.
- If user explicitly asks for “full detail/full scan/full logs/full verification”, temporarily switch to full mode for that task only.
- After task ends, revert to default `low-token mode`.

## Spec-Kit Workflow (Mandatory)
All functional changes MUST follow Speckit flow end-to-end before merge:
1. `/speckit.specify`
2. `/speckit.clarify` (when requirements are ambiguous)
3. `/speckit.plan`
4. `/speckit.tasks`
5. `/speckit.analyze`
6. `/speckit.implement`

Do not skip steps for behavior changes, requirement changes, or new features.

## Normative Files Registry
The following files are normative for this project and MUST be referenced when applicable.

### A. Governance / Constitution
- `.specify/memory/constitution.md`
  - Core principles: code quality gate, mandatory testing, UX consistency, performance budgets, simplicity.
  - Includes mandatory completion-banner requirement.

### B. Spec-Kit Templates
- `.specify/templates/constitution-template.md`
- `.specify/templates/spec-template.md`
- `.specify/templates/plan-template.md`
- `.specify/templates/tasks-template.md`
- `.specify/templates/checklist-template.md`
- `.specify/templates/agent-file-template.md`

Usage rule:
- Use these templates for structure and traceability when creating/updating feature artifacts.

### C. Spec-Kit Scripts (PowerShell)
- `.specify/scripts/powershell/check-prerequisites.ps1`
- `.specify/scripts/powershell/create-new-feature.ps1`
- `.specify/scripts/powershell/setup-plan.ps1`
- `.specify/scripts/powershell/update-agent-context.ps1`
- `.specify/scripts/powershell/common.ps1`

Usage rule:
- Prefer these scripts for workflow setup/bootstrapping over ad-hoc manual steps.

### D. Active Feature Artifacts
- `specs/001-fund-flow-tracker/spec.md`
- `specs/001-fund-flow-tracker/plan.md`
- `specs/001-fund-flow-tracker/tasks.md`
- `specs/001-fund-flow-tracker/research.md`
- `specs/001-fund-flow-tracker/data-model.md`
- `specs/001-fund-flow-tracker/quickstart.md`
- `specs/001-fund-flow-tracker/contracts/openapi.yaml`
- `specs/001-fund-flow-tracker/usability-survey-template.csv`

Usage rule:
- `spec.md`: source of requirements and success criteria.
- `plan.md`: technical constraints + constitution checks.
- `tasks.md`: implementation and dependency ordering.
- `contracts/openapi.yaml`: API contract source of truth.
- `quickstart.md`: quality-gate execution evidence and operational notes.

### E. Testing Process Spec
- `TESTING.md`

Mandatory testing rules:
1. Add/update automated tests for each behavior change.
2. Run affected tests on current branch before completion claim.
3. Release gate requires:
   - `npm run lint`
   - `npm run test`
   - `npm run test:e2e`
4. If runtime processes are started for verification, terminate only test-created processes before ending task.

## Delivery and Quality Rules
1. No completion claim with failing lint/tests.
2. Bug fix MUST include regression coverage.
3. UX changes MUST include loading/empty/error/success considerations.
4. Performance-sensitive changes MUST preserve or re-check budget expectations.
5. Keep solutions simple; avoid unnecessary abstractions.
6. Cross-component consistency is mandatory: when a feature uses a shared data source (e.g., main page and widget), every change MUST include an explicit check and necessary updates for all related components.
7. When task changes involve Rust runtime code (`src-tauri/**`), the agent MUST restart the desktop client once after implementation so the user can verify the actual runtime behavior, unless the user explicitly asks not to restart.

## Response Format Rules (Mandatory)
1. Final task responses MUST end with fixed completion banner.
2. The completion banner MUST be wrapped in a fenced code block with info string `text` (to avoid Markdown rendering issues).
3. Use exactly this final block format:

```text
============================================================
任务完成提醒：<summary>
============================================================
```

This block is mandatory and must be the last block in the final response.

## Conversation Persistence Rule
This `AGENTS.md` is persistent project policy.
Even in a newly opened conversation, these rules MUST be applied before development work.

## Skills (Session-Available)
- skill-creator: `C:/Users/hudashuai/.codex/skills/.system/skill-creator/SKILL.md`
- skill-installer: `C:/Users/hudashuai/.codex/skills/.system/skill-installer/SKILL.md`

Skill usage rule:
- If user names a skill or task clearly matches skill description, load and follow that skill in the current turn.
