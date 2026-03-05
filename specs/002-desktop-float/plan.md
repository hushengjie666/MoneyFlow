# Implementation Plan: 桌面悬浮小组件适配

**Branch**: `[002-desktop-float]` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-desktop-float/spec.md`

## Summary

在现有前后端（Vite + Node + SQLite）基础上引入 Tauri 桌面壳，提供三平台桌面悬浮小组件能力：实时余额展示、拖拽/置顶/折叠/关闭、快速打开主界面、组件偏好持久化与恢复。实现遵循“最少依赖、优先原生能力”原则：前端复用现有原生 JS 模块，桌面能力优先用 Tauri 核心 API 和 Rust 标准库完成，避免额外 UI 框架和插件膨胀。

## Technical Context

**Language/Version**: JavaScript (ES2023), Rust (stable, Tauri 2 toolchain)  
**Primary Dependencies**: `@tauri-apps/cli`, `@tauri-apps/api`, `tauri`（仅核心必需）；复用现有 `vite`、`better-sqlite3`  
**Storage**: 现有 SQLite（账本数据）+ 本地 JSON 配置文件（组件偏好，使用 Tauri 路径/文件 API）  
**Testing**: Vitest（unit/integration/e2e）+ Rust `cargo test`（窗口状态与配置逻辑单测）  
**Target Platform**: Windows/macOS/Linux 桌面  
**Project Type**: Web app + Tauri desktop shell  
**Performance Goals**: 组件可见时余额刷新间隔 <= 1s；数据变化到组件可见更新 < 2s；交互反馈 < 100ms  
**Constraints**: 最小依赖；不引入 React/Vue 等前端框架；不引入非必要 Tauri 插件；不破坏现有 Web 运行与测试命令  
**Scale/Scope**: 单用户本地账本，单设备单实例应用，组件窗口 1 个主实例（可隐藏/显示）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Code Quality Gate: PASS。沿用 ESLint/Prettier/Vitest；新增 Rust 代码纳入 `cargo fmt`/`cargo test`；桌面壳与 Web 代码均需 code review。  
- Test Standards Gate: PASS。每个行为变化都需补充自动化测试；新增组件偏好恢复、窗口交互、异常态回归用例。  
- UX Consistency Gate: PASS。组件必须覆盖 loading/empty/error/success；金额格式复用现有 formatter，避免双标准。  
- Performance Gate: PASS。已定义刷新、延迟、交互响应预算，并要求在 quickstart 记录验证结果。  
- Simplicity Gate: PASS。仅引入 Tauri 核心依赖，不新增 UI 框架；优先复用现有 API 与余额计算链路。

### Post-Design Constitution Re-Check

- Code Quality Gate: PASS（计划中包含 JS + Rust 双侧质量校验）。  
- Test Standards Gate: PASS（已覆盖单测/集成/e2e 与回归策略）。  
- UX Consistency Gate: PASS（已要求组件状态模型与主应用格式一致）。  
- Performance Gate: PASS（预算指标与验证方法已量化）。  
- Simplicity Gate: PASS（未引入额外框架和重型插件）。

## Project Structure

### Documentation (this feature)

```text
specs/002-desktop-float/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── routes/
│   └── services/
└── data/

frontend/
├── src/
│   ├── main.js
│   ├── balance-engine.js
│   ├── formatters.js
│   └── widget/
│       ├── widget-main.js
│       └── widget-styles.css
└── index.html

src-tauri/
├── Cargo.toml
├── tauri.conf.json
└── src/
    ├── main.rs
    ├── widget_window.rs
    └── preference_store.rs

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: 保持现有 `frontend + backend` 主体结构，新增 `src-tauri` 作为最小桌面壳层；业务计算和 API 仍由现有 JS/Node 模块承担，Tauri 仅负责窗口能力和本地配置持久化。

## Complexity Tracking

无宪章违规项。
