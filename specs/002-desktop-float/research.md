# Phase 0 Research: 桌面悬浮小组件适配

## Decision 1: 桌面壳采用 Tauri 2（最小依赖）
- Decision: 使用 Tauri 2 作为桌面壳，前端继续复用现有 Vite + 原生 JS。
- Rationale: 满足三平台桌面能力，同时依赖体量和运行开销低于 Electron，符合“尽量少包”约束。
- Alternatives considered:
  - Electron: 生态成熟，但依赖和包体更重。
  - 纯浏览器/PWA 模拟悬浮: 无法稳定提供真实桌面窗口能力（置顶、窗口焦点、跨平台窗口管理）。

## Decision 2: 业务 API 不扩展，复用现有 `/api/*`
- Decision: 小组件余额展示与快速记账复用现有后端接口（`/api/realtime-balance`、`/api/events`）。
- Rationale: 减少新增接口和回归风险，保证主应用与小组件口径一致。
- Alternatives considered:
  - 新增 widget 专用 API: 提升隔离性但引入重复逻辑和更多维护成本。

## Decision 3: 窗口模型采用“主窗口 + 小组件窗口”
- Decision: 同一 Tauri 进程内管理两个窗口：`main`（完整应用）和 `widget`（悬浮窗）。
- Rationale: 进程模型简单、通信开销低，便于聚合生命周期管理（退出/恢复/聚焦）。
- Alternatives considered:
  - 分离独立进程: 复杂度高，状态同步和故障恢复成本更高。

## Decision 4: 小组件偏好采用本地 JSON 文件持久化
- Decision: 使用 Tauri 路径与文件 API，在应用数据目录保存 `widget-preferences.json`。
- Rationale: 偏好数据结构小且独立于账本，避免修改现有 SQLite schema。
- Alternatives considered:
  - 写入 SQLite: 可行，但会耦合账本模型并增加迁移复杂度。
  - 仅内存存储: 重启后无法恢复，不满足需求。

## Decision 5: 启动策略支持双模式且可切换
- Decision: 支持 `auto-start-with-app` 与 `manual-open-only` 两种模式，用户配置生效。
- Rationale: 满足澄清结果，适配不同使用习惯与性能偏好。
- Alternatives considered:
  - 固定自动启动: 对轻量用户干扰较大。
  - 固定手动启动: 降低可达性，影响核心场景效率。

## Decision 6: 小组件刷新策略采用“前端轮询 + 状态机”
- Decision: 可见时每秒轮询一次实时余额，统一通过状态机呈现 loading/empty/error/success。
- Rationale: 与现有系统一致，改造成本低，可直接满足 <=1s 刷新和 <2s 可见更新目标。
- Alternatives considered:
  - WebSocket 推送: 实时性更高，但会引入额外协议与服务复杂度。

## Decision 7: 跨平台窗口越界恢复在 Rust 侧处理
- Decision: 在 `src-tauri` 层做可见区域矫正（多屏/分辨率变化后回退主屏可见区域）。
- Rationale: Rust/Tauri 侧更接近原生窗口信息，行为更稳定。
- Alternatives considered:
  - 仅前端估算: 受浏览器环境限制，跨平台可靠性不足。

## Decision 8: 测试分层维持 Vitest + cargo test
- Decision: 前端/集成继续用 Vitest；窗口与偏好核心逻辑加 Rust 单测（`cargo test`）。
- Rationale: 与现有工程质量门禁兼容，同时覆盖桌面壳核心逻辑。
- Alternatives considered:
  - 仅 JS 侧集成测试: 难以可靠覆盖原生窗口状态边界。

## Dependency Policy (Mandatory)
- 允许新增依赖仅限：
  - `@tauri-apps/cli`
  - `@tauri-apps/api`
  - `tauri`（Rust crate）
- 禁止新增：前端 UI 框架（React/Vue）、非必要 Tauri 插件、重复状态管理库。
