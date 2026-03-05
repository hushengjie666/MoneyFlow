# Data Model: 帮助页反馈提交流程

## FeedbackPayload

- `issueFeedback`: string，系统问题反馈文本，可为空
- `featureExpectation`: string，期望功能文本，可为空
- `contact`: string，联系方式，必填

约束：
- `issueFeedback` 与 `featureExpectation` 至少一项非空
- `contact` 必填且去首尾空格后非空
