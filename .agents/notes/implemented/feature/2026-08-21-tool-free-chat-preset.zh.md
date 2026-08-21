# Agent Note: 无工具聊天 preset

Status: implemented

[English](2026-08-21-tool-free-chat-preset.md) | 中文

## 问题

随附的 preset 都会把模型上下文用在编码能力上。用户只想聊天时，模型仍会收到项目指令、skill 指引、工具 schema 和运行时快照；这些内容会增加请求大小与延迟，却不能改善回答。

聊天界面仍须保留会话 transcript（文本记录）。运行时上下文与聊天历史是两种不同的输入：关闭前者不能让每条消息变成彼此隔离的请求。

## 决策

`chat` 是第五个随附的 agent preset。它只挂载一份完整的对话人设，不挂载工具、skill、项目指令或压缩插件。`includeRuntimeContext: false` 只抑制动态插件快照；agent loop（智能体循环）仍会把 `session.deriveMessages()` 传给每次模型请求，因此后续轮次包含此前的用户消息与助手消息。

该 preset 留在现有选择器中，而不新增顶层 tab。preset 已经负责一个会话面向模型的组装；tab 则会为同一操作引入第二套会话生命周期与导航模型。

该 preset 不挂载压缩策略。因此，在所选模型有限的上下文窗口耗尽之前，模型会收到全部未被替换的 transcript。无限轮次与无限逐字历史无法同时实现；以后若加入压缩，便是有意用摘要替换旧消息，而不是逐字保留它们。

当所选模型支持图片时，图片附件仍通过宿主现有的消息路径传递。其他文档格式需要独立的摄取能力，并不由该 preset 自动提供。

## 考虑过的替代方案

**修改 `minimal`。** 否决，因为 `minimal` 是带两个工具和 benchmark 专用人设的编码 preset。移除它的工具或修改它的提示词，会抹掉一个现有产品选项，而不是新增聊天选项。

**新增独立 API 后端或顶层聊天 tab。** 否决，因为正常的会话与 LLM 流水线已经提供流式输出、持久化、模型选择、附件和 transcript 回放。并行后端会重复这些职责，并让聊天历史的行为异于其他所有 preset。

**挂载自动压缩。** 否决，因为要求的行为是原样发送当前 transcript。压缩通过替换旧消息来延长可用聊天长度，这是另一种保证，可以日后明确加入。

## 后果

该 preset 会从每次模型请求中去掉工具 schema 和运行时材料，但不会让请求变成无状态。其请求头省略 `tools`，第二次及后续请求按顺序携带此前的 transcript。

随附 Web 组装测试固定了确切人设、空工具组装、不存在压缩服务，以及包含第一问与第一答的双轮请求。无密钥 JSON-RPC 快照固定了组装后的聊天配置，以及不含 `tools` 请求头字段的持久化模型可见 transcript。

现有的 [preset 架构](../architecture/2026-08-03-per-session-agent-presets.zh.md)与[按 agent 工具呈现](2026-08-05-per-agent-tool-presentation.zh.md) Agent Note 继续作为组装与呈现机制的权威。本决策只增加一项名单成员，不取代任一机制。
