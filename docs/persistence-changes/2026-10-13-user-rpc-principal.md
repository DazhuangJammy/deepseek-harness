---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-13-user-rpc-principal

English | [中文](2026-10-13-user-rpc-principal.zh.md)

## Summary

Adds an optional principal to the user-rpc message source for prompts submitted by a caller other than the owner.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

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
## Compatibility

Owner prompts omit the field, so their sources and every existing Session log are unchanged; an absent principal means the owner. A reader that predates the field ignores it and treats the message as an ordinary user message, because the kind stays 'user'. A current reader of an older log finds no principal and treats every message as the owner's. The field is not part of any model request: provider adapters read only the model-visible message content. SESSION_FORMAT_VERSION does not change.

<a id="verification"></a>
## Verification

pnpm exec vitest run packages/api/session-controller/tests/remote-access.host.spec.ts packages/subagent/subagent/tests/control.spec.ts packages/api/session-controller/tests/session-cold.host.spec.ts: non-owner prompts persist source.principal in agent/inbox/spliced, owner and existing time-zone sources stay byte-identical; all tests passed.

<a id="dev-note"></a>
## Dev Note

None.
