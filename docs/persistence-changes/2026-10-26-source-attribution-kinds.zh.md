---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-10-26-source-attribution-kinds

[English](2026-10-26-source-attribution-kinds.md) | 中文

## 概述

上游会话 schema 归一化开始把来源标注类型写入持久化 schema 清单后，重新确认本 fork 的专家优化来源类型。优化子会话涉及的四个消息类 root 新显式暴露该仅标注类型；类型本身、其字面量判别值以及所有读取方的处理方式均未改变。

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
    previous: "2026-10-22-action-card-status"
    after: "54b6f879383a5d90826aa1761cfc9539c64afa25d1147c43ac123d8e7c169a13"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-10-22-action-card-status"
    after: "3d4e5271bf5fba8d6c5b6186502eb7dd756274717b488e1b785fac60793b978b"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-10-22-action-card-status"
    after: "6c6781634ca48137a1584c5a2e1037517aa4445271907c7428c324a3c8c004d4"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-10-22-action-card-status"
    after: "70ad135c4dc78aa6ecb66b1df11580f320f739b5aed203debd4e50b9f47da3bd"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

新增类型除字面量判别值外不携带任何字段，因此不认识该类型的读取方会保留消息并在不建立投影的情况下派生会话记录。该类型不被校验、回放或视为权威。本 fork 已在 `2026-09-25-expert-refinement-attribution` 中记录过同一次仅标注改动；由于合并后的 schema 清单现在显式表达来源标注类型，这里再次确认。所有既有来源类型、字段与策略结构不变，因此支持策略不变：旧读取方沿用已有的未知来源保留行为，也不包含迁移或降级支持。

<a id="verification"></a>
## 验证

`pnpm run verify-persistence-changes` 仅报告这四处来源标注类型新增，且均判定为同版本变更。`pnpm run gen-persistence-catalog` 与 `pnpm run verify-persistence-formats --write` 在合并后的工作树上重新生成无误，迁移后的历史快照以 node-table 布局解析且摘要不变。`pnpm run typecheck` 与 `agent-preset-registry` 的专家测试在合并后的工作树上通过。

<a id="dev-note"></a>
## 开发备注

无。
