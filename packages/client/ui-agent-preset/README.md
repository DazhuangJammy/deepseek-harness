---
description: "Agent-preset surfaces for the Web GUI: picker visibility and default settings, the new-session chip, the session-header label, and preset roster management; for users and maintainers of agent composition."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-agent-preset

English | [中文](README.zh.md)

## Summary

Use this package to choose the agent preset for a new Web GUI session, manage conversation experts, and review local expert-prompt refinements. Coding Tools in General Settings show or hide the mode picker without changing running or historical sessions. Experts reuse the preset composition and add a welcome message, prompt editor, version history, and an assistant-message action that shows a child Agent run before opening an editable side-by-side proposal in the right Sidebar. If the deployment provides no presets, the mode controls stay hidden and every session uses the host composition.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this plugin alongside the settings and conversation packages; the management section then shows the preset roster. Coding Tools in General Settings decide whether a mode can be chosen at all: with them off the new-session picker disappears and the cards refuse selection, while the saved default keeps composing new tasks. Choosing a healthy default also synchronizes the blank session on the current new-task surface. Creator starts a new task using the `cordis` preset.

The shipped roster contains `standard`, `ptc`, `minimal`, `cordis`, and `chat`. The `chat` preset keeps the normal Session transcript and model route, uses Standard mode's shell and filesystem tools for uploaded files, and omits skills, project instructions, runtime context, and compaction.

### Managing the roster

The settings section lists the roster as cards in two groups: shipped presets first, then the ones this deployment declared itself. Each card carries the preset's display copy, its id, and a badge naming its state, and a broken preset adds the host's reason on the badge, in a tooltip, and in an alert the disabled card body cannot carry. A row the shipped copy knows about also offers Mode explanation and How to use, which open that preset's curated guidance. Choosing a healthy non-default card makes it the user default for later sessions; if the current new-task surface already reuses a blank session, that explicit Settings action carries the same preset to that exact blank session through the existing selection path. Started and historical sessions remain unchanged. Selection is offered only while Coding Tools are on, and a card is disabled while a policy write is in flight; a failed write keeps the prior preference and shows an error. A broken preset cannot be selected at all.

Reading a declaration is the one thing this page offers beyond choosing: every card keeps a viewer action that opens the preset's declared child plugin list as YAML in a read-only dialog, and a broken preset stays readable because that declaration is where its diagnostic points. The Custom group ends with a Creator-mode entry whenever the deployment composes the conversation flow the draft needs; it stages the self-referential `cordis` preset and starts a new task, and stays disabled until Coding Tools are on.

### The conversational entry

When the roster carries the self-referential `cordis` preset, its dashed add-card stays disabled until Coding Tools are on. It then stages `cordis` and starts a new session — the section closes the settings panel and the new-session chip's own applier composes the blank session the workspace flow produces.

### Experts

The composer's add menu opens a searchable expert picker. Expert list stays first, Add expert stays directly below it, and the expert rows follow. Experts never appear in the Agent preset picker or Settings roster. Each expert row keeps its version beside the name and pins Edit to the far edge, revealing it on hover or keyboard focus; touch layouts keep Edit visible. Selecting an expert applies its managed Chat composition to the current blank Session without displaying its prompt as a user message. The blank conversation shows the expert's welcome message as the first-message cue. Expert list, Add expert, and Edit replace an open refinement review with the requested management page; the expert-list page also provides Add expert. Add expert assigns a hidden stable identifier automatically. Add and edit show the optional icon, name, welcome message, prompt, and version history fields in the right Sidebar. An unchanged edit keeps Save expert disabled; changing any field enables it, saving locks the fields, and a successful write changes the disabled action to Saved until the next edit. Saving changed prompt text applies the resulting version to the current Session when it runs that expert; other open Sessions keep their installed prompts. Selecting a version opens the same highlighted side-by-side prompt comparison in read-only mode; name, icon, and welcome-message edits persist without creating a version entry.

Each finalized assistant message in an expert Session carries an Optimize expert prompt action. The action expands the right Sidebar immediately and reuses the normal conversation view to show the child Agent's context, compact Chinese task, reasoning, skill loads, and tools without a composer. The complete expert prompt and conversation evidence use the existing collapsed Context injection row instead of a user bubble. Reasoning uses the normal collapsed disclosure and live one-line preview. The final candidate uses the existing structured-output tool rather than printing JSON as assistant prose. A Stop prompt optimization button remains at the run header's far edge during startup and execution; it aborts the start or disposes the published child. A changed candidate renders the complete current and proposed prompts side by side with word-level highlighting and Chinese change reasons. The proposed prompt remains directly editable and recomputes its highlights before acceptance; a no-change candidate states why. Keep current prompt dismisses the candidate. Accept new version is the only action that writes it.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The settings section writes the Host's existing `agent-preset-registry` namespace through `settings.update`, and its make-default action writes `selectedDefault`. After that write, the Host roster supplies the effective default, and the chip controller's `agentPresets/select` path carries it to the same still-blank session; expert selection uses that same guarded path. `agentPresets/list` supplies the roster and marks the current default, and `agentPresets/read` one declaration's YAML for the viewer; the picker, blank-session synchronization and read-only session label use recorded preset identities. Expert management uses the typed expert endpoints and one shared browser store. The expert store keys optimization state by Session, so two open conversations cannot exchange candidates. During optimization, the store retains the observed child generation under `controllerOperation` without changing the selected main Session, and the renderer-injected `FixedSessionSlotView` binds the existing conversation slot to that retained reference; every exit from the running state releases it. The existing command menu owns expert search and selection; the right Sidebar owns management and review. [`dsh-client-connection`](../connection/README.md) authenticates all of these Host methods with the same browser session. The section re-reads on its own actions, `settings/document-updated`, and `connection/reset`.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the preset surface is not enough. They move from the browser surfaces to the preset domain and the composition model.

- [dsh-agent-preset-registry](../../preset/agent-preset-registry/README.md) — the host registry and composition the surfaces read.
- [ui-conversation](../ui-conversation/README.md) — declares the hero and session-header slots the chip and label fill.
- [ui-settings](../ui-settings/README.md) — the settings shell that hosts the roster section.
- [Client package map](../README.md) — adjacent browser UI packages.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the selected preset and the one-shot child Agent documented by [`dsh-agent-preset-registry`](../../preset/agent-preset-registry/README.md); progress and comparison rendering add no model-visible content of their own.

#### KV Cache effect

Changing picker visibility, defaults, unsaved editor fields, or an unaccepted candidate does not alter a running Session's prefix. Saving changed expert prompt text or accepting a refinement changes only the addressed Session's later requests through the Host workflow; an ordinary branch uses the current expert version. Each applied version starts reuse from its new prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define the current preset surfaces. They are current package constraints, not a general composition comparison or a task backlog.

- **A preset that publishes no metadata is listed by id** — display text is optional, so a declaration that names nothing deliberately falls back to its id rather than presenting itself identically to its source. The resolution itself is the shared `presetDisplayText` fold from [`dsh-agent-preset-registry/display`](../../preset/agent-preset-registry/README.md), which the Settings plugin list inlines over this plugin’s dictionaries to show shipped presets in the active locale without translating user-authored metadata.
- **The page is a reader, not an author** — the browser composes no preset: it selects a default, toggles picker visibility, and reads declarations. Authoring happens in a composition file outside the browser, so the roster re-reads on this page's own actions, `settings/document-updated`, and `connection/reset`, and nothing on the wire announces a disk edit.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. This is a browser-side surface plugin whose node half owns no event stream or mutable runtime data; the roster and the settings write are host contracts covered there.
