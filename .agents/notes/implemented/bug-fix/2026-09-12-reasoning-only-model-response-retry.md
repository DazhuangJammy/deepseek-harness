# Agent Note: Reasoning-only model responses are retryable failures

Status: implemented

English | [中文](2026-09-12-reasoning-only-model-response-retry.zh.md)

## Problem

Thinking-capable models can finish a well-formed response after emitting reasoning but before emitting reply text or a tool call. Both model adapters treated any reasoning block as successful content, so the agent loop committed the attempt and ended the turn without an answer. The reported failures occurred in Chat and expert Sessions, whose complete persona omits Standard mode's additional instructions, but both modes use the same adapters, retry policy, Session events, and conversation renderer. Markdown, JSON, document projection, and image projection do not explain the loss: non-whitespace Markdown or JSON is ordinary reply text, while file and image references are projected before dispatch.

## Decision

The DeepSeek and pi-ai adapters classify a terminal `stop` as `EMPTY_RESPONSE` unless the response carries non-whitespace reply text or a tool call. Reasoning remains in the failed attempt's embedded stream, but it cannot make a response successful by itself. The existing `agent/request-error` and `dsh-llm-retry` path retries the request within the provider's configured budget; exhausting that budget produces an explicit turn failure. `max-tokens`, tool-call, error, and aborted finishes keep their existing classifications.

This decision extends the archived [empty model completion rule](../../archived/bug-fix/2026-07-24-empty-model-response-is-retryable.md), which deliberately accepted reasoning-only responses. The product presents reasoning as process rather than the requested answer, so a successful turn requires output the user or loop can act on.

## Verification

Both adapter suites cover reasoning-only terminal stops and preserve successful reasoning followed by text. The expert editor suites separately pin save-state feedback and version behavior; the keyless empty-response retry scenario carries reasoning in its failed attempt and pins the shared retry lifecycle.

## Alternatives considered

**Show an empty-answer warning only in the conversation renderer.** The Session would still record a successful answerless message, retries and non-Web consumers would not recover, and the same provider result would have different meanings by client.

**Append a final-answer instruction to Chat and expert prompts.** Expert prompts are intentionally complete personas for API-like interaction, and prompt wording cannot guarantee that every provider emits reply text after reasoning.

**Add Chat-only stream middleware.** The defect is a model-response classification shared by Chat and Standard mode. A mode-specific listener would duplicate the rule across routes and leave other consumers vulnerable.

## Consequences

A transient reasoning-only completion consumes bounded retry capacity instead of silently completing a turn. A model that intentionally returns reasoning without an answer is retried and eventually fails explicitly; this is accepted because neither the user nor the loop can use that response as a completed answer. Chat keeps its restricted composition and file capabilities unchanged.
