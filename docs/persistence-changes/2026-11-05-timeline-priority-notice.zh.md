---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-11-05-timeline-priority-notice

[English](2026-11-05-timeline-priority-notice.md) | 中文

## 概述

记录用户添加或取消紧急优先级时的时间线通知。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-11-05-timeline-priority-notice
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-10-26-source-attribution-kinds"
    after: "915185efaae46b4cffa548381acbe73e07901e02c87827966ea481242b49892f"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-10-26-source-attribution-kinds"
    after: "57bdd78ec25192e69a5ccaa7820c5cb0a9801a3695b3b44405232571b6bd1f52"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-10-26-source-attribution-kinds"
    after: "bdc64fa3f8bca8138d3cf3f1a0199624fe6416a6c07fe875268a8e01f521fe1e"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-10-26-source-attribution-kinds"
    after: "4f4c48d3a9c3bccda9b633ff5d7a15b96805ba59c3f592e41c2d619941644b95"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

已有消息保留原有来源和含义。时间线通知包含普通文本和来源标签。未加载时间线的读取方可保留未知来源并读取文本，无需应用任务更新。时间线将任务树、报告和讨论保存为会话日志中可忽略的 `plugin:timeline/*` 记录。未加载时间线的读取方会跳过这些记录。

<a id="verification"></a>
## 验证

时间线优先级测试验证仅用户修改紧急优先级时才排入通知。进程恢复测试验证写入进程意外退出后仍可恢复时间线状态。

<a id="dev-note"></a>
## 开发备注

无。
