/**
 * Wire-visible Desktop packaging facts: the deployment-selected inputs and one
 * build's observable state. Types only.
 */

/** Packager lifecycle phase reported to the browser. */
export type DesktopPackagerPhase = 'idle' | 'running' | 'succeeded' | 'failed' | 'cancelled'

/**
 * Coarse pipeline stage named by the packaging command's own output, in
 * execution order. `finished` is the settled stage of a successful build.
 */
export type DesktopPackagerStage =
  | 'idle'
  | 'build'
  | 'packages'
  | 'runtime'
  | 'dependencies'
  | 'installer'
  | 'finished'

/** One build's observable state, read by the Settings tab and the `/desktop` command. */
export interface DesktopPackagerStatus {
  /** Lifecycle phase; `running` covers every stage between start and settlement. */
  readonly phase: DesktopPackagerPhase
  /** Current pipeline stage, or the last one reached by a settled build. */
  readonly stage: DesktopPackagerStage
  /** Fixed packaging target this deployment runs. */
  readonly target: string
  /** Repository root whose packaging script runs. */
  readonly repositoryRoot: string
  /** Exact command line this plugin runs, for display. */
  readonly command: string
  /** Electron mirror forwarded to the packaging pipeline, when one is configured. */
  readonly electronMirror?: string
  /** Start time of the running or last build, in epoch milliseconds. */
  readonly startedAt?: number
  /** Settlement time of the last build, in epoch milliseconds. */
  readonly finishedAt?: number
  /** Retained output tail; bounded by the configured character budget. */
  readonly log: string
  /** Installer produced by a successful build. */
  readonly artifactPath?: string
  /** Installer size in bytes, when the file exists. */
  readonly artifactBytes?: number
  /** Failure summary of the last build. */
  readonly error?: string
}

/** Result of one reveal request for a produced installer. */
export type DesktopPackagerRevealResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string }

/** Why one start request was refused. */
export interface DesktopPackagerRejection {
  /** Refusal class the browser can branch on. */
  readonly code: 'busy' | 'unsupported-target' | 'repository-missing' | 'spawn-failed'
  /** Human-readable reason, including the configuration value to correct. */
  readonly message: string
}

/** Result of one start request: the accepted build's status, or a refusal. */
export type DesktopPackagerStartResult =
  | { readonly ok: true; readonly status: DesktopPackagerStatus }
  | { readonly ok: false; readonly error: DesktopPackagerRejection }

/** Deployment-selected packaging inputs. */
export interface Config {
  /**
   * Repository root holding `apps/desktop`, whose packaging script runs.
   * Defaults to the Host process's working directory.
   */
  readonly repositoryRoot?: string
  /** Reverse-DNS application identifier passed to the packaging pipeline. @default 'com.deepseek.harness.desktop' */
  readonly appId?: string
  /**
   * Electron mirror forwarded as `ELECTRON_MIRROR` to the packaging pipeline.
   * Required where the default Electron download host is unreachable.
   */
  readonly electronMirror?: string
  /** Fixed packaging target. @default 'mac-arm64' */
  readonly target?: string
  /** Retained output-tail characters reported to the browser. @default 32768 */
  readonly logTailChars?: number
}
