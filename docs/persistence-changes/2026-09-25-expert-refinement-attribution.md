---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-09-25-expert-refinement-attribution

English | [中文](2026-09-25-expert-refinement-attribution.zh.md)

## Summary

Qualifies the expert-refinement evidence source as an attribution-only kind on the user and developer message slots.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-09-25-expert-refinement-attribution
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-16-session-format-v4"
    after: "f3e06dbf38b9979c4afa8e3a61e39ff6f9d0c8a6b3661d39b7327463044b7cfc"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-16-session-format-v4"
    after: "19e1a893fac9f471d9bce7255de2f0628c6696fd9aa7229cdd05d4572954d50f"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-16-session-format-v4"
    after: "8769542102bb5ad28ba97928d886774ad74a343d74815624876db35255fff105"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-16-session-format-v4"
    after: "21211c2897d963778263e1223b0f46f84c8a3373e088145bbe506f37c45946c3"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

The kind carries no fields beyond its literal discriminator, so a reader that does not know it preserves the message and derives the transcript without a projection. Nothing about the kind is validated, replayed, or authoritative: the refinement child only receives its evidence window as ordinary user text, and the registry's own expertRefinement projection reads the recorded kind to keep that injected context out of the window it rebuilds. Every existing source kind keeps its current structure and policy, so the supported policy is unchanged and older readers need no handling beyond the preservation they already apply to unknown attribution kinds.

<a id="verification"></a>
## Verification

pnpm exec vitest run packages/preset/agent-preset-registry/tests: 82 tests passed, including a new case asserting the deployment skill catalog omits expert-prompt-refiner while the refinement child's scope contains it. pnpm run verify-persistence-changes then reported only attribution-kind-added differences, none requiring a version bump.

<a id="dev-note"></a>
## Dev Note

None.
