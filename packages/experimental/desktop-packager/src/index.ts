/**
 * Desktop packaging runner: the Host half of the opt-in Desktop packager plugin.
 * One human-initiated build runs the repository's own unsigned packaging script
 * through the subprocess capability and exposes phase, stage, a retained output
 * tail, cancellation, and the produced installer to the browser.
 *
 * The run deliberately does not go through `ctx.shell`: that seam's sandbox
 * polices model-initiated commands, while this is a human-initiated host
 * operation, gated by a client-side acknowledgement, whose Electron and
 * package-manager caches live outside the workspace.
 *
 * @module @deepseek-ai/dsh-experimental-desktop-packager
 */

import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-subprocess'
import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import type {
  Config,
  DesktopPackagerRevealResult,
  DesktopPackagerPhase,
  DesktopPackagerRejection,
  DesktopPackagerStage,
  DesktopPackagerStartResult,
  DesktopPackagerStatus,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    desktopPackager: DesktopPackagerService
  }
}

/** Supported packaging targets and the repository script each one runs. */
const TARGET_SCRIPTS = {
  'mac-arm64': 'package:desktop:mac:arm64:unsigned',
  'win-x64': 'package:desktop:win:x64:unsigned',
} as const

/** One supported packaging target. */
type DesktopPackagerTarget = keyof typeof TARGET_SCRIPTS

/** Build host each target requires, so a mismatch fails before any work starts. */
const TARGET_HOSTS: Record<DesktopPackagerTarget, NodeJS.Platform> = {
  'mac-arm64': 'darwin',
  'win-x64': 'win32',
}

/** Installer extension each target produces. */
const TARGET_EXTENSIONS: Record<DesktopPackagerTarget, string> = {
  'mac-arm64': 'dmg',
  'win-x64': 'exe',
}

/** Pipeline stages in execution order, used to keep stage reporting monotonic. */
const STAGE_ORDER: readonly DesktopPackagerStage[] = [
  'idle', 'build', 'packages', 'runtime', 'dependencies', 'installer', 'finished',
]

/** Output markers that name the stage the packaging pipeline has reached. */
const STAGE_MARKERS: readonly (readonly [DesktopPackagerStage, RegExp])[] = [
  ['build', /build:official|scripts\/build\.ts/u],
  ['packages', /release pack: family/u],
  ['runtime', /prepare-runtime|prepare-package-set|prepare:runtime|prepare:packages/u],
  ['dependencies', /prepare[-:]dsh/u],
  ['installer', /electron-builder|packaging\s+platform=/u],
]

/**
 * Platform command that reveals one produced path in the desktop file manager.
 * Absent platforms cannot reveal, and the caller reports that instead of guessing.
 */
const REVEAL_COMMANDS: Partial<Record<NodeJS.Platform, (path: string) => readonly string[]>> = {
  darwin: path => ['open', '-R', path],
  /* v8 ignore next -- the Windows arm serves the win-x64 target; the macOS coverage lane runs the darwin arm only. */
  win32: path => ['explorer.exe', `/select,${path}`],
}

const REVEAL_GRACE_MS = 10_000
const DEFAULT_TARGET: DesktopPackagerTarget = 'mac-arm64'
const DEFAULT_APP_ID = 'com.deepseek.harness.desktop'
const DEFAULT_LOG_TAIL_CHARS = 32_768
const TERMINATION_GRACE_MS = 5_000

/** One retained child stream, tracked from the last consumed offset. */
interface StreamCursor {
  /** Whole-stream byte offset to resume from. */
  offset: number
}

/**
 * Whether one configured target name is a supported packaging target.
 * @param value - configured target name.
 * @returns true when the target has a packaging script and host requirement.
 */
function isTarget(value: string): value is DesktopPackagerTarget {
  return Object.hasOwn(TARGET_SCRIPTS, value)
}

/**
 * Resolve one thrown value into a message suitable for the browser.
 * @param error - thrown value.
 * @returns the message, or the value's string form.
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Build the package-manager invocation that runs a repository script.
 * @returns argv prefix that runs pnpm through the current Node when the Host was started by pnpm.
 */
