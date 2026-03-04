# Implementation Plan: 资金动向登记与实时余额看板

**Branch**: `[001-fund-flow-tracker]` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fund-flow-tracker/spec.md`

## Summary

构建一个基于 Vite 的单用户资金流应用：前端尽量使用原生 HTML/CSS/JavaScript，后端采用 Node.js 最小依赖 API 服务，使用本地 SQLite 持久化元数据。系统支持初始化存款、一次性/周期性资金事件登记，并以“周期金额按秒线性分摊 + 一次性事件生效时间触发”的方式实时计算与展示最新余额（允许负值）。

## Technical Context

**Language/Version**: JavaScript (ES2023), Node.js 22 LTS  
**Primary Dependencies**: Vite, better-sqlite3  
**Storage**: Local SQLite database (`moneyflow.db`)  
**Testing**: Vitest (unit/integration/contract), Node built-in assertions  
**Target Platform**: Desktop browser + local Node.js runtime (Windows/macOS/Linux)  
**Project Type**: Web application (frontend + local backend API)  
**Performance Goals**: 首页余额每 <=1 秒刷新；事件写入后 <=2 秒反映到余额；单次余额计算 p95 <50ms（事件数<=1000）  
**Constraints**: 最小依赖、单用户、无登录、默认 `Asia/Shanghai` 时区、金额统一按“元”处理（最多 2 位小数）  
**Scale/Scope**: 单用户账本；活跃周期+一次性事件总量 <=10,000；单设备本地使用

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Code Quality Gate: PASS。使用 ESLint + Prettier；PR 必须通过 lint/test；变更需要代码评审。  
- Test Standards Gate: PASS。定义余额计算单元测试、API 集成测试、契约测试；Bug 修复必须补回归测试。  
- UX Consistency Gate: PASS。明确加载/空态/错误/成功状态；金额格式一致；移动端与桌面端均可读。  
- Performance Gate: PASS。已定义 1 秒刷新、2 秒变更可见、p95 计算预算并要求验证。  
- Simplicity Gate: PASS。前端原生三件套；后端 Node 原生 http + SQLite；避免引入重框架。

### Post-Design Constitution Re-Check

- Code Quality Gate: PASS（文档中已定义 lint/test/评审流程）。  
- Test Standards Gate: PASS（`quickstart.md` 与 `contracts/openapi.yaml` 均包含测试与契约验证入口）。  
- UX Consistency Gate: PASS（规格与数据模型覆盖状态和异常反馈）。  
- Performance Gate: PASS（在 `research.md` 与 `data-model.md` 固化了预算和计算策略）。  
- Simplicity Gate: PASS（仅保留 Vite + better-sqlite3 两个核心依赖）。

## Project Structure

### Documentation (this feature)

```text
specs/001-fund-flow-tracker/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── index.html
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── api-client.js
│   ├── balance-engine.js
│   └── formatters.js
└── public/

backend/
├── src/
│   ├── server.js
│   ├── db.js
│   ├── repositories/
│   │   ├── event-repository.js
│   │   └── snapshot-repository.js
│   ├── services/
│   │   └── balance-service.js
│   └── routes/
│       ├── snapshot-routes.js
│       └── event-routes.js
└── data/
    └── moneyflow.db

tests/
├── unit/
│   └── balance-service.test.js
├── integration/
│   └── api-flow.test.js
└── contract/
    └── openapi-contract.test.js
```

**Structure Decision**: 选择“前后端分离但同仓库”的 Web 应用结构。原因是浏览器端无法直接稳定地操作本地 SQLite 文件，需由本地 Node API 提供访问层；同时前端仍保持 Vite + 原生技术栈和最小依赖目标。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无。当前方案未触发宪章例外。
