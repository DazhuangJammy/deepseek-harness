# Agent Note: Read-only Agent architecture learning view

Status: implemented

[English](2026-08-20-agent-learning-view.md) | 中文

## Problem

DeepSeek Harness 已经记录了理解 Agent 运行所需的事实，[Trajectory](2026-07-27-trajectory-inspection-ledger.zh.md) 也已经展示了详细记录。学习者仍然需要一个更小、更直观的解释，理解用户输入、Agent Loop、模型请求、工具和下一步之间的关系，同时不能新增运行时观察器或改变模型行为。

## Decision

`@deepseek-ai/dsh-client-ui-learning` 浏览器插件注册一个 session-scoped 的 `conversation.view`，id 为 `learning`。它只读取标准 `ConversationSnapshot`，派生出学习记录列表和固定的 Agent 链路。点击一条记录后，面板解释发生了什么、为什么发生、哪个能力类别负责、读取了什么、产生了什么、下一步去哪里以及相关名词。插件不提供 service，不监听事件，不写持久化事件，不添加 Prompt 片段，不发起模型请求，不提供工具，也不持有跨插件可变状态。插件卸载时，slot disposer 会移除它的贡献。

源码包位于 `packages/client/ui-learning`，因此客户端聚合、tsdown 清单扫描、包 invariant 检查和逐文件覆盖率门禁会检查同一份实现。学习页把相关名词渲染为可点击按钮；术语字典把入门解释与准确技术定义、仓库归属、协作关系和当前证据放在一起。实际记录仍逐条来自 `ConversationSnapshot`，只有解释文案按记录类型复用模板。

## Alternatives considered

**再做一套事件监控。** 这会重复 Session/Trajectory 投影，并产生互相竞争的运行事实，所以视图直接消费现有快照。

**把 Trajectory 改造成教学界面。** Trajectory 负责详细的耗时、Prompt、Schema 和事件检查；合并职责会让详细记录和入门解释都更难演进。

**新增 Host Remote 查询所有 Cordis 调用。** 当前学习目标是 Agent 执行链，而不是无限扩张的 Service 方法检查器。等具体课程需要精确的 Host 投影时再增加。

## Consequences

第一版可以安全热插拔，不影响模型或持久化。学习者得到稳定的架构词汇，同时仍可使用 Trajectory 获取证据。解释停留在投影层事实，不虚构每条事件对应的具体插件，也不声称所有内部调用都可见。聚焦浏览器测试覆盖有记录和空 Session 两种状态，以及点击记录查看解释的行为。
