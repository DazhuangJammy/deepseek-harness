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
## Compatibility

The kind carries no fields beyond its literal discriminator, so a reader that does not know it preserves the message and derives the transcript without a projection. Nothing about the kind is validated, replayed, or authoritative: the refinement child only receives its evidence window as ordinary user text, and the registry's own expertRefinement projection reads the recorded kind to keep that injected context out of the window it rebuilds. Every existing source kind keeps its current structure and policy, so the supported policy is unchanged and older readers need no handling beyond the preservation they already apply to unknown attribution kinds.

<a id="verification"></a>
## Verification

pnpm exec vitest run packages/preset/agent-preset-registry/tests: 82 tests passed, including a new case asserting the deployment skill catalog omits expert-prompt-refiner while the refinement child's scope contains it. pnpm run verify-persistence-changes then reported only attribution-kind-added differences, none requiring a version bump.

<a id="dev-note"></a>
## Dev Note

None.
