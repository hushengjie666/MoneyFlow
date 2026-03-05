# Quickstart: 帮助页反馈提交流程

## 手动验证

1. 打开应用主页面，点击菜单“帮助”。
2. 仅填写“系统问题反馈”，点击“提交反馈”，应出现联系方式输入区。
3. 不填联系方式点击“确认提交”，应提示错误。
4. 填写联系方式后确认提交，成功后应显示感谢语。
5. 默认上报地址为 `http://94.191.82.58:38127/feedback`，默认鉴权头为 `X-Feedback-Token`。
6. 可按需覆盖配置：
   - `localStorage.moneyflow.api.feedbackEndpoint`
   - `localStorage.moneyflow.api.feedbackBaseUrl`
   - `localStorage.moneyflow.api.feedbackToken`

## 质量门禁

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
