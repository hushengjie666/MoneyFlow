# Phase 0 Research: 资金动向登记与实时余额看板

## Decision 1: 前后端分离为 Vite 前端 + 本地 Node API
- Decision: 使用 Vite 托管前端页面，使用本地 Node.js 进程提供 REST API。
- Rationale: 浏览器无法直接可靠读写本地 SQLite 文件；本地 API 隔离数据库访问并便于测试。
- Alternatives considered:
  - 纯前端 + localStorage：无法满足 SQLite 要求，且查询能力弱。
  - Electron：能力足够但引入额外复杂度，超出“最小库依赖”目标。

## Decision 2: SQLite 驱动选择 better-sqlite3
- Decision: 使用 `better-sqlite3` 作为唯一数据库访问依赖。
- Rationale: API 简单、同步调用适合单用户本地场景，减少 ORM 或复杂抽象。
- Alternatives considered:
  - sqlite3：异步回调链更复杂。
  - Prisma/ORM：依赖和抽象层过重，不符合简化目标。

## Decision 3: 周期事件计算策略
- Decision: 周期金额按秒线性分摊；一次性事件在 `effective_at` 生效时刻整笔入账。
- Rationale: 与澄清结果一致，能够保证首页“每秒跳动”且结果可复算。
- Alternatives considered:
  - 周期到点一次性记账：不满足连续跳动体验。
  - 每事件可选策略：增加复杂度与测试矩阵。

## Decision 4: 金额与时区标准
- Decision: 金额统一使用“元”为业务单位，最多保留 2 位小数；时区统一使用本地时区 `Asia/Shanghai`。
- Rationale: 与用户输入习惯一致；使输入、存储、展示一致，降低理解成本。
- Alternatives considered:
- 继续使用“分”作为业务输入单位：用户录入成本高，不符合当前需求。
  - UTC 统一存储：本地单用户场景收益低且可读性较差。

## Decision 5: 测试分层策略
- Decision: 采用 Vitest 统一执行 unit/integration/contract 测试。
- Rationale: 降低工具切换成本，满足宪章“测试强制”要求。
- Alternatives considered:
  - Node 内建 test + 其他工具：工具分散。
  - 仅手工测试：不满足宪章。

## Decision 6: 性能预算与验证
- Decision: 设定并验证以下预算：
  - 余额刷新周期 <=1s
  - 事件变更到首页可见 <=2s
  - 1000 条事件内单次余额计算 p95 <50ms
- Rationale: 与 spec NFR/SC 对齐并可自动化验证。
- Alternatives considered:
  - 仅定性“流畅”：不可验收。
