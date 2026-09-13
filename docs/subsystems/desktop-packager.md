# Desktop Packager

English | [中文](desktop-packager.zh.md)

The opt-in Host half of the Desktop packaging layer, owned by [`@deepseek-ai/dsh-experimental-desktop-packager`](../../packages/experimental/desktop-packager/README.md). It runs this checkout's own `package:desktop:<target>:unsigned` script through the `subprocess` seam as one human-initiated build, and reports what that build is doing: lifecycle phase, pipeline stage, a bounded output tail, cancellation, and the installer it produced. One build runs at a time, and every refusal — no `apps/desktop` under the configured root, a target that needs another build host, an already-running build, or an unspawnable process — is a business result naming the value to correct rather than a Remote failure.

The browser surfaces and the patch that composes both halves are [`@deepseek-ai/dsh-experimental-client-ui-desktop-packager`](../../packages/experimental/client-ui-desktop-packager/README.md) and [`@deepseek-ai/dsh-experimental-desktop-packager-web-profile`](../../packages/experimental/desktop-packager-web-profile/README.md). Configuration, the Remote method table, and the wire types live on the [package README](../../packages/experimental/desktop-packager/README.md); this page is the subsystem home for the `ctx.desktopPackager` service.

Source: [`packages/experimental/desktop-packager/src/types.ts`](../../packages/experimental/desktop-packager/src/types.ts)

## One build at a time

`status`, `start`, `cancel`, and `reveal` are the whole Remote surface. `start` resolves the configured target, checks that the target's build host is the current platform, and spawns the packaging script in the configured root with the application identifier and, when one is configured, `ELECTRON_MIRROR`. Each `status` read drains the output delta since the previous read into the retained tail and advances a monotonic stage by matching the pipeline's own output markers. `reveal` shows the produced installer, or the target's artifact directory before one exists, through the platform's own file manager.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxdesktoppackager--desktoppackagerservice"></a>

### `ctx.desktopPackager` — `DesktopPackagerService`

Desktop packaging runner over one repository checkout.

```ts cordis-catalog
/**
 * Status of the running or last build, with its output tail drained up to now.
 * @returns the current phase, stage, retained tail, and any installer or failure.
 */
@Remote('status') status(): DesktopPackagerStatus

/**
 * Start one packaging build, or refuse with the configuration to correct.
 * @returns the accepted build's status, or the refusal class and its reason.
 */
@Remote('start') start(): DesktopPackagerStartResult

/**
 * Terminate the running build; the phase becomes `cancelled` once it settles.
 * @returns the status after the termination request, unchanged when no build runs.
 */
@Remote('cancel') cancel(): DesktopPackagerStatus

/**
 * Reveal the last produced installer, or this target's artifact directory, in
 * this machine's file manager.
 * @returns success, or the reason nothing could be revealed.
 */
@Remote('reveal') async reveal(): Promise<DesktopPackagerRevealResult>
```

Source: [`packages/experimental/desktop-packager/src/index.ts`](../../packages/experimental/desktop-packager/src/index.ts)
<!-- END GENERATED cordis-surface -->
