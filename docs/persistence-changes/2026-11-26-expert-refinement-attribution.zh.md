---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-11-26-expert-refinement-attribution

[English](2026-11-26-expert-refinement-attribution.md) | 中文

## 概述

在上游 2026-11-19-cua-input-notices 记录之后，重新确认 fork 的专家优化来源 kind 为终端变更。专家优化子代理触及的四个带消息根会暴露该仅归因 kind；kind 本身、其字面判别式以及所有读取方对它的处理都没有变化。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-11-26-expert-refinement-attribution
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-11-19-cua-input-notices"
    after: "3370d8e83e5de7055061399d1e170fe22f7510efe13f0d97314a8acb576a8536"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-11-19-cua-input-notices"
    after: "b4759e278597dab7aa4da0c4935b4556b607f2ba8545971cee2d4754ec2da51d"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-11-19-cua-input-notices"
    after: "de8359f166debdafe6e2e9f2f00285052665652624074cb73674e445b71d006c"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-11-19-cua-input-notices"
    after: "4df806650578c1e9ec4c37d82f2a45ade20369f903d2d1c03737116fe854b29b"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

新增 kind 除字面判别式外不携带任何字段，因此不认识它的读取方会保留该消息，并在没有投影的情况下推导出对话记录。该 kind 不会被校验、回放或作为权威依据。本记录在同一批根上，仅在上游已确认 cua 输入通知的记录之上追加仅归因的专家优化 kind，因此支持策略不变：旧读取方沿用其对未知来源 kind 已有的保留处理，也不暗示任何迁移或降级支持。

<a id="verification"></a>
## 验证

pnpm run verify-persistence-changes 在同一批根的上游 cua 输入通知记录之后，仅报告这四项归因 kind 新增，且每项都归类为 same-version。pnpm run gen-persistence-catalog 与 pnpm run verify-persistence-formats --write 在合并后的树上可干净重新生成。pnpm run typecheck 与 agent-preset-registry 的专家测试套件在合并后的树上通过。

<a id="dev-note"></a>
## 开发备注

无。
