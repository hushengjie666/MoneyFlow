# Data Model: 桌面悬浮小组件适配

## 1. WidgetPreferenceProfile (Persistent)

用途：保存用户对悬浮组件的个性化设置，跨重启恢复。

Fields:
- `version` (INTEGER, required, default `1`)
- `x` (NUMBER, required) - 组件左上角 X 坐标
- `y` (NUMBER, required) - 组件左上角 Y 坐标
- `width` (NUMBER, required)
- `height` (NUMBER, required)
- `opacity` (NUMBER, required, range `0.4..1.0`)
- `alwaysOnTop` (BOOLEAN, required)
- `collapsed` (BOOLEAN, required)
- `startupMode` (STRING, required, enum: `auto` | `manual`)
- `updatedAt` (STRING, required, ISO-8601)

Validation:
- 尺寸下限：`width >= 220`, `height >= 72`
- 坐标可暂存越界值，但在 show 前必须执行可见区域修正
- `startupMode` 非法值回退为 `manual`

Persistence:
- 文件：`widget-preferences.json`
- 位置：Tauri 应用数据目录

## 2. WidgetRuntimeState (Derived, In-Memory)

用途：表达组件当前展示与交互状态，不持久化。

Fields:
- `visible` (BOOLEAN)
- `connectionState` (STRING, enum: `loading` | `empty` | `ready` | `error`)
- `displayBalanceYuan` (NUMBER | NULL)
- `lastTickAt` (STRING | NULL, ISO-8601)
- `errorCode` (STRING | NULL)
- `errorMessage` (STRING | NULL)
- `isSyncing` (BOOLEAN)

State Notes:
- 初次打开组件时默认 `loading`
- 当 API 不可达进入 `error`，支持手动重试回到 `loading`
- 无快照数据时进入 `empty`

## 3. WidgetCommandPayload (IPC Contract Shape)

用途：前端与 Tauri 命令调用的数据载体定义。

Command payload examples:
- `set_widget_topmost`: `{ "value": true }`
- `set_widget_collapsed`: `{ "value": false }`
- `save_widget_preferences`: `{ "preferences": WidgetPreferenceProfile }`
- `open_main_window`: `{}`

Command response envelope:
- `ok` (BOOLEAN)
- `code` (STRING, optional)
- `message` (STRING, optional)
- `data` (OBJECT, optional)

## 4. Existing Ledger Entities (Reused)

本功能复用现有数据实体，不新增账本领域模型：
- `AccountSnapshot`
- `CashflowEvent`
- `RealtimeBalanceTick`

## Relationships

- `WidgetPreferenceProfile` -> 启动时用于恢复 `WidgetRuntimeState` 的初始窗口参数
- `WidgetRuntimeState` -> 每秒消费 `RealtimeBalanceTick` 更新显示余额
- `WidgetCommandPayload` -> 触发窗口行为与偏好存储，不直接修改账本数据

## Migration / Compatibility Notes

- 本阶段不修改 `backend/data/moneyflow.db` schema
- 偏好文件版本字段用于后续兼容（`version`），未来变更可按版本迁移
