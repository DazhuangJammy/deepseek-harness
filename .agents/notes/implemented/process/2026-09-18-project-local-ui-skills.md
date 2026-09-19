# Agent Note: Project-local UI skills

Status: implemented

English | [中文](2026-09-18-project-local-ui-skills.zh.md)

## Problem

UI design instructions installed only in one developer's Codex home are absent from other checkouts and from DeepSeek Harness sessions. The repository needs a reproducible skill set without requiring a plugin that contributes executable behavior.

## Decision

The repository keeps six project-local skills under `.agents/skills`, where `dsh-skill-filesystem` discovers directory bundles directly. Static instruction bundles do not receive Cordis plugin wrappers.

- [`frontend-design`](../../../skills/frontend-design/SKILL.md) follows `anthropics/skills` at `skills/frontend-design`.
- [`emil-design-eng`](../../../skills/emil-design-eng/SKILL.md) follows `emilkowalski/skill` at `skills/emil-design-eng`.
- [`taste-skill`](../../../skills/taste-skill/SKILL.md) follows the current default `leonxlnx/taste-skill` bundle at `skills/taste-skill`; its own description limits it to landing pages, portfolios, and redesigns rather than product dashboards.
- [`better-icons`](../../../skills/better-icons/SKILL.md) follows `better-auth/better-icons` at `skills/SKILL.md`.
- [`baseline-ui`](../../../skills/baseline-ui/SKILL.md) preserves the accepted local instruction file. The repository makes no upstream-source or license claim for this local adaptation.
- [`dazhuangskill-creator`](../../../skills/dazhuangskill-creator/SKILL.md) follows `DazhuangJammy/DazhuangSkill-Creator` and includes the instruction file, version, license, configuration, agents, templates, references, runtime scripts, and evaluation viewer.

Each externally maintained bundle keeps its upstream license beside the instruction file. Upstream refreshes replace the relevant instruction and license files together after review. The project copy does not contain nested Git metadata and does not update itself by pulling another repository.

The creator bundle excludes repository metadata, caches, test-only scripts, development notes, and historical evaluation output. Its retained files include every repository-owned support file invoked by the creator workflows; memory state and guard files named by its templates are generated inside target skill directories.

## Alternatives considered

**Wrap each skill in a Cordis plugin.** The filesystem provider already discovers project bundles, so wrappers would add manifests and activation code without providing another capability.

**Depend on user-global skill directories.** Global installations vary by machine and cannot reproduce the skill catalog from a checkout.

**Embed complete upstream repositories.** Nested Git metadata, upstream tests, and historical reports do not participate in skill execution and would make review and updates larger.

## Consequences

Sessions using the standard preset can discover the six skills from the project checkout. Their frontmatter descriptions remain the invocation boundary, so overlapping design skills retain their upstream scopes instead of being merged into one instruction file.

The four upstream-backed UI skills can drift behind their sources and require deliberate refreshes. `baseline-ui` remains a repository-owned local copy whose external source is unverified. The creator's update checker can report a newer release, but the vendored copy cannot update the parent repository automatically.

Repository checks parse the skill frontmatter, load each new instruction through the filesystem provider, validate invocation metadata, and verify the bilingual decision record. The creator's strict self-check currently misclassifies its own memory-authoring guidance as enabled memory state, so it is not completion evidence for the vendored creator itself. Updating an upstream snapshot requires the repository checks and a review of changed instructions before adoption.
