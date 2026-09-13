# 桌面打包器

[English](desktop-packager.md) | 中文

Desktop 打包层的可选 Host 半边，由 [`@deepseek-ai/dsh-experimental-desktop-packager`](../../packages/experimental/desktop-packager/README.zh.md) 拥有。它通过 `subprocess` seam 把本检出自身的 `package:desktop:<target>:unsigned` 脚本作为一次由人发起的构建来运行，并报告这次构建正在做什么：生命周期阶段、流水线阶段、有界输出尾部、取消状态，以及它产出的安装包。同一时刻只运行一次构建；每一次拒绝——配置根目录下没有 `apps/desktop`、目标平台需要在另一台构建机上构建、已有构建在运行，或进程无法启动——都是指明需要修正哪个取值的业务结果，而不是 Remote 失败。

浏览器侧界面以及把两半组装起来的 patch 分别是 [`@deepseek-ai/dsh-experimental-client-ui-desktop-packager`](../../packages/experimental/client-ui-desktop-packager/README.zh.md) 与 [`@deepseek-ai/dsh-experimental-desktop-packager-web-profile`](../../packages/experimental/desktop-packager-web-profile/README.zh.md)。配置、Remote 方法表与线上类型见[包 README](../../packages/experimental/desktop-packager/README.zh.md)；本页是 `ctx.desktopPackager` 服务的子系统主页。

源码：[`packages/experimental/desktop-packager/src/types.ts`](../../packages/experimental/desktop-packager/src/types.ts)

## 一次只运行一次构建

`status`、`start`、`cancel` 与 `reveal` 构成全部 Remote 接口。`start` 解析配置的目标，检查该目标的构建宿主就是当前平台，并在配置的根目录下携带应用标识符与（配置时的）`ELECTRON_MIRROR` 启动打包脚本。每次 `status` 读取都会把自上次读取以来的输出增量排入保留尾部，并通过匹配流水线自身的输出标记推进一个单调阶段。`reveal` 通过平台自带的文件管理器显示已产出的安装包，或在尚未产出时显示该目标的产物目录。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.zh.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

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
