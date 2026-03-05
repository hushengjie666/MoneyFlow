# Quickstart: 桌面悬浮小组件适配

## 1. Prerequisites

- Node.js 22+
- npm 8+
- Rust stable toolchain (`rustup`, `cargo`)
- Tauri prerequisites for your OS (WebView + build tools)
- Windows/macOS/Linux desktop environment

## 2. Install Dependencies

```bash
npm install
```

## 3. Suggested Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "dev:api": "node backend/src/server.js",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test": "vitest run",
    "test:e2e": "vitest run tests/e2e/full-user-journey.e2e.test.js",
    "lint": "eslint ."
  }
}
```

## 4. Run Desktop Widget Development

```bash
# Terminal A
npm run dev:api

# Terminal B
npm run tauri:dev
```

## 5. Verification Checklist

- Widget can be shown on desktop and displays latest balance.
- Widget updates balance every second while visible.
- Widget supports drag, topmost toggle, collapse/expand, close/hide.
- Widget can focus/open main window.
- Widget preference persists after restart.
- Off-screen widget position can recover to visible screen.
- Error state appears when API is unavailable and allows retry.

## 6. Performance Budget Checks

- Visible refresh interval <= 1 second
- Data change to visible update < 2 seconds
- Interaction feedback < 100ms (drag/toggle/collapse)

## 7. Quality Gate Commands

```bash
npm run lint
npm run test
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
```

## 8. Analyze-Phase Notes

- No new backend REST endpoints are required for MVP widget features.
- Widget IPC contract is documented in `contracts/widget-ipc.yaml`.
- Dependency policy: only Tauri core dependencies are allowed for desktop shell.

## 9. Quality Gate Results (2026-03-04)

Executed:

```bash
npm run lint
npm run test
npm run test:e2e
```

Result summary:

- `lint`: PASS
- `test`: PASS (33 test files / 60 tests)
- `test:e2e`: PASS (1/1)
- `cargo test`: FAIL（`cargo` 可执行；切换到 `x86_64-pc-windows-msvc` 后报 `link.exe` 缺失，当前机器未安装 Visual C++ Build Tools）

## 10. Cross-Platform Smoke Checklist

### Windows
- [ ] `npm run tauri:dev` can launch main + widget windows
- [ ] Widget topmost/collapse/open-main actions are functional
- [ ] Restart preserves widget preferences

### macOS
- [ ] `npm run tauri:dev` can launch main + widget windows
- [ ] Widget topmost/collapse/open-main actions are functional
- [ ] Restart preserves widget preferences

### Linux
- [ ] `npm run tauri:dev` can launch main + widget windows
- [ ] Widget topmost/collapse/open-main actions are functional
- [ ] Restart preserves widget preferences

## 11. Known Limits

- Current workspace can locate `cargo` and fetch crates, but Rust MSVC toolchain cannot link because `link.exe` is unavailable.
- Off-screen recovery currently uses non-negative coordinate fallback (`20,20`) and does not yet consume full monitor bounds API.
- Widget integration tests focus on contract/fallback behavior in Node; real desktop shell behavior still requires manual smoke on each OS.

## 12. Release Checklist

- [x] Spec/Plan/Tasks/Analyze artifacts completed under `specs/002-desktop-float/`
- [x] Minimal dependency policy documented (`research.md`)
- [x] `npm run lint` passed
- [x] `npm run test` passed
- [x] `npm run test:e2e` passed
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passed (blocked by missing toolchain)
- [ ] Windows/macOS/Linux smoke checklist completed
