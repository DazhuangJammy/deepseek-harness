# Agent Note: Agent-scaled design and owner-operated delivery

Status: implemented

English | [中文](2026-08-21-agent-scaled-design-and-owner-operated-delivery.zh.md)

## Problem

Many coding agents may change this repository in parallel, so they need stable ownership, dependency, and source-of-truth rules. The human integration and release path is nevertheless owner-operated: one maintainer validates changes locally and releases them. Applying a conventional large-team checklist to both concerns would mix useful architecture constraints with review roles, promotion environments, rollout processes, and fixed quotas that have no current owner or deployment need.

Generic architecture checklists also prescribe particular layers, patterns, file limits, and abstractions without reference to the repository's existing plugin model. Those prescriptions can create a second architecture beside Cordis, while raw file length alone does not show whether a file has more than one responsibility.

## Decision

Repository architecture and the nearest `AGENTS.md` take precedence over generic patterns. Modules stay cohesive around an owned reason to change. Cross-module dependencies use an existing typed service, event, or public API intended for that relationship; they do not reach through implementation details or introduce cycles. DDD, conventional application layers, events, interfaces, factories, and other patterns are used only when the actual domain or repository architecture calls for them.

Implementation starts with the smallest direct solution. An abstraction, option, shared helper, or extension point requires a current consumer, observed variation, or duplicated knowledge with one legitimate owner. Domain rules, types, configuration, and documentation each retain one authoritative source. Similar code with different ownership is not automatically duplication.

Source files crossing 500 lines receive a responsibility review, not an automatic split. Generated files, declarative catalogs, and cohesive tests may remain larger. A split must create a real ownership or dependency boundary. Performance work follows a measured bottleneck after correctness rather than anticipated scale.

Architecture and documentation remain explicit enough for parallel agent work. Delivery remains owner-operated: changes stay small and reversible, Git records recovery points, and the maintainer releases only after the narrowest local checks that prove the changed behavior pass. Irreversible data or external effects require a backup or rollback plan. Manual review, additional CI/CD stages, environment-promotion ladders, canary rollout, and fixed coverage or technical-debt quotas are not defaults; an existing repository rule or concrete deployment risk may still require them.

## Alternatives considered

**Adopt the complete large-team checklist verbatim.** Rejected because fixed layers, file limits, coverage percentages, review roles, and deployment stages do not follow from this repository's architecture or owner-operated release process. The checklist would add ceremony and could conflict with stronger repository-specific rules.

**Keep only the existing repository-specific rules.** Rejected because agents also need a short general rule for responsibility, dependency direction, abstraction thresholds, file-size signals, and the distinction between parallel implementation and single-owner release.

**Refactor every large file immediately.** Rejected because length is only a search-cost signal. Existing behavior stays unchanged until a concrete change reveals a separable responsibility and can verify that split.

## Consequences

Agents share stable decision rules without adding a second architecture. New work follows existing extension points and creates abstractions only from evidence. Large files become candidates for focused review, not mechanical rewrites.

The maintainer keeps a short local release loop while retaining repository quality gates and risk-driven rollback requirements. Team-oriented delivery controls can be added when an actual team, external obligation, or deployment risk gives them a current purpose.
