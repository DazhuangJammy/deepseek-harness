# Agent Note: Tool-free chat preset

Status: implemented

English | [中文](2026-08-21-tool-free-chat-preset.zh.md)

## Problem

The shipped presets all spend model context on coding capabilities. A user who only wants a conversation still receives project instructions, skill guidance, tool schemas, and runtime snapshots, increasing request size and latency without helping the answer.

A chat surface must still preserve the session transcript. Runtime context and conversation history are different inputs: disabling the former must not turn each message into an isolated request.

## Decision

`chat` is the fifth shipped agent preset. It mounts one complete conversational persona and no tool, skill, project-instruction, or compaction plugins. `includeRuntimeContext: false` suppresses dynamic plugin snapshots only; the agent loop still passes `session.deriveMessages()` to every model request, so a later turn includes the prior user and assistant messages.

The preset stays in the existing picker rather than adding a top-level tab. A preset already owns one session's model-visible composition, while a tab would create a second session lifecycle and navigation model for the same operation.

No compaction policy is mounted. The model therefore receives the complete unreplaced transcript until the selected model's finite context window is exhausted. Unlimited turns with unlimited verbatim history are impossible; adding compaction later would deliberately replace older messages with a summary rather than preserve them word for word.

Image attachments remain available through the host's existing message path when the selected model supports images. Other document formats require a separate ingestion capability and are not implied by this preset.

## Alternatives considered

**Modify `minimal`.** Rejected because `minimal` is a two-tool coding preset with a benchmark-specific persona. Removing its tools or changing its prompt would erase an existing product choice instead of adding conversation.

**Add a separate API backend or top-level chat tab.** Rejected because the normal session and LLM pipeline already provides streaming, persistence, model selection, attachments, and transcript replay. A parallel backend would duplicate those responsibilities and make chat history behave differently from every other preset.

**Mount automatic compaction.** Rejected because the requested behavior is to send the current transcript unchanged. Compaction extends usable conversation length by replacing old messages, which is a different guarantee and can be added explicitly later.

## Consequences

The preset removes tool schemas and runtime material from each model request but does not make requests stateless. Its request header omits `tools`, and its second and later requests carry the preceding transcript in order.

The shipped Web composition test pins the exact persona, empty tool assembly, absent compaction service, and a two-turn request containing the first question and answer. The keyless JSON-RPC snapshot pins the assembled chat composition and persisted model-visible transcript without a `tools` header field.

The active [preset architecture](../architecture/2026-08-03-per-session-agent-presets.md) and [per-agent tool-presentation](2026-08-05-per-agent-tool-presentation.md) notes remain authoritative for composition and presentation. This decision adds one roster member and does not supersede either mechanism.
