---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-09-25-expert-refinement-attribution

[English](2026-09-25-expert-refinement-attribution.md) | 中文

## 概述

把专家优化证据来源限定为仅表示归属的 kind，声明在用户与开发者消息的 source 槽位上。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-09-25-expert-refinement-attribution
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-21-user-question-reply"
    after: "08b16c8c6ce8990aa2d54120fb48aca535b08c6c06136d62078c6a4dc4194ac7"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-21-user-question-reply"
    after: "674cc0a7ba1742d51cbd4a93a4b9089827760b19dfbf2c3102deff874243f82f"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-21-user-question-reply"
    after: "d5622073c8667eb57c1e879f25216f5c4096ac71cae8f22c4cc0d91468b7274f"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-21-user-question-reply"
    after: "c0baf254bc3e452d8d6fe685c1c0488178b5e0710d511f31d88e15bfdcf9e7a7"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

该 kind 除字面量判别字段外不携带任何字段，因此不认识它的读取方会原样保留消息并照常推导转录，无需任何投影。该 kind 既不参与校验、回放，也不代表任何权限：优化子 Agent 只是以普通用户文本收到证据窗口，而注册表自身的 expertRefinement 投影会读取已记录的这个 kind，把它注入的上下文排除在重建的窗口之外。所有既有来源 kind 的结构与策略保持不变，因此受支持的策略没有变化，旧读取方除已有的未知归属 kind 保留行为外无需新增处理。

<a id="verification"></a>
## 验证

pnpm exec vitest run packages/preset/agent-preset-registry/tests：82 个测试通过，其中新增用例断言部署级 skill 目录不含 expert-prompt-refiner，而优化子 Agent 的作用域包含它。随后 pnpm run verify-persistence-changes 仅报告 attribution-kind-added 差异，均不要求提升版本。

<a id="dev-note"></a>
## 开发备注

无。
