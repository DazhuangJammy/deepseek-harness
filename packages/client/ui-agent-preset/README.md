---
description: "Agent-preset surfaces for the Web GUI: picker visibility and default settings, the new-session chip, the session-header label, and preset roster management; for users and maintainers of agent composition."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-agent-preset

English | [中文](README.zh.md)

## Summary

Use this package to choose the agent preset for a new Web GUI session, manage conversation experts, and review local expert-prompt refinements. The Agent mode picker is shown by default; Settings can hide it without changing running or historical sessions. Experts reuse the preset composition and add a welcome message, prompt editor, version history, and an assistant-message action that shows a child Agent run before opening an editable side-by-side proposal in the right Sidebar. If the deployment provides no presets, the mode controls stay hidden and every session uses the host composition.

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

Mount this plugin alongside the settings and conversation packages; the management section then shows a visibility switch that is on by default. While it is off, the new-session chip is absent and the Host composes an unnamed session from the deployment default (`standard` in the shipped Web bundle). Turning it on restores the saved user default, or uses the deployment default when none has been saved, and carries that default to the current blank task; a chip pick itself is staged only once for the next blank session. Turning the picker off again returns the current blank task to the deployment default the same way and discards an unconsumed stage; started and historical sessions keep their labels, compositions, and recorded history.

The shipped roster contains `standard`, `ptc`, `minimal`, `cordis`, and `chat`. The `chat` preset keeps the normal Session transcript and model route, uses Standard mode's shell and filesystem tools for uploaded files, and omits skills, project instructions, runtime context, and compaction.

### Managing the roster

The settings section shows the roster as cards: a copy dialog is the only way a preset is created — the browser edits no composition text — and every custom card keeps a location action that opens the preset's own files. The visibility switch changes only whether the saved user default is active: the Host uses the deployment default while hidden and restores the saved default when the picker is shown again. While the picker is enabled, choosing a healthy non-default card writes a new user default for later sessions; if the current new-task surface already reuses a blank session, that explicit Settings action carries the same preset to that exact blank session through the existing selection path. Started and historical sessions remain unchanged. The switch is disabled while saving, and a failed write keeps the prior preference and shows an error. Hiding the picker disables default selection and the Creator launch but leaves roster viewing, copying, location, and deletion available. Deleting removes the preset directory while sessions already composed from it keep running. A shipped preset opens in a read-only viewer and offers no location or delete. A roster row carrying `broken` renders as a marked card whose body and duplication are disabled, because a copy of a broken preset is another broken preset; broken custom rows keep their location and delete actions so the files can be fixed and ghost directories cleared. The card face still shows the preset's own description — a chooser cannot act on a package specifier there — and the host's reason rides the badge as a tooltip, plus a visually hidden alert that carries it to assistive technology, which a disabled card body cannot.

### The conversational entry

When the roster carries the self-referential `cordis` preset, its dashed add-card stays disabled until the picker is enabled. It then stages `cordis` and starts a new session — the section closes the settings panel and the new-session chip's own applier composes the blank session the workspace flow produces.

### Experts

The composer's add menu opens a searchable expert picker. Expert list stays first, Add expert stays directly below it, and the expert rows follow. Experts never appear in the Agent preset picker or Settings roster. Each expert row keeps its version beside the name and pins Edit to the far edge, revealing it on hover or keyboard focus; touch layouts keep Edit visible. Selecting an expert applies its managed Chat composition to the current blank Session without displaying its prompt as a user message. The blank conversation shows the expert's welcome message as the first-message cue. Expert list, Add expert, and Edit replace an open refinement review with the requested management page; the expert-list page also provides Add expert. Add expert assigns a hidden stable identifier automatically. Add and edit show the optional icon, name, welcome message, prompt, and version history fields in the right Sidebar. An unchanged edit keeps Save expert disabled; changing any field enables it, saving locks the fields, and a successful write changes the disabled action to Saved until the next edit. Saving changed prompt text applies the resulting version to the current Session when it runs that expert; other open Sessions keep their installed prompts. Selecting a version opens the same highlighted side-by-side prompt comparison in read-only mode; name, icon, and welcome-message edits persist without creating a version entry.

