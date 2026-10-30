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
    previous: "2026-10-13-liveshare-share-viewer-principal"
    after: "321c9e06b22c358cd9b2633b8ee310d0681411f566076ed331953d46a131d3cf"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-10-13-liveshare-share-viewer-principal"
    after: "d6f99b0daa08fb03bf0b270ccb43e51eaef0cda4921c4f20e20e79d0caea718f"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-10-13-liveshare-share-viewer-principal"
    after: "9da22359c01b133992c6d52a843b489175542ac639c7aac2bea6fac7d517ebd4"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-10-13-liveshare-share-viewer-principal"
    after: "224844b2eb51ac5c35dccb14227c9ab5cb99e80fa88e9c7cb068087eda736ffe"
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
