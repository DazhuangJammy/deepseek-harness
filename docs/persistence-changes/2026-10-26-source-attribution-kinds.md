---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-26-source-attribution-kinds

English | [中文](2026-10-26-source-attribution-kinds.zh.md)

## Summary

Re-acknowledges the fork's expert-refinement source kind as the terminal transition after upstream's subagent-settlement attribution and retry-control-input records. The four message-bearing roots the refinement child touches expose that attribution-only kind; the kind, its literal discriminator, and every reader's handling of it are unchanged.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

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
## Compatibility

The added kind carries no fields beyond its literal discriminator, so a reader that does not know it preserves the message and derives the transcript without a projection. Nothing about the kind is validated, replayed, or authoritative. This record adds only the attribution-only expert-refinement kind on top of the upstream records that already acknowledge the stopReason settlement attribution on the same roots, so the supported policy is unchanged: older readers apply the preservation they already apply to unknown source kinds, and no migration or downgrade support is implied.

<a id="verification"></a>
## Verification

pnpm run verify-persistence-changes reports only these four attribution-kind additions, each classified as same-version, after the upstream records for the same roots. pnpm run gen-persistence-catalog and pnpm run verify-persistence-formats --write regenerate cleanly from the merged tree. pnpm run typecheck and the agent-preset-registry expert suites pass against the merged tree.

<a id="dev-note"></a>
## Dev Note

None.
