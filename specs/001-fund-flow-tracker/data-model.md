# Data Model: 资金动向登记与实时余额看板

## 1. AccountSnapshot

用途：记录单用户账本的基线与当前状态。

Fields:
- `id` (INTEGER, PK, 固定为 1)
- `initial_balance_yuan` (REAL, NOT NULL)
- `current_balance_yuan` (REAL, NOT NULL)
- `timezone` (TEXT, NOT NULL, default `Asia/Shanghai`)
- `updated_at` (TEXT, NOT NULL, ISO-8601)

Validation:
- `initial_balance_yuan` 为数字，允许负数，最多 2 位小数
- `timezone` 必须为应用支持的 IANA 时区字符串

State Notes:
- 首次初始化后必须存在且仅存在一条记录。

## 2. CashflowEvent

用途：描述一次性或周期性的资金入项/出项。

Fields:
- `id` (INTEGER, PK, AUTOINCREMENT)
- `event_kind` (TEXT, NOT NULL, enum: `one_time` | `recurring`)
- `direction` (TEXT, NOT NULL, enum: `inflow` | `outflow`)
- `amount_yuan` (REAL, NOT NULL, >0)
- `effective_at` (TEXT, NOT NULL, ISO-8601)
- `recurrence_unit` (TEXT, NULL, enum: `day` | `week` | `month`)
- `recurrence_interval` (INTEGER, NULL, >=1)
- `status` (TEXT, NOT NULL, enum: `active` | `paused` | `deleted`)
- `created_at` (TEXT, NOT NULL)
- `updated_at` (TEXT, NOT NULL)

Validation:
- `event_kind=one_time` 时，`recurrence_*` 必须为 NULL
- `event_kind=recurring` 时，`recurrence_unit` 与 `recurrence_interval` 必填
- `amount_yuan` 必须为正数，最多 2 位小数；正负方向由 `direction` 表示
- `effective_at` 可晚于当前时间（未生效前不参与计算）

State Transitions:
- `active -> paused -> active`
- `active|paused -> deleted`（软删除，不再参与计算）

## 3. RealtimeBalanceTick (Derived, non-persistent)

用途：每秒输出给前端的展示余额快照。

Fields:
- `timestamp` (TEXT, ISO-8601)
- `display_balance_yuan` (REAL)
- `source_summary` (OBJECT)
  - `active_recurring_count`
  - `effective_one_time_count`

Rules:
- 由 `AccountSnapshot.initial_balance_yuan` + 生效事件集合实时计算。
- 周期事件按秒线性分摊。

## Relationships
- `AccountSnapshot` 1:many `CashflowEvent`（逻辑归属，单用户模型）
- `RealtimeBalanceTick` 依赖 `AccountSnapshot + CashflowEvent` 的只读计算结果

## Persistence Notes
- SQLite 文件路径：`backend/data/moneyflow.db`
- 建议索引：
  - `idx_cashflow_status_effective_at(status, effective_at)`
  - `idx_cashflow_kind_status(event_kind, status)`