Each finalized assistant message in an expert Session carries an Optimize expert prompt action. The action expands the right Sidebar immediately and reuses the normal conversation view to show the child Agent's context, compact Chinese task, reasoning, skill loads, and tools without a composer. The complete expert prompt and conversation evidence use the existing collapsed Context injection row instead of a user bubble. Reasoning uses the normal collapsed disclosure and live one-line preview. The final candidate uses the existing structured-output tool rather than printing JSON as assistant prose. A Stop prompt optimization button remains at the run header's far edge during startup and execution; it aborts the start or disposes the published child. A changed candidate renders the complete current and proposed prompts side by side with word-level highlighting and Chinese change reasons. The proposed prompt remains directly editable and recomputes its highlights before acceptance; a no-change candidate states why. Keep current prompt dismisses the candidate. Accept new version is the only action that writes it.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The settings section writes the Host's existing `agent-presets` namespace through `settings.update`. Its visibility switch sets only `modeSelectionEnabled`, and its make-default action writes `default` only while the picker is shown. After either write, the Host roster supplies the effective default, and the chip controller's `agentPresets/select` path carries it to the same still-blank session; expert selection uses that same guarded path. Display options and Host-effective visibility come from `agentPresets/list`, while expert management uses the typed expert endpoints and one shared browser store. The expert store keys optimization state by Session, so two open conversations cannot exchange candidates. During optimization, the store retains the observed child generation under `controllerOperation` without changing the selected main Session, and the renderer-injected `FixedSessionSlotView` binds the existing conversation slot to that retained reference; every exit from the running state releases it. The existing command menu owns expert search and selection; the right Sidebar owns management and review. [`dsh-client-connection`](../connection/README.md) authenticates all of these Host methods with the same browser session. The section re-reads on its own actions, `settings/document-updated`, and `connection/reset`, because ordinary composition files may still be edited outside the browser.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the preset surface is not enough. They move from the browser surfaces to the preset domain and the composition model.

- [dsh-agent-presets](../../preset/agent-presets/README.md) — the host roster and composition the surfaces read and manage.
- [ui-conversation](../ui-conversation/README.md) — declares the hero and session-header slots the chip and label fill.
- [ui-settings](../ui-settings/README.md) — the settings shell that hosts the roster section.
- [Client package map](../README.md) — adjacent browser UI packages.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the selected preset and the one-shot child Agent documented by [`dsh-agent-presets`](../../preset/agent-presets/README.md); progress and comparison rendering add no model-visible content of their own.

#### KV Cache effect

Changing picker visibility, defaults, unsaved editor fields, or an unaccepted candidate does not alter a running Session's prefix. Saving changed expert prompt text or accepting a refinement changes only the addressed Session's later requests through the Host workflow; an ordinary branch uses the current expert version. Each applied version starts reuse from its new prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define the current preset surfaces. They are current package constraints, not a general composition comparison or a task backlog.

- **A preset without metadata is listed by id** — display text is optional, and a copy given no name deliberately falls back to its directory name rather than presenting itself identically to its source. The resolution itself is the shared `presetDisplayText` fold from [`dsh-agent-presets/display`](../../preset/agent-presets/README.md), which the Settings plugin list inlines over this plugin’s dictionaries to show shipped presets in the active locale without translating user-authored metadata.
- **A revealed path is display text, not a link** — where the host has no desktop opener the row shows the directory to copy by hand; the browser cannot open a host filesystem location itself.
- **Composition edits are invisible to the page** — the files are edited outside the browser and nothing on the wire announces a file change, so the roster re-reads on its own actions, `settings/document-updated`, and `connection/reset`, not on every disk edit.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. This is a browser-side surface plugin whose node half owns no event stream or mutable runtime data; the roster and the settings write are host contracts covered there.
