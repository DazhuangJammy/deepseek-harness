---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-09-17-expert-prompt-applied

[English](2026-09-17-expert-prompt-applied.md) | 中文

## 概述

新增 expert/prompt-applied 事件，记录后续请求采用的完整专家提示词版本。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-09-17-expert-prompt-applied
baseline: false
changes:
  - root: "event:expert/prompt-applied"
    previous: null
    after: "b0af06fa851fc7d94395555a72d0b9273cc66c7859fed70d5aff6c1b8945fbac"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

已有 Session 日志仍然有效，因为它们不依赖此事件。包含 expert/prompt-applied 的日志需要认识该事件的读取方；当前 agent-presets 投影会据此恢复所选提示词和版本。新增具名事件根允许保持 Session 格式版本不变。

<a id="verification"></a>
## 验证

pnpm exec vitest run packages/preset/agent-presets/tests/expert-session.spec.ts packages/preset/agent-presets/tests/expert-workflow.spec.ts：2 个测试文件、10 项测试通过。

<a id="dev-note"></a>
## 开发备注

无。