function pnpmInvocation(): readonly string[] {
  const execPath = process.env['npm_execpath']
  return execPath === undefined || execPath === '' ? ['pnpm'] : [process.execPath, execPath]
}

/**
 * Read one repository manifest version.
 * @param path - absolute manifest path.
 * @returns the declared version.
 * @throws when the manifest is missing or declares no version.
 */
function manifestVersion(path: string): string {
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as { version?: unknown }
  if (typeof manifest.version !== 'string' || manifest.version === '') {
    throw new Error(`desktop packager: ${path} declares no version`)
  }
  return manifest.version
}

/** Desktop packaging runner over one repository checkout. */
export class DesktopPackagerService extends TypertRemoteService {
  static inject = ['subprocess']

  static Config: z<Config> = z.object({
    repositoryRoot: z.string(),
    appId: z.string().default(DEFAULT_APP_ID),
    electronMirror: z.string(),
    target: z.string().default(DEFAULT_TARGET),
    logTailChars: z.number().step(1).min(1_024).default(DEFAULT_LOG_TAIL_CHARS),
  })

  private readonly configured: Config

  private phase: DesktopPackagerPhase = 'idle'
  private stage: DesktopPackagerStage = 'idle'
  private handle: SubprocessHandle | undefined
  private readonly cursors = new Map<'stdout' | 'stderr', StreamCursor>()
  private log = ''
  private startedAt: number | undefined
  private finishedAt: number | undefined
  private artifact: { path: string; bytes: number } | undefined
  private failure: string | undefined
  private cancelling = false

