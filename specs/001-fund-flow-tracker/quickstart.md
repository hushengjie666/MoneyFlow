# Quickstart: 资金动向登记与实时余额看板

## 1. Prerequisites

- Node.js 18+（推荐 22+）
- npm 8+
- Windows/macOS/Linux (本地运行)

## 2. Initialize Project

```bash
npm install
```

## 3. Suggested Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "dev:api": "node backend/src/server.js",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "vitest run tests/e2e/full-user-journey.e2e.test.js",
    "test:all": "npm run lint && npm run test && npm run test:e2e",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --check ."
  }
}
```

## 4. Create SQLite Schema

在 `backend/src/db.js` 初始化数据库并执行 schema（自动执行）：

```sql
CREATE TABLE IF NOT EXISTS account_snapshot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  initial_balance_yuan REAL NOT NULL,
  current_balance_yuan REAL NOT NULL,
  timezone TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cashflow_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_kind TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount_yuan REAL NOT NULL,
  effective_at TEXT NOT NULL,
  recurrence_unit TEXT,
  recurrence_interval INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 5. Run Application

终端 A（后端 API）：
```bash
npm run dev:api
```

终端 B（前端）：
```bash
npm run dev
```

前端通过 `http://localhost:8787/api/*` 调用本地 API。

## 6. API Examples

初始化/更新快照：
```bash
curl -X PUT http://localhost:8787/api/snapshot \
  -H "Content-Type: application/json" \
  -d "{\"initialBalanceYuan\":1000.00}"
```

新增一次性事件：
```bash
curl -X POST http://localhost:8787/api/events \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"午餐支出\",\"eventKind\":\"one_time\",\"direction\":\"outflow\",\"amountYuan\":50.00,\"effectiveAt\":\"2026-03-03T10:00:00.000+08:00\"}"
```

新增周期事件：
```bash
curl -X POST http://localhost:8787/api/events \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"工资入账\",\"eventKind\":\"recurring\",\"direction\":\"inflow\",\"amountYuan\":9000.00,\"effectiveAt\":\"2026-03-03T00:00:00.000+08:00\",\"recurrenceUnit\":\"month\",\"recurrenceInterval\":1}"
```

软删除事件：
```bash
curl -X PATCH http://localhost:8787/api/events/1 \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"deleted\"}"
```

获取实时余额刻：
```bash
curl http://localhost:8787/api/realtime-balance
```

## 7. Validation Checklist

- 初始化存款后，`/api/snapshot` 返回最新余额。
- 新增一次性入项/出项，余额在 2 秒内变化。
- 新增周期事件后，首页每秒跳动。
- 当支出超过收入时，余额正确显示为负数。
- 运行 `npm test` 全部通过。
- 运行 `npm run test:e2e` 通过完整用户旅程验证。

## 8. Quality Gate Results (2026-03-03)

执行命令：
```bash
npm run lint
npm test
npm run test:e2e
```

结果摘要：
- `lint`: PASS
- `test`: PASS（18 test files / 23 tests，含 e2e）
- `test:e2e`: PASS（完整链路：初始化 -> 记账 -> 实时余额 -> 软删除 -> 重启持久化）
- 合同测试：PASS（snapshot/events/realtime 路径与行为通过）
- 性能预算测试：PASS（`tests/integration/performance-budget.test.js`，p95 < 50ms）

## 9. Implementation Notes

- 后端采用 Node 原生 `http` + 路由分发（`backend/src/routes/*`）。
- SQLite schema 在 `backend/src/db.js` 自动初始化，事件采用软删除（`status=deleted`）。
- 余额计算规则：
  - 一次性事件在 `effectiveAt` 生效后整笔记入。
  - 周期事件按秒线性分摊参与实时余额计算。
  - 金额业务单位统一为“元”，最多保留 2 位小数。
- 单用户约束：写入请求禁止 `userId/accountId` 字段。
- 时区默认并回传 `Asia/Shanghai`。

### 9.1 资金数字跳动维护约束（重点）

维护时必须先对齐 `spec.md` 中“资金数字跳动规则（重点约束）”章节，禁止只改代码不改规则说明。

- 统一计算文件：`frontend/src/jump-flow.js`
- 统一回归测试：`tests/unit/jump-flow.test.js`
- 主页面与悬浮组件均调用 `resolveJumpDisplayDeltaByUnit`，不可各写一套公式
- 维度口径摘要：
  - `second/minute/hour`：受 `activeWeekdays` + `dailyStartTime/dailyEndTime` 双重约束
  - `day`：受 `activeWeekdays` 约束，不受每日时间窗约束
  - `week/month/year`：按名义周期换算（`7d/30d/360d`），不按工作时段折算
- 代码评审必查：
  - 是否同步更新 `spec.md` 本规则
  - 是否新增/更新对应单测用例（工作时段内、工作时段外、非生效工作日）

## 10. SC-005 Usability Survey Template

目标：至少 20 名参与者，评分 4/5 的比例 >= 85%。

问卷题目（5 分量表）：
- Q1: 我能理解余额为何在当前时刻变化。
- Q2: 我能从近期事件摘要中定位余额变化来源。
- Q3: 我能区分一次性事件和周期性事件对余额的影响。

评分说明：
- 1 = 非常不清晰
- 2 = 不清晰
- 3 = 一般
- 4 = 清晰
- 5 = 非常清晰

统计口径：
- 样本数 `n >= 20`
- `clear_ratio = (评分为4或5的人数) / n`
- 通过条件：`clear_ratio >= 0.85`

## 11. SC-005 Execution Record

执行日期：2026-03-03  
样本数（n）：0  
评分分布（1/2/3/4/5）：0/0/0/0/0  
`clear_ratio`：0.0000  
结论（PASS/FAIL）：FAIL  
备注：此项需要真实用户参与，不能由自动化测试替代。

SC-005 统计命令（填写完 `usability-survey-template.csv` 后执行）：
```bash
npm run sc005:eval
npm run sc005:apply
```
