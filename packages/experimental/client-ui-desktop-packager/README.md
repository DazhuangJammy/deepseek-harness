---
description: "Desktop packager browser plugin: the Settings → Plugins Desktop tab and the /desktop command that run and observe one local unsigned packaging build."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-client-ui-desktop-packager

English | [中文](README.zh.md)

## Summary

`dsh-experimental-client-ui-desktop-packager` gives the Web client a **Desktop** tab in Settings → Plugins and a `/desktop` command. Both drive `@deepseek-ai/dsh-experimental-desktop-packager` through its generated Remote namespace: the tab shows the target, repository, mirror, phase, stage, retained build output, and the produced installer, and starts a build only after an acknowledged confirmation; the command offers the same actions with the same acknowledgement on its start option. The plugin mounts its own Remote contribution, so no shipped assembly names it.

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

Mount this package beside the Host runner; [`desktop-packager-web-profile`](../desktop-packager-web-profile/README.md) inserts both rows. The browser surfaces then need no further wiring.

### The Desktop tab

Open Settings → Plugins → **Desktop**. The tab reads the current status once on mount and then once a second while a build runs. **Build installer** opens the shared acknowledgement dialog, which keeps its primary action unavailable until the acknowledgement box is checked; **Cancel build** asks the running child process to terminate. **Open artifacts folder** is always available: it reveals the produced installer when one exists, and this target's artifact directory otherwise, so the folder can be opened before the first build. A finished build also shows its installer path with a copy action. Everything the tab renders comes from the Host: it performs no filesystem or process work of its own.

### The `/desktop` command

Type `/desktop` in the composer. The popup offers **Start a build** (carrying the same acknowledgement), **Show current status**, and **Cancel the running build**. The command is client-owned, so it appears in the slash menu without a Host descriptor and adds nothing to a session log.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The browser entry imports the Host package's generated `./remote` contribution and calls `ctx.remote.$mount()`, then injects `remote.desktopPackager`, `slots`, `locale`, and `commandUi` to register its surfaces. Both surfaces share one inject face, so a transport failure is reported identically wherever it appears. The tab registers into the Settings section's `settings.plugins.tab` slot; the command registers a `popupSelect` contribution whose start option carries a declarative `SelectConfirmation`, which the shared popup shell renders as the same risk gate the tab uses.

| File | Role |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Browser entry: mounts the Remote contribution and applies the surfaces |
| [`src/client/mount.ts`](src/client/mount.ts) | Remote mount lifecycle, dictionaries, tab, and command registration |
| [`src/client/DesktopPackagerTab.tsx`](src/client/DesktopPackagerTab.tsx) | Tab component, status polling, and confirmation gate |
| [`src/client/locales.ts`](src/client/locales.ts) | Chinese and English dictionaries |
| — | No runtime invariant companion is published because the package owns no independent runtime relationship; both surfaces are projections of one Remote namespace. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Host packaging runner](../desktop-packager/README.md) — the service behind every action here.
- [Opt-in Web layer](../desktop-packager-web-profile/README.md) — the patch that mounts both halves.
- [Plugins settings section](../../client/ui-settings-plugins/README.md) — the section that owns the tab chrome.
- [Experimental packages](../README.md) — incubation status and publication policy.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package only renders Host-reported packaging state and never constructs model input.

#### KV Cache effect

This package adds no model request content, so it changes no prompt prefix and no cache boundary.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Polling, not streaming** — the tab re-reads status once a second while a build runs; the command reads it on open.
- **Desktop tab only** — the surfaces live in Settings → Plugins; no conversation or sidebar entry is registered.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

[`tests/browser-plugin.client.spec.ts`](tests/browser-plugin.client.spec.ts) drives the mount, the slot and command registrations, the confirmation gate, and disposal through a fixture Client Runtime.

</details>
