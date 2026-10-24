---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-10-13-user-rpc-principal

[English](2026-10-13-user-rpc-principal.md) | 中文

## 概述

为 owner 以外的调用方提交的 prompt，在 user-rpc 消息来源上增加可选的 principal。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-10-13-user-rpc-principal
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-25-expert-refinement-attribution"
    after: "1867dbc961286912339d54af5cc8596c598319229ccc90fa10bb41810f87f743"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-25-expert-refinement-attribution"
    after: "5da8c599a6d8dffc9ac282e64f7574e60c80e8fabc179c208f2f53e71f7a463e"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-25-expert-refinement-attribution"
    after: "bfe31f830e4a173950c5f24a4582d40130f38ba4eedab2281275e03d4cde3c3e"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-25-expert-refinement-attribution"
    after: "78a17c83e7a3670654169fa3bce67173538fa573b9760fb90654472ac3afdb96"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

owner 的 prompt 不写该字段，因此其来源与所有既有 Session 日志都不变；缺少 principal 即为 owner。早于该字段的读取方会忽略它，并因 kind 仍为 'user' 而把消息当作普通用户消息。当前读取方读取旧日志时找不到 principal，把每条消息都视为 owner 的消息。该字段不进入任何模型请求：provider 适配器只读取模型可见的消息内容。SESSION_FORMAT_VERSION 不变。

<a id="verification"></a>
## 验证

pnpm exec vitest run packages/api/session-controller/tests/remote-access.host.spec.ts packages/subagent/subagent/tests/control.spec.ts packages/api/session-controller/tests/session-cold.host.spec.ts：非 owner 的 prompt 在 agent/inbox/spliced 中持久化 source.principal，owner 与既有时区来源保持逐字节不变；全部测试通过。

<a id="dev-note"></a>
## 开发备注

无。