  /**
   * Register the Desktop packaging service.
   * @param ctx - Host context carrying the subprocess capability.
   * @param config - resolved deployment inputs.
   */
  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'desktopPackager')
    this.configured = config
  }

  /**
   * Status of the running or last build, with its output tail drained up to now.
   * @returns the current phase, stage, retained tail, and any installer or failure.
   */
  @Remote('status')
  status(): DesktopPackagerStatus {
    this.drain()
    return this.snapshot()
  }

  /**
   * Start one packaging build, or refuse with the configuration to correct.
   * @returns the accepted build's status, or the refusal class and its reason.
   */
  @Remote('start')
  start(): DesktopPackagerStartResult {
    if (this.phase === 'running') {
      return { ok: false, error: { code: 'busy', message: 'a Desktop build is already running' } }
    }
    const target = this.targetName()
    if (!isTarget(target)) {
      return {
        ok: false,
        error: {
          code: 'unsupported-target',
          message: `unsupported target ${JSON.stringify(target)}; expected ${Object.keys(TARGET_SCRIPTS).join(' or ')}`,
        },
      }
    }
    if (process.platform !== TARGET_HOSTS[target]) {
      return {
        ok: false,
        error: {
          code: 'unsupported-target',
          message: `${target} requires a ${TARGET_HOSTS[target]} build host`,
        },
      }
    }
    const repositoryRoot = this.repositoryRoot()
    if (!existsSync(join(repositoryRoot, 'apps', 'desktop', 'package.json'))) {
      return {
        ok: false,
        error: {
          code: 'repository-missing',
          message: `${repositoryRoot} holds no apps/desktop package; set repositoryRoot to the DeepSeek Harness checkout`,
        },
      }
    }
    this.reset()
    try {
      const handle = this.ctx.subprocess.spawn(this.spawnSpec(repositoryRoot, target))
      this.handle = handle
      this.phase = 'running'
      this.startedAt = Date.now()
      void handle.done.then(
        (outcome) => { this.settle(target, outcome.exitCode) },
        (error: unknown) => { this.fail(`the packaging process could not be observed: ${messageOf(error)}`) },
      )
    } catch (error) {
      this.phase = 'failed'
      this.failure = messageOf(error)
      this.finishedAt = Date.now()
      return { ok: false, error: { code: 'spawn-failed', message: messageOf(error) } }
    }
    return { ok: true, status: this.snapshot() }
  }

  /**
   * Terminate the running build; the phase becomes `cancelled` once it settles.
   * @returns the status after the termination request, unchanged when no build runs.
   */
  @Remote('cancel')
  cancel(): DesktopPackagerStatus {
    if (this.handle !== undefined) {
      this.cancelling = true
      this.handle.terminate()
    }
    return this.status()
  }

  /**
   * Reveal the last produced installer, or this target's artifact directory, in
   * this machine's file manager.
   * @returns success, or the reason nothing could be revealed.
   */
  @Remote('reveal')
  async reveal(): Promise<DesktopPackagerRevealResult> {
    const target = this.targetName()
    if (!isTarget(target)) {
      return {
        ok: false,
        error: `unsupported target ${JSON.stringify(target)}; expected ${Object.keys(TARGET_SCRIPTS).join(' or ')}`,
      }
    }
    const repositoryRoot = this.repositoryRoot()
    if (!existsSync(join(repositoryRoot, 'apps', 'desktop', 'package.json'))) {
      return {
        ok: false,
        error: `${repositoryRoot} holds no apps/desktop package; set repositoryRoot to the DeepSeek Harness checkout`,
      }
    }
    const directory = this.artifactDirectory(target)
    // The directory is the next build's destination, so it is created when a
    // build has not run yet and revealing an empty folder is still useful.
    if (this.artifact === undefined) mkdirSync(directory, { recursive: true })
    const path = this.artifact?.path ?? directory
    const command = REVEAL_COMMANDS[process.platform]
    /* v8 ignore next 3 -- only darwin and win-x64 can produce an installer, and both appear in the table. */
    if (command === undefined) {
      return { ok: false, error: `revealing an installer is unsupported on ${process.platform}` }
    }
    try {
      const handle = this.ctx.subprocess.spawn({
        argv: [...command(path)],
        cwd: dirname(path),
        stdio: { stdin: 'ignore', stdout: { maxBytes: 4_096 }, stderr: { maxBytes: 4_096 } },
        graceMs: REVEAL_GRACE_MS,
      })
      const outcome = await handle.done
      if (outcome.exitCode === 0) return { ok: true }
      const detail = handle.collected.stderr?.readFrom(0).text.trim()
      return {
        ok: false,
        error: detail === undefined || detail === ''
          ? `the file manager opener exited with ${outcome.exitCode === null ? 'a signal' : String(outcome.exitCode)}`
          : detail,
      }
    } catch (error) {
      return { ok: false, error: messageOf(error) }
    }
  }

  /** Configured packaging target name. */
  private targetName(): string {
    return this.configured.target ?? DEFAULT_TARGET
  }

  /** Repository root this deployment packages. */
  private repositoryRoot(): string {
    return this.configured.repositoryRoot ?? process.cwd()
  }

  /** Configured Electron mirror, if any. */
  private electronMirror(): string | undefined {
    const mirror = this.configured.electronMirror ?? process.env['ELECTRON_MIRROR']
    return mirror === undefined || mirror === '' ? undefined : mirror
  }

  /** Command line shown to the browser for the configured target. */
  private commandLine(): string {
    const target = this.targetName()
    const script = isTarget(target) ? TARGET_SCRIPTS[target] : target
    return `pnpm run ${script}`
  }

  /** Clear the previous build's observations before starting a new one. */
  private reset(): void {
    this.phase = 'idle'
    this.stage = 'idle'
    this.log = ''
    this.cursors.clear()
    this.startedAt = undefined
    this.finishedAt = undefined
    this.artifact = undefined
    this.failure = undefined
    this.cancelling = false
  }

  /** Fully specified spawn request for one target. */
  private spawnSpec(repositoryRoot: string, target: DesktopPackagerTarget): SubprocessSpawnSpec {
    const mirror = this.electronMirror()
    const collect = { maxBytes: this.logTailChars() * 4 }
    return {
      argv: [...pnpmInvocation(), 'run', TARGET_SCRIPTS[target]],
      cwd: repositoryRoot,
      stdio: { stdin: 'ignore', stdout: collect, stderr: collect },
      graceMs: TERMINATION_GRACE_MS,
      env: {
        DSH_DESKTOP_APP_ID: this.configured.appId ?? DEFAULT_APP_ID,
        ...mirror === undefined ? {} : { ELECTRON_MIRROR: mirror },
      },
    }
  }

  /** Configured retained-tail character budget. */
  private logTailChars(): number {
    return this.configured.logTailChars ?? DEFAULT_LOG_TAIL_CHARS
  }

  /** Consume both collected streams into the retained tail. */
  private drain(): void {
    const handle = this.handle
    if (handle === undefined) return
    for (const name of ['stdout', 'stderr'] as const) {
      const reader = handle.collected[name]
      if (reader === undefined) continue
      const cursor = this.cursors.get(name) ?? { offset: 0 }
      const read = reader.readFrom(cursor.offset)
      this.cursors.set(name, { offset: read.nextOffset })
      // A lossy read returns the whole retained tail, so it replaces the log.
      if (read.lossy) this.log = ''
      this.append(read.text)
    }
  }

  /** Append output to the bounded tail and advance the reported stage. */
  private append(text: string): void {
    if (text.length === 0) return
    this.log += text
    const excess = this.log.length - this.logTailChars()
    if (excess > 0) this.log = this.log.slice(excess)
    for (const [stage, marker] of STAGE_MARKERS) {
      if (marker.test(text) && STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(this.stage)) this.stage = stage
    }
  }

  /**
   * Classify one closed build and resolve its installer.
   * @param target - target the closed build ran, captured when it started.
   * @param exitCode - exit status the child reported, null when a signal ended it.
   */
  private settle(target: DesktopPackagerTarget, exitCode: number | null): void {
    this.drain()
    this.handle = undefined
    this.finishedAt = Date.now()
    if (this.cancelling) {
      this.phase = 'cancelled'
      this.cancelling = false
      return
    }
    if (exitCode !== 0) {
      this.phase = 'failed'
      this.failure = `the packaging command exited with ${exitCode === null ? 'a signal' : String(exitCode)}`
      return
    }
    const artifact = this.resolveArtifact(target)
    if (artifact === undefined) {
      this.phase = 'failed'
      this.failure = 'the packaging command completed without producing an installer'
      return
    }
    this.artifact = artifact
    this.phase = 'succeeded'
    this.stage = 'finished'
  }

  /** Record a build that could never be observed to completion. */
  private fail(message: string): void {
    this.handle = undefined
    this.finishedAt = Date.now()
    this.phase = 'failed'
    this.failure = message
  }

  /**
   * Directory one target's packaging command writes its artifacts to.
   * @param target - supported packaging target.
   * @returns the absolute artifact directory.
   */
  private artifactDirectory(target: DesktopPackagerTarget): string {
    return join(
      this.repositoryRoot(), 'apps', 'desktop', '.desktop-build', 'targets', target, 'unsigned-artifacts',
    )
  }

  /**
   * Locate the installer one target's successful build must have produced.
   * @param target - target the settled build ran.
   * @returns the installer's path and size, or undefined when the build left none.
   */
  private resolveArtifact(target: DesktopPackagerTarget): { path: string; bytes: number } | undefined {
    let version: string
    try {
      version = manifestVersion(join(this.repositoryRoot(), 'package.json'))
    } catch {
      // A missing or version-less root manifest means no artifact can be named.
      return undefined
    }
    const path = join(
      this.artifactDirectory(target),
      `deepseek-harness-${version}-${target}.${TARGET_EXTENSIONS[target]}`,
    )
    if (!existsSync(path)) return undefined
    return { path, bytes: statSync(path).size }
  }

  /** Build the wire status from current observations. */
  private snapshot(): DesktopPackagerStatus {
    const mirror = this.electronMirror()
    const artifact = this.artifact
    return {
      phase: this.phase,
      stage: this.stage,
      target: this.targetName(),
      repositoryRoot: this.repositoryRoot(),
      command: this.commandLine(),
      log: this.log,
      ...mirror === undefined ? {} : { electronMirror: mirror },
      ...this.startedAt === undefined ? {} : { startedAt: this.startedAt },
      ...this.finishedAt === undefined ? {} : { finishedAt: this.finishedAt },
      ...artifact === undefined ? {} : { artifactPath: artifact.path, artifactBytes: artifact.bytes },
      ...this.failure === undefined ? {} : { error: this.failure },
    }
  }
}

export default DesktopPackagerService

/** Refusal codes this service can return, for consumers narrowing a rejection. */
export type DesktopPackagerRejectionCode = DesktopPackagerRejection['code']
