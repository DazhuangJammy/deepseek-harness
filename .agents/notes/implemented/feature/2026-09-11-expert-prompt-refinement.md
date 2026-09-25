# Agent Note: Expert prompt refinement

Status: implemented

English | [中文](2026-09-11-expert-prompt-refinement.zh.md)

## Problem

A conversation can prove that one local prompt instruction is weak: the user corrects an answer and a later answer demonstrates the better behavior. Keeping that learning only in the transcript makes it unavailable to the next conversation, while rewriting the complete prompt from one example can erase unrelated behavior.

Users also need to inspect and reject a model-proposed prompt change. An automatic write would treat a probabilistic interpretation as accepted configuration and would leave no stable account of which text changed.

## Decision

An expert uses a managed Chat-mode agent preset internally. Its directory contains the managed composition, `expert.json`, and immutable numbered prompt and change-record files under `versions/`. Creation assigns the preset a hidden stable identifier instead of asking the user for a directory name. The expert prompt is the complete persona for its Sessions; its welcome message is browser copy and never enters model history. The public Agent-mode roster omits experts, while the expert roster exposes them only inside Chat. The managed composition uses Chat's shell and filesystem tools, and mounting restores that composition for an expert written by an earlier release.

The existing `agent-presets` service owns expert discovery, creation, edits, version conflicts, and refinement. Expert selection uses the existing blank-Session preset switch. The browser contributes a searchable expert picker to the composer menu and uses the existing right Sidebar for management, child-Agent progress, comparison, editing, and confirmation. The picker orders Expert list, Add expert, then expert rows; each expert row keeps its version beside its name and pins Edit to the far edge as a secondary row action. Save expert stays disabled until a field differs from the committed document, locks the fields while saving, and reports Saved after a successful write until another edit. Explicit management navigation clears that Session's browser-held refinement state, and request identity prevents a late optimization settlement from reopening the review.

Refinement is a Host-owned in-process one-shot child Agent. It runs the complete existing `standard` preset, inherits the current Session's selected model route, and receives a compact Chinese user message that explicitly invokes the bundled `expert-prompt-refiner` skill, which registers on the published child's own scope rather than the deployment catalog. The coordinator adds no persona, request-size, output-token, retry, or deadline override, so the standard composition and model route retain authority over every runtime capability and execution policy ([decision](../bug-fix/2026-09-12-expert-refinement-standard-inheritance.md)). The Chinese skill requires an explicit correction plus a later improved result, changes the smallest supported prompt clause, and calls the existing `structured_output` tool exactly once. It preserves the prompt's language while writing summary and reason fields in Simplified Chinese. The child Session records its normal Agent events, skill injection, and tool activity; the Host validates every captured field and holds the candidate in memory.

A candidate writes nothing. The browser reuses the existing conversation view to show the child Session without a composer: the expert panel requests read-only `fixedSessionSlots` authority for `conversation.view`, and the renderer supplies a fixed-binding view without transferring declaration ownership or creating a cross-plugin runtime import. The child receives a compact user task that triggers the skill and a preceding plugin-sourced `promptContext` containing the complete expert system prompt plus the configured recent window of user inputs and assistant final-text answers. Assistant reasoning blocks and embedded reasoning stream records remain in the source Session and never enter the refinement context. The injected context renders through the existing collapsed Context injection row; the refinement child's own reasoning keeps the normal live one-line collapsed preview. A run-header Stop action aborts an in-flight start through its RPC signal or dismisses and disposes a published child. The panel then presents the complete old and proposed prompts side by side. The proposed prompt remains editable, and acceptance submits that reviewed text against the proposal held by the Host. Acceptance requires the base version to remain current and appends one immutable version. Saving changed prompt text or accepting a candidate installs an agent-local complete-prompt override for later requests in the addressed expert Session; other open Sessions keep their versions. Each history row lazily reads that version and its immediate predecessor into the same side-by-side highlighting in read-only form. Metadata-only edits create no history row. The prompt-application event lets a resumed Session restore the selected override. New expert Sessions read the committed current version. An ordinary branch keeps its selected conversation prefix but applies the current expert version before publication, so the next request records the existing system-prompt update when the text differs. A stale editor or old Session receives a version conflict rather than merging or overwriting a newer prompt.

## Alternatives considered

**Create a separate expert plugin and session type.** Rejected because agent presets already own per-Session composition, independent directories, discovery, selection, and lifecycle. A parallel expert registry would create two authorities for the prompt a Session runs.

**Mount the normal skill catalog in Chat mode.** Rejected because the expert conversation needs file handling, not the standard skill catalog. The separate `standard` child supplies the existing skill loader and full tool presentation only for the refinement run; the expert conversation receives Chat's file tools without skill discovery.

**Call the model directly without an Agent Session.** Rejected because a private stream would need a second progress protocol and renderer, while hiding the skill injection, reasoning, and tool events that the existing Session and conversation view already present.

**Let the conversation model rewrite its prompt automatically.** Rejected because conversation output does not prove that every proposed generalization is desirable. A reviewable candidate and explicit acceptance keep configuration changes under human control.

**Store only the newest prompt.** Rejected because side-by-side review and later diagnosis need immutable source versions and the exact reasons accepted with each change.

## Consequences

Experts use the ordinary agent-preset mechanism for composition and Session reconstruction, but only the expert endpoints list them to product surfaces. The archived [per-Session preset decision](../../archived/architecture/2026-08-03-per-session-agent-presets.md) and [Chat file-capability decision](2026-09-11-chat-file-capabilities.md) own those mechanisms.

The child Agent adds a separate `standard`-preset model run only when a person invokes refinement. Its full input, skill injection, and output live in the child Session rather than the parent conversation. Saving or accepting a version changes the addressed Session's prompt prefix and therefore restarts provider cache reuse from that prompt. Other open Sessions keep their installed prompt; new Sessions and ordinary branches use the committed current version, and resumed Sessions restore their last applied version.

Version files are append-only and private to the local user root. The current pointer and display metadata use atomic replacement, and every update checks its expected version. Two editors can read concurrently, but only the first write based on that version commits.
