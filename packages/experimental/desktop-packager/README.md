---
description: "Host-side Desktop packaging runner for the opt-in Desktop packager plugin: one human-initiated unsigned build of the repository's own packaging script, with observable phase, stage, output tail, and installer."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-desktop-packager

English | [中文](README.zh.md)

## Summary

`dsh-experimental-desktop-packager` runs this checkout's own unsigned Desktop packaging script as one host-owned build and exposes what it is doing: lifecycle phase, pipeline stage, a bounded output tail, cancellation, and the installer it produced. It refuses to start when the configured root holds no `apps/desktop` package, when the target needs another build host, when a build already runs, or when the process cannot be spawned, and it names the value to correct in each case. The browser half is [`@deepseek-ai/dsh-experimental-client-ui-desktop-packager`](../client-ui-desktop-packager/README.md).

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

Mount the package as a Loader row beside its browser half; [`desktop-packager-web-profile`](../desktop-packager-web-profile/README.md) is the opt-in layer that inserts both. The row accepts these configuration fields:

| Field | Default | Meaning |
|---|---|---|
| `repositoryRoot` | the Host process's working directory | Checkout holding `apps/desktop`, whose packaging script runs |
| `appId` | `com.deepseek.harness.desktop` | Reverse-DNS application identifier passed as `DSH_DESKTOP_APP_ID` |
| `electronMirror` | `ELECTRON_MIRROR` from the Host environment | Electron mirror forwarded to the packaging pipeline |
| `target` | `mac-arm64` | Fixed packaging target: `mac-arm64` or `win-x64` |
| `logTailChars` | `32768` | Retained output-tail characters reported to the browser |

### The generated Remote surface

| Method | Returns |
|---|---|
| `desktopPackager/status` | The current phase, stage, retained tail, and any installer or failure |
| `desktopPackager/start` | The accepted build's status, or a refusal carrying a code and the configuration to correct |
| `desktopPackager/cancel` | The status after asking the running build to terminate |
| `desktopPackager/reveal` | Success, or the reason nothing could be shown in this machine's file manager |

A successful build resolves its installer from `apps/desktop/.desktop-build/targets/<target>/unsigned-artifacts/` using the root manifest's version, and reports its byte size. `reveal` opens the produced installer, or this target's `unsigned-artifacts` directory when no build has produced one (creating that directory when it is absent), through the platform's own file manager — `open -R` on macOS and `explorer /select,` on Windows — and reports the opener's diagnostic when it exits non-zero.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The service owns one build at a time. `start` resolves the configured target, checks that the target's build host is the current platform, and spawns `pnpm run package:desktop:<target>:unsigned` in the configured root through the `subprocess` capability with the application identifier and, when configured, `ELECTRON_MIRROR`. Both output streams are collected boundedly; each `status` read drains the delta since the previous read into the retained tail and advances a monotonic stage by matching the pipeline's own output markers. Settlement classifies the exit status, replaces a cancelled build's phase, or resolves the installer.

The run deliberately does not use `ctx.shell`. That seam's sandbox polices model-initiated commands, while this is a human-initiated host operation, gated by a client-side acknowledgement, whose Electron and package-manager caches live outside the workspace.

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Packaging service, spawn request, stage detection, settlement, and artifact resolution |
| [`src/types.ts`](src/types.ts) | Wire-visible configuration and status types |
| — | No runtime invariant companion is published because the package owns no independent runtime relationship; its observations derive from one child process it alone starts and stops. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Desktop packager browser UI](../client-ui-desktop-packager/README.md) — the Settings tab and `/desktop` command over this service.
- [Opt-in Web layer](../desktop-packager-web-profile/README.md) — the profile patch that mounts both halves.
- [Experimental packages](../README.md) — incubation status and publication policy.
- [Desktop application](../../../apps/desktop/README.md) — the packaging pipeline this service runs.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package only starts and observes a local packaging child process and returns none of its own text to a model.

#### KV Cache effect

This package adds no model request content, so it changes no prompt prefix and no cache boundary.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **One build at a time** — a second `start` is refused while a build runs; parallel targets are deferred.
- **The build rewrites the checkout it runs from** — the pipeline rebuilds repository outputs and writes several gigabytes under `apps/desktop/.desktop-build`, so a Host serving that checkout can see transient asset changes while it runs.
- **Network access is required** — the first build downloads the Node runtime and Electron; where the default Electron host is unreachable, `electronMirror` must be set.
- **No progress stream** — the browser reads status by polling; a streamed Remote method is deferred until a consumer needs sub-second progress.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The service is exercised against a fake `subprocess` handle in [`tests/desktop-packager.spec.ts`](tests/desktop-packager.spec.ts), which covers refusals, stage detection, settlement, cancellation, tail bounding, and artifact resolution without running a real build.

</details>
