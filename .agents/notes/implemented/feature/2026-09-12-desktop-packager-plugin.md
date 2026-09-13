# Agent Note: Opt-in Desktop packager plugin

Status: implemented

English | [中文](2026-09-12-desktop-packager-plugin.zh.md)

## Problem

Producing an installable Desktop build required knowing the packaging command, the environment it needs, and where its artifacts land. The repository ships that pipeline, but nothing in the product could start it: a developer ran a shell command from a source checkout, and the Web client offered no surface for it.

## Decision

An experimental trio carries the capability as an opt-in Web layer: [`desktop-packager`](../../../../packages/experimental/desktop-packager/README.md) owns the Host-side build, [`client-ui-desktop-packager`](../../../../packages/experimental/client-ui-desktop-packager/README.md) owns the browser surfaces, and [`desktop-packager-web-profile`](../../../../packages/experimental/desktop-packager-web-profile/README.md) is the patch that inserts both rows. The layer is installed by path, never shipped in a default profile, and its packages stay private.

The Host service runs the checkout's own `package:desktop:<target>:unsigned` script through the `subprocess` capability as one human-initiated build. One run exists at a time; `status`, `start`, and `cancel` are the whole Remote surface, and the status carries configuration, phase, a monotonic stage derived from the pipeline's own output markers, a bounded output tail, cancellation state, and the installer a successful build resolved. Refusals are business results naming the value to correct, not Remote failures: no `apps/desktop` under the configured root, a target that needs another build host, an already-running build, or an unspawnable process.

The Host also reveals a produced installer, or the target's artifact directory before one exists, through the platform's own file manager (`open -R`, `explorer /select,`) instead of returning a path to copy, because the Desktop composition disables the repository's open-in-app capability and its routes, and the reveal belongs to the operation that produced the file.

The browser half imports the generated `/remote` contribution and mounts it with `ctx.remote.$mount()`, so no shipped assembly names the plugin. It registers one `settings.plugins.tab` contribution and one client-owned `commandUi` contribution named `desktop`. Both drive the same inject face. Starting a build is gated on an acknowledgement the user must check: the tab renders the shared `RiskConfirmation`, and the command's start option carries the equivalent declarative `SelectConfirmation`.

## Consequences

- A checkout gets the feature by installing three `link:` rows and restarting the Host; the shipped Web composition is unchanged, and removing the layer removes both rows.
- The build rewrites the checkout it runs from, needs network access for the Node runtime and Electron on first use, and writes several gigabytes under `apps/desktop/.desktop-build`.
- Status is polled rather than streamed, so a browser sees stage changes at the poll interval.
- The product cannot package a checkout it does not have, which is why the layer stays out of shipped defaults rather than degrading gracefully for npm-installed users.
- Unsigned artifacts are for local use: the packaging pipeline omits signing, notarization, and the release completion record, so the upload command still refuses them.

## Alternatives considered

**A row inside `dsh-web-app` with its Remote mounted by `api-remotes`.** That is the shipped-feature shape, and it would put an Electron-packaging button in front of every Web user, including installations with no source tree, while making the plugin a permanent dependency of the API assembly. Opt-ins stay out of shipped defaults.

**`ctx.jobs` for the build.** The Web profile attaches no global job controller, so an unowned job cannot start; the Jobs surface is a read-only status mirror with neither streamed output nor human cancellation, so the progress and cancel affordances would still need their own channel.

**`ctx.approval.request()` for the confirmation.** It requires an Agent and an open turn and its request is tool-shaped, so a click on an idle session cannot use it. The shipped pattern for a Web control that mutates Host state is a client-side risk gate, which is what the tab and the command use.

**Routing the build through `ctx.shell`.** That seam's sandbox polices model-initiated commands and confines writes to the workspace, while the packaging pipeline writes Electron and package-manager caches outside it. A plugin cannot grant itself the escalation, so the honest choice was the unconfined seam the desktop shell's own package operations use.

**Streaming progress through a streamed Remote method.** Supported by the gateway, but it needs its own reconnect semantics and a consumer that benefits; polling one unary method keeps the first version smaller.
