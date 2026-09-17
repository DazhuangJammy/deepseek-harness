---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-09-17-expert-prompt-applied

English | [中文](2026-09-17-expert-prompt-applied.zh.md)

## Summary

Adds the expert/prompt-applied event that records the complete expert prompt version selected for subsequent requests.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-09-17-expert-prompt-applied
baseline: false
changes:
  - root: "event:expert/prompt-applied"
    previous: null
    after: "b0af06fa851fc7d94395555a72d0b9273cc66c7859fed70d5aff6c1b8945fbac"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

Existing Session logs remain valid because they do not require this event. Logs that contain expert/prompt-applied require a reader that knows the event; the current agent-presets projection restores the selected prompt and version from it. Adding a named event root is allowed without changing the Session format version.

<a id="verification"></a>
## Verification

pnpm exec vitest run packages/preset/agent-presets/tests/expert-session.spec.ts packages/preset/agent-presets/tests/expert-workflow.spec.ts: 2 test files and 10 tests passed.

<a id="dev-note"></a>
## Dev Note

None.
