# Research Notes: 帮助页反馈提交流程

- 现有主菜单以 `data-target` + `switchPanel` 实现，新增菜单无需改动路由机制。
- 现有全局状态提示 `setStatus` 已覆盖 loading/error/success，可直接复用。
- 现有 `api-client` 无统一 HTTP 层，本次在反馈函数中单点实现远端调用。
