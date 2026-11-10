---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-10-26-source-attribution-kinds

[English](2026-10-26-source-attribution-kinds.md) | 中文

## 概述

在合并上游的 subagent 结算归因与 retry-control-input 记录之后，重新确认 fork 的专家优化来源 kind 为终端变更。专家优化子代理触及的四个带消息根会暴露该仅归因 kind；kind 本身、其字面判别式以及所有读取方对它的处理都没有变化。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-10-26-source-attribution-kinds
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-10-27-retry-control-input"
    after: "32d1fc0e8da5ea51a9ab2e8e69ec6ee40c7e8047fb35cc7a2f420cd00ce457a8"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-10-27-retry-control-input"
    after: "97b6c7df45d430d7ab8010fce2cd1f0dee9c19aeedaee50b68e5ce6aa5d7d321"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-10-27-retry-control-input"
    after: "401d0851523b6c255a235c275c3ac2bf45272feab340ee51033c372b89dc7ab9"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-10-27-retry-control-input"
    after: "13f751b81302e15e351194a1fe147d24edd4c6ed11d79a5cbb44306715e70137"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

新增 kind 除字面判别式外不携带任何字段，因此不认识它的读取方会保留该消息，并在没有投影的情况下推导出对话记录。该 kind 不会被校验、回放或作为权威依据。本记录在同一批根上，仅在上游已确认 stopReason 结算归因的记录之上追加仅归因的专家优化 kind，因此支持策略不变：旧读取方沿用其对未知来源 kind 已有的保留处理，也不暗示任何迁移或降级支持。

<a id="verification"></a>
## 验证

pnpm run verify-persistence-changes 在同一批根的上游记录之后，仅报告这四项归因 kind 新增，且每项都归类为 same-version。pnpm run gen-persistence-catalog 与 pnpm run verify-persistence-formats --write 在合并后的树上可干净重新生成。pnpm run typecheck 与 agent-preset-registry 的专家测试套件在合并后的树上通过。

<a id="dev-note"></a>
## 开发备注

无。
