# Agent Note: 仅思考的模型响应属于可重试失败

Status: implemented

[English](2026-09-12-reasoning-only-model-response-retry.md) | 中文

## 问题

支持思考的模型可能先输出 reasoning，再在回答正文或工具调用出现前正常结束一份格式正确的响应。两个模型适配器都把任意 reasoning 块当成成功内容，因此 agent loop 会提交这次尝试并结束该轮，却不给用户答案。报告中的失败发生在聊天与专家 Session；它们的完整 persona 不包含标准模式的附加指令，但两种模式使用相同的适配器、重试策略、Session 事件和对话 renderer。Markdown、JSON、文档投影与图片投影都不是丢失原因：非空白 Markdown 或 JSON 属于普通回答正文，文件与图片引用则在请求发出前完成投影。

## 决策

DeepSeek 与 pi-ai 适配器只在响应带有非空白回答正文或工具调用时，才把终止 `stop` 视为成功；否则将其归类为 `EMPTY_RESPONSE`。Reasoning 仍保存在失败尝试的嵌入式 stream 中，但不能单独让响应成功。既有 `agent/request-error` 与 `dsh-llm-retry` 路径会在提供方配置预算内重试请求；预算耗尽后会产生明确的轮次失败。`max-tokens`、工具调用、错误与中止 finish 保持原有分类。

本决策扩展了已归档的[空模型补全规则](../../archived/bug-fix/2026-07-24-empty-model-response-is-retryable.md)，该规则曾有意接受仅 reasoning 的响应。产品把 reasoning 呈现为过程，而不是用户请求的答案，因此成功轮次必须包含用户或循环可以采取行动的输出。

## 验证

两个适配器测试套件都覆盖仅 reasoning 的终止 stop，并保留 reasoning 后跟正文的成功响应。专家编辑器测试另行固定保存状态反馈与版本行为；无密钥空响应重试场景在失败尝试中携带 reasoning，并固定共享重试生命周期。

## 考虑过的替代方案

**只在对话 renderer 中显示空回答警告。** Session 仍会记录成功但没有答案的消息，重试和非 Web 消费方无法恢复，而且同一提供方结果会因客户端不同而具有不同含义。

**在聊天与专家提示词末尾追加最终回答指令。** 专家提示词有意作为完整 persona 来模拟 API 交互，且提示词措辞无法保证每个提供方都在 reasoning 之后输出回答正文。

**增加聊天模式专用 stream 中间件。** 该缺陷属于聊天与标准模式共享的模型响应分类。模式专用监听器会在不同路由重复规则，并让其他消费方继续暴露于同一问题。

## 后果

偶发的仅 reasoning 补全会消耗有限重试容量，而不是静默完成一轮。若模型有意只返回 reasoning 而不给答案，它会被重试并最终明确失败；这一代价可以接受，因为用户和循环都无法把该响应当作完整答案使用。聊天模式的受限组装与文件能力保持不变。
