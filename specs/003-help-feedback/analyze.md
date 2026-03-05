# Analysis: 帮助页反馈提交流程

## 关键决策

1. 仅做前端，不改仓库内后端：用户已明确服务端已有程序。
2. 接口地址可配置：默认 `/api/feedback`，可通过 `localStorage` 键 `moneyflow.api.feedbackEndpoint` 覆盖。
3. 两步交互采用同一表单渐进展开：首次提交展开联系方式区，二次确认执行网络请求。

## 风险与缓解

- 风险：正式 API 字段与当前占位字段不一致。  
  缓解：集中在 `submitHelpFeedback` 一处映射，后续按 API 文档替换即可。

- 风险：服务端返回非 JSON。  
  缓解：客户端已做 JSON 解析容错并提供兜底错误信息。
