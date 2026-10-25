---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-26-source-attribution-kinds

English | [中文](2026-10-26-source-attribution-kinds.zh.md)

## Summary

Re-acknowledges the fork's expert-refinement source kind after the upstream session-schema normalization began recording attribution kinds in the persisted schema inventory. The four message-bearing roots the refinement child touches newly expose that attribution-only kind; the kind, its literal discriminator, and every reader's handling of it are unchanged.

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
## Compatibility

The added kind carries no fields beyond its literal discriminator, so a reader that does not know it preserves the message and derives the transcript without a projection. Nothing about the kind is validated, replayed, or authoritative. The fork recorded the same attribution-only transition in `2026-09-25-expert-refinement-attribution`; this record restates it because the merged schema inventory now expresses attribution kinds explicitly. Every existing source kind, field, and policy keeps its current structure, so the supported policy is unchanged: older readers apply the preservation they already apply to unknown source kinds, and no migration or downgrade support is implied.

<a id="verification"></a>
## Verification

`pnpm run verify-persistence-changes` reports only these four attribution-kind additions, each classified as same-version. `pnpm run gen-persistence-catalog` and `pnpm run verify-persistence-formats --write` regenerate cleanly from the merged tree, and the migrated historical snapshots parse under the node-table layout with unchanged digests. `pnpm run typecheck` and the `agent-preset-registry` expert suites pass against the merged tree.

<a id="dev-note"></a>
## Dev Note

None.
