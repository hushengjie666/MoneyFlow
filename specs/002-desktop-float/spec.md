# Feature Specification: 桌面悬浮小组件适配

**Feature Branch**: `[002-desktop-float]`  
**Created**: 2026-03-04  
**Status**: Draft  
**Input**: User description: "speckit.specify 我想让系统在电脑桌面以悬浮小组件的形式展示，具备悬浮组件通用的一些功能"

## Clarifications

### Session 2026-03-04

- Q: 桌面悬浮组件采用哪种运行形态？ -> A: Tauri
- Q: 支持的桌面平台范围？ -> A: 三平台（Windows/macOS/Linux）
- Q: 悬浮组件启动策略如何定义？ -> A: 同时支持“默认随应用启动”与“仅手动开启”，由用户配置

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 桌面悬浮实时余额展示 (Priority: P1)

作为用户，我希望在电脑桌面看到一个始终可见的悬浮小组件，实时展示当前余额，不必切回主应用页面。

**Why this priority**: 这是核心价值，直接决定该功能是否成立。  
**Independent Test**: 启动主程序后打开悬浮组件，保持桌面停留 3 分钟，余额每秒按现有规则持续刷新。

**Acceptance Scenarios**:

1. **Given** 主程序与本地 API 正常运行，**When** 用户开启悬浮组件，**Then** 组件在桌面显示最新余额并每秒刷新。
2. **Given** 存在一次性/周期性资金事件，**When** 余额发生变化，**Then** 悬浮组件上的金额在 2 秒内同步更新。

---

### User Story 2 - 悬浮组件通用交互控制 (Priority: P1)

作为用户，我希望像常见桌面悬浮窗一样，能够拖拽、置顶、折叠和关闭组件，并让常用外观设置生效。

**Why this priority**: 没有通用交互能力，组件会影响日常桌面使用。  
**Independent Test**: 在单次会话中完成拖拽、置顶开关、折叠/恢复、关闭，所有操作即时生效且无崩溃。

**Acceptance Scenarios**:

1. **Given** 组件已显示，**When** 用户拖拽组件，**Then** 组件位置随鼠标移动并停留在释放位置。
2. **Given** 组件已显示，**When** 用户开启或关闭“始终置顶”，**Then** 组件层级按设置立即变化。
3. **Given** 组件已显示，**When** 用户点击折叠或展开，**Then** 组件在紧凑视图与完整视图间切换。

---

### User Story 3 - 组件快速操作与主应用联动 (Priority: P2)

作为用户，我希望在组件内执行常用快捷操作（例如打开主应用、快速记一笔），并与主应用数据保持一致。

**Why this priority**: 提升效率，让组件不只是“显示器”，还能成为入口。  
**Independent Test**: 在组件触发快速记账后，组件余额与主应用页面余额一致，事件列表可见新增记录。

**Acceptance Scenarios**:

1. **Given** 组件已显示，**When** 用户点击“打开主应用”，**Then** 主应用窗口被激活到前台。
2. **Given** 组件支持快速记账入口，**When** 用户提交有效数据，**Then** 事件写入成功且余额同步更新。

---

### User Story 4 - 组件状态持久化与恢复 (Priority: P2)

作为用户，我希望关闭并重新启动应用后，组件保留上次的关键偏好（位置、尺寸、透明度、置顶状态）。

**Why this priority**: 保证长期使用体验一致，避免重复配置。  
**Independent Test**: 修改组件设置后重启应用，组件按上次配置恢复。

**Acceptance Scenarios**:

1. **Given** 用户调整了组件位置和外观，**When** 应用重启，**Then** 组件使用上次保存配置恢复。
2. **Given** 上次组件位于不可见区域（多显示器变化），**When** 应用重启，**Then** 组件自动回退到主屏可见区域。

---

### Edge Cases

- 本地 API 临时不可用时，组件应显示明确错误态，并提供重试入口。  
- 用户将组件拖拽到屏幕边缘或超出可见区时，应自动吸附或回退，避免“丢失窗口”。  
- 频繁更新余额时（每秒刷新），组件不应出现明显闪烁或卡顿。  
- 多显示器切换、分辨率变化或缩放比例变化后，组件应保持可见。  
- 主应用退出时，组件应同步退出，不残留孤立进程。  

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a desktop floating widget window that can be shown/hidden by user action.
- **FR-002**: System MUST display latest balance in the widget and refresh at least once per second while widget is visible.
- **FR-003**: System MUST keep widget balance calculation consistent with existing backend snapshot/realtime-balance rules.
- **FR-004**: System MUST support basic widget interactions: drag, always-on-top toggle, collapse/expand, and close.
- **FR-005**: System MUST persist widget preferences (position, size, opacity, topmost, collapsed state) and restore them on next launch.
- **FR-006**: System MUST recover widget to visible screen bounds when stored position is outside current desktop layout.
- **FR-007**: System MUST expose a quick action to open/focus the main application window from widget.
- **FR-008**: System MUST show explicit loading/empty/error/success states in widget UI.
- **FR-009**: System MUST ensure widget close/hide behavior does not corrupt ledger data or background balance updates.
- **FR-010**: System MUST support at least one configurable transparency level and one compact display mode.
- **FR-011**: System MUST implement the desktop widget runtime using Tauri.
- **FR-012**: System MUST support Windows, macOS, and Linux desktop platforms.
- **FR-013**: System MUST provide configurable startup behavior for widget visibility, supporting both auto-start-with-app and manual-open-only modes.
- **FR-014**: System MUST reuse the same jump-flow calculation baseline as main page (`frontend/src/jump-flow.js`) for all jump units; widget MUST NOT introduce independent formula branches.

### Non-Functional Requirements *(mandatory)*

- **NFR-001**: Widget UI MUST render loading, empty, error, and success states within 300ms of state transition trigger.
- **NFR-002**: Visible widget balance update interval MUST be <= 1 second; data-change-to-visual-update latency SHOULD be < 2 seconds.
- **NFR-003**: Widget interaction response (drag/toggle/collapse) SHOULD complete with perceived delay < 100ms for normal desktop hardware.
- **NFR-004**: Widget MUST remain readable at common desktop scales (100%, 125%, 150%) and meet minimum text contrast requirements.
- **NFR-005**: Added widget process/mode MUST not break existing web workflow (`npm run dev`, API routes, existing tests).

### Key Entities *(include if feature involves data)*

- **WidgetPreferenceProfile**: 用户的小组件偏好配置，包含位置、尺寸、透明度、置顶、折叠状态、最后更新时间。
- **WidgetRuntimeState**: 小组件运行时状态，包含可见性、连接状态（正常/加载/错误）、当前展示余额、最后同步时间。
- **WidgetQuickAction**: 小组件可触发的快捷动作定义，包含动作类型、可用状态、触发结果。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% 以上用户可在 1 分钟内打开并看到桌面悬浮余额组件。
- **SC-002**: 在连续 10 分钟观测窗口内，组件显示余额与 `/api/realtime-balance` 抽样比对一致率达到 100%。
- **SC-003**: 95% 的组件交互操作（拖拽、置顶、折叠、展开）在 100ms 内获得可见反馈。
- **SC-004**: 重启应用后，组件偏好恢复成功率 >= 99%（随机 100 次重启样本）。
- **SC-005**: 在 API 异常注入场景下，100% 的异常请求都能在组件中展示可理解错误文案与恢复入口（重试或打开主应用）。
