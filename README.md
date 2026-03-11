# MoneyFlow

MoneyFlow is a desktop-first cashflow tracker built with `Tauri 2 + Vite`. It helps a single user record one-time and recurring fund movements, then shows a continuously updating balance driven by those events.

## Current Scope

- Initialize and display the latest balance baseline
- Record one-time income and expense events
- Record recurring cashflow events
- Recalculate balance with shared jump-flow rules
- Support desktop runtime through Tauri

## Tech Stack

- Frontend: `Vite`, vanilla JavaScript, HTML, CSS
- Desktop shell: `Tauri 2`
- Native layer: `Rust`
- Testing: `Vitest`
- Specs and workflow: `Spec-Kit`

## Project Structure

```text
frontend/        Frontend entry, UI logic, styles, widget page
src-tauri/       Tauri and Rust desktop runtime
tests/           Unit and e2e tests
specs/           Feature specs, plans, tasks, analysis artifacts
scripts/         Repository helper scripts
```

## Getting Started

### Prerequisites

- `Node.js` 22 LTS
- `npm`
- `Rust` toolchain
- Platform build dependencies for `Tauri 2`

Windows:

- Microsoft C++ Build Tools
- WebView2 runtime

macOS:

- Xcode Command Line Tools

## Install

```bash
npm ci
```

## Run In Browser Dev Mode

```bash
npm run dev
```

## Run As Desktop App

```bash
npm run tauri:dev
```

## Build

Debug desktop build:

```bash
npm run tauri:build
```

Full bundle build:

```bash
npm run tauri:build:full
```

## Quality Gate

```bash
npm run lint
npm run test
npm run test:e2e
```

Or run the combined gate:

```bash
npm run test:all
```

## Important Scripts

- `npm run dev`: start Vite dev server
- `npm run tauri:dev`: start desktop app in development mode
- `npm run build`: build frontend assets
- `npm run tauri:build`: build desktop app without full bundling
- `npm run tauri:build:full`: build desktop app bundles
- `npm run lint`: run ESLint
- `npm run test`: run Vitest suite
- `npm run test:e2e`: run frontend smoke e2e test

## Product Naming

Current desktop product name in Tauri config is `MoneyFlow`.

## Specification Source

The active core feature documentation lives under:

```text
specs/001-fund-flow-tracker/
```

This repository follows the `specify -> clarify -> plan -> tasks -> analyze -> implement` workflow defined by the project governance files in `.specify/` and `AGENTS.md`.
