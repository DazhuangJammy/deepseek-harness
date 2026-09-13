# Agent Note: Expert refinement standard inheritance

Status: implemented

English | [中文](2026-09-12-expert-refinement-standard-inheritance.zh.md)

## Problem

Expert prompt refinement selected the `standard` preset but also imposed its own persona, request-size limit, output-token limit, and deadline. Those overrides could reject or stop work that the standard Agent's compaction, model route, retry policy, and normal run lifetime would otherwise handle, so selecting the preset did not preserve its complete behavior.

## Decision

The Host starts refinement as an in-process one-shot child with `agentPreset: standard` and supplies only the expert task, logged evidence context, structured-output schema, and cancellation signal. It does not override persona, Agent options, request size, retry policy, or run duration. The child therefore receives the complete standard composition, while the selected model route remains the authority for provider, model, reasoning effort, output policy, and request retries. Caller cancellation and parent maintenance remain the only refinement-specific early-stop inputs.

The one-shot run owns one submitted task and its structured result; it does not define the child's capabilities. The standard preset still supplies its complete prompt sections, tools, skills, context compaction, goals, subagents, workflows, and other registered behavior throughout that run.

## Alternatives considered

**Raise the refinement-specific limits.** Rejected because any separate values can drift below the standard route or terminate work that the standard Agent still considers valid. Removing the duplicate policy preserves one authority.

**Move refinement to a continuable child.** Rejected because refinement has one task and one structured result, while the existing one-shot in-process driver already mounts the complete standard preset and owns result capture and quiescent cleanup. Continuability would add a second orchestration lifecycle without adding a standard-mode capability.

**Retry terminal results in the refinement coordinator.** Rejected because request retries and context-overflow recovery already belong to the selected route and standard compaction plugin. A coordinator retry would create a second policy and could repeat completed tool work.

## Consequences

Refinement has no shorter token allowance, input allowance, or wall-clock lifetime than the standard child it starts. Model providers can still enforce their configured context and output limits, but the expert workflow does not add stricter limits or replace their recovery behavior. The browser Stop action and parent teardown still cancel the child through the same signal path.

Focused workflow coverage proves that the start request selects `standard` and omits persona and Agent-option overrides. The existing keyless expert-refiner snapshot continues to pin the model-visible skill task through the shipped profile.
