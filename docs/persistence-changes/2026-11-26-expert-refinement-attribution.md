---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-11-26-expert-refinement-attribution

English | [中文](2026-11-26-expert-refinement-attribution.zh.md)

## Summary

Re-acknowledges the fork's expert-refinement source kind as the terminal transition after the upstream 2026-11-19-cua-input-notices record. The four message-bearing roots the refinement child touches expose that attribution-only kind; the kind, its literal discriminator, and every reader's handling of it are unchanged.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-11-26-expert-refinement-attribution
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-11-19-cua-input-notices"
    after: "3370d8e83e5de7055061399d1e170fe22f7510efe13f0d97314a8acb576a8536"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-11-19-cua-input-notices"
    after: "b4759e278597dab7aa4da0c4935b4556b607f2ba8545971cee2d4754ec2da51d"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-11-19-cua-input-notices"
    after: "de8359f166debdafe6e2e9f2f00285052665652624074cb73674e445b71d006c"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-11-19-cua-input-notices"
    after: "4df806650578c1e9ec4c37d82f2a45ade20369f903d2d1c03737116fe854b29b"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

The added kind carries no fields beyond its literal discriminator, so a reader that does not know it preserves the message and derives the transcript without a projection. Nothing about the kind is validated, replayed, or authoritative. This record adds only the attribution-only expert-refinement kind on top of the upstream records that already acknowledge the cua input notices on the same roots, so the supported policy is unchanged: older readers apply the preservation they already apply to unknown source kinds, and no migration or downgrade support is implied.

<a id="verification"></a>
## Verification

pnpm run verify-persistence-changes reports only these four attribution-kind additions, each classified as same-version, after the upstream cua input notices record. pnpm run gen-persistence-catalog and pnpm run verify-persistence-formats --write regenerate cleanly from the merged tree. pnpm run typecheck and the agent-preset-registry expert suites pass against the merged tree.

<a id="dev-note"></a>
## Dev Note

None.
