---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-11-05-timeline-priority-notice

English | [中文](2026-11-05-timeline-priority-notice.zh.md)

## Summary

Records a Timeline notice when the user adds or removes urgent priority.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

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
## Compatibility

Existing messages keep their source and meaning. Timeline notices carry ordinary text and a source label. Readers without Timeline can keep the unknown source and read the text without applying a task update. Timeline stores task trees, reports, and discussions in the session log as ignorable `plugin:timeline/*` records. Readers without Timeline skip these records.

<a id="verification"></a>
## Verification

Timeline's priority tests check that only user edits to urgent priority enqueue a notice. The process recovery test checks that Timeline state survives an interrupted writer.

<a id="dev-note"></a>
## Dev Note

None.
