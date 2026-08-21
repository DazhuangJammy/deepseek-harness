# Agent Note: Read-only Agent architecture learning view

Status: implemented

English | [中文](2026-08-20-agent-learning-view.zh.md)

## Problem

DeepSeek Harness already records the facts needed to understand an Agent run, and [Trajectory](2026-07-27-trajectory-inspection-ledger.md) already presents the detailed ledger. A learner still needs a smaller explanation of how User input, the Agent Loop, model requests, tools, and the next Step relate without adding another runtime observer or changing model behavior.

## Decision

The `@deepseek-ai/dsh-client-ui-learning` browser plugin registers one session-scoped `conversation.view` entry named `learning`. It reads the standard `ConversationSnapshot` only and derives a teaching list plus a fixed Agent chain. Selecting a record explains what happened, why it happened, the capability category responsible, its input and output, the next destination, and related terms. The plugin owns no service, event listener, persistence event, prompt section, model request, tool, or cross-plugin mutable state. Its contribution is removed with the slot disposer when the plugin unloads.

The source package lives under `packages/client/ui-learning`, so the client aggregate, tsdown manifest scan, package invariants, and per-file coverage gate all inspect the same implementation. Related terms are clickable and open a dictionary that pairs beginner-facing explanations with exact technical definitions, repository ownership, collaborators, and current evidence; records still map one by one from `ConversationSnapshot`, with only the teaching copy selected by record kind.

## Alternatives considered

**Build a second event monitor.** This would duplicate the Session/Trajectory projection and create competing runtime facts. The view consumes the existing snapshot instead.

**Replace Trajectory with a teaching redesign.** Trajectory owns detailed timing, prompt, schema, and event inspection. Combining those responsibilities would make both the reference ledger and the beginner explanation harder to evolve.

**Add a host Remote for internal Cordis calls.** The current learning goal is the Agent execution chain, not an unbounded inspector of every Service method. A future precise host projection can be added when a concrete lesson needs it.

## Consequences

The first version is safe to hot-unplug and has no model or persistence effect. Learners get a stable architecture vocabulary while the detailed Trajectory tab remains available for evidence. Explanations stop at projection-level facts and intentionally do not invent per-event ownership for every plugin or claim that every internal call is visible. Focused browser tests cover the populated and empty Session states and record selection.
