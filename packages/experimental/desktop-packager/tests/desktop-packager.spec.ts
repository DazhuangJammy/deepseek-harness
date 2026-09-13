import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { DesktopPackagerService } from '../src/index.ts'
import type { Config } from '../src/types.ts'
import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'

/** One fake collected stream whose reads are offset-based like the real reader. */
interface FakeStream {
  text: string
  lossy: boolean
}

/** Controllable subprocess handle used in place of a real child process. */
interface FakeChild {
  readonly handle: SubprocessHandle
  emit(text: string): void
  emitToStderr(text: string): void
  markLossy(): void
  finish(exitCode: number | null): Promise<void>
  terminated(): boolean
}

/** Build one fake handle; `spawn` records the spec it received. */
function fakeSubprocess(children: FakeChild[], failWith?: Error): (spec: SubprocessSpawnSpec) => SubprocessHandle {
  return (_spec) => {
    if (failWith !== undefined) throw failWith
    const stdout: FakeStream = { text: '', lossy: false }
    const stderr: FakeStream = { text: '', lossy: false }
    let settle: (outcome: { exitCode: number | null; signal: NodeJS.Signals | null }) => void = () => {}
    const done = new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolve) => { settle = resolve })
    let killed = false
    const reader = (stream: () => FakeStream) => ({
      readFrom(fromByte: number) {
        const streamed = stream()
        const lossy = streamed.lossy
        const text = lossy ? streamed.text : streamed.text.slice(fromByte)
        streamed.lossy = false
        return { text, nextOffset: streamed.text.length, lossy }
      },
    })
    const child: FakeChild = {
      handle: {
        stdin: undefined,
        stdout: undefined,
        stderr: undefined,
        collected: { stdout: reader(() => stdout), stderr: reader(() => stderr) },
        done,
        terminate: () => { killed = true },
        waitForExit: async () => true,
      },
      emit(text) { stdout.text += text },
      emitToStderr(text) { stderr.text += text },
      markLossy() { stdout.lossy = true },
      async finish(exitCode) {
        settle({ exitCode, signal: exitCode === null ? 'SIGTERM' : null })
        await done
        await Promise.resolve()
      },
      terminated: () => killed,
    }
    children.push(child)
    return child.handle
  }
}

const roots: string[] = []

/** Create one fake checkout whose Desktop app and installer exist. */
function fakeCheckout(options: { version?: string; artifact?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'desktop-packager-'))
  roots.push(root)
  mkdirSync(join(root, 'apps', 'desktop'), { recursive: true })
  writeFileSync(join(root, 'apps', 'desktop', 'package.json'), '{"name":"@deepseek-ai/dsh-desktop"}')
  writeFileSync(join(root, 'package.json'), `{"version":"${options.version ?? '1.2.3'}"}`)
  if (options.artifact !== false) {
    const artifact = join(
      root, 'apps', 'desktop', '.desktop-build', 'targets', 'mac-arm64', 'unsigned-artifacts',
      `deepseek-harness-${options.version ?? '1.2.3'}-mac-arm64.dmg`,
    )
    mkdirSync(join(artifact, '..'), { recursive: true })
    writeFileSync(artifact, 'installer-bytes')
  }
  return root
}

/** Reject with one caller-supplied value, including a non-Error the service must still report. */
function rejectWith<T>(value: unknown): Promise<T> {
  // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- proves the service reports a non-Error rejection reason.
  return Promise.reject(value)
}

/** Build one service over a fake subprocess capability. */
function service(config: Config, children: FakeChild[] = [], failWith?: Error): DesktopPackagerService {
  const ctx = new Context()
  ctx.provide('subprocess', { spawn: fakeSubprocess(children, failWith) })
  return new DesktopPackagerService(ctx, config)
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('desktop packager service', () => {
  it('reports configured inputs before the first build', () => {
    const root = fakeCheckout()
    const status = service({ repositoryRoot: root, electronMirror: 'https://mirror.example/electron/' }).status()
    expect(status).toMatchObject({
      phase: 'idle',
      stage: 'idle',
      target: 'mac-arm64',
      repositoryRoot: root,
      command: 'pnpm run package:desktop:mac:arm64:unsigned',
      electronMirror: 'https://mirror.example/electron/',
      log: '',
    })
    expect(status.artifactPath).toBeUndefined()
  })

  it('refuses a checkout without the Desktop app', () => {
    const empty = mkdtempSync(join(tmpdir(), 'desktop-packager-empty-'))
    roots.push(empty)
    expect(service({ repositoryRoot: empty }).start()).toEqual({
      ok: false,
      error: {
        code: 'repository-missing',
        message: `${empty} holds no apps/desktop package; set repositoryRoot to the DeepSeek Harness checkout`,
      },
    })
  })

  it('refuses an unsupported target name', () => {
    const root = fakeCheckout()
    expect(service({ repositoryRoot: root, target: 'linux-x64' }).start()).toMatchObject({
      ok: false,
      error: { code: 'unsupported-target' },
    })
  })

  it('refuses a target belonging to another build host', () => {
    const root = fakeCheckout()
    const foreign = process.platform === 'darwin' ? 'win-x64' : 'mac-arm64'
    const result = service({ repositoryRoot: root, target: foreign }).start()
    expect(result).toMatchObject({ ok: false, error: { code: 'unsupported-target' } })
    expect(result.ok ? '' : result.error.message).toMatch(/requires a/u)
  })

  it('refuses a second build while one runs', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    expect(packager.start().ok).toBe(true)
    expect(packager.start()).toEqual({
      ok: false,
      error: { code: 'busy', message: 'a Desktop build is already running' },
    })
    await children[0]!.finish(1)
  })

  it('runs the configured script and reports the installer a successful build produced', async () => {
    const root = fakeCheckout({ version: '9.9.9' })
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root, appId: 'com.example.app', electronMirror: 'https://m/' }, children)
    expect(packager.start()).toMatchObject({ ok: true, status: { phase: 'running' } })

    children[0]!.emit('> tsx scripts/build.ts --profile official\n')
    expect(packager.status().stage).toBe('build')
    children[0]!.emit('release pack: family dsh, 200 tarball(s)\n')
    expect(packager.status().stage).toBe('packages')
    children[0]!.emit('$ tsx scripts/prepare-runtime.ts\n')
    expect(packager.status().stage).toBe('runtime')
    children[0]!.emit('$ tsx scripts/prepare-dsh.ts\n')
    expect(packager.status().stage).toBe('dependencies')
    children[0]!.emit('  • packaging       platform=darwin arch=arm64\n')
    expect(packager.status().stage).toBe('installer')

    await children[0]!.finish(0)
    const settled = packager.status()
    expect(settled.phase).toBe('succeeded')
    expect(settled.stage).toBe('finished')
    expect(settled.artifactPath).toBe(join(
      root, 'apps', 'desktop', '.desktop-build', 'targets', 'mac-arm64', 'unsigned-artifacts',
      'deepseek-harness-9.9.9-mac-arm64.dmg',
    ))
    expect(settled.artifactBytes).toBe('installer-bytes'.length)
    expect(settled.log).toContain('prepare-dsh')
  })

  it('spawns the configured command with the application identifier and mirror', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const ctx = new Context()
    const specs: SubprocessSpawnSpec[] = []
    ctx.provide('subprocess', {
      spawn: (spec: SubprocessSpawnSpec) => {
        specs.push(spec)
        return fakeSubprocess(children)(spec)
      },
    })
    const packager = new DesktopPackagerService(ctx, {
      repositoryRoot: root, appId: 'com.example.app', electronMirror: 'https://mirror/',
    })
    packager.start()
    expect(specs[0]?.argv.slice(-2)).toEqual(['run', 'package:desktop:mac:arm64:unsigned'])
    expect(specs[0]).toMatchObject({
      cwd: root,
      graceMs: 5_000,
      env: { DSH_DESKTOP_APP_ID: 'com.example.app', ELECTRON_MIRROR: 'https://mirror/' },
    })
    expect(specs[0]?.stdio).toEqual({ stdin: 'ignore', stdout: { maxBytes: 32_768 * 4 }, stderr: { maxBytes: 32_768 * 4 } })
    await children[0]!.finish(1)
  })

  it('omits the mirror when none is configured and the environment has none', async () => {
    const previous = process.env['ELECTRON_MIRROR']
    delete process.env['ELECTRON_MIRROR']
    try {
      const root = fakeCheckout()
      const children: FakeChild[] = []
      const ctx = new Context()
      const specs: SubprocessSpawnSpec[] = []
      ctx.provide('subprocess', {
        spawn: (spec: SubprocessSpawnSpec) => {
          specs.push(spec)
          return fakeSubprocess(children)(spec)
        },
      })
      new DesktopPackagerService(ctx, { repositoryRoot: root }).start()
      expect(specs[0]?.env).toEqual({ DSH_DESKTOP_APP_ID: 'com.deepseek.harness.desktop' })
      await children[0]!.finish(1)
    } finally {
      if (previous !== undefined) process.env['ELECTRON_MIRROR'] = previous
    }
  })

  it('reports a failing build with the exit status', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    await children[0]!.finish(3)
    expect(packager.status()).toMatchObject({
      phase: 'failed',
      error: 'the packaging command exited with 3',
    })
  })

  it('fails when a successful command leaves no installer', async () => {
    const root = fakeCheckout({ artifact: false })
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    await children[0]!.finish(0)
    expect(packager.status()).toMatchObject({
      phase: 'failed',
      error: 'the packaging command completed without producing an installer',
    })
  })

  it('fails when the checkout manifest cannot name the installer', async () => {
    const root = fakeCheckout()
    writeFileSync(join(root, 'package.json'), '{"name":"no-version"}')
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    await children[0]!.finish(0)
    expect(packager.status()).toMatchObject({ phase: 'failed' })
  })

  it('cancels through the process handle and settles as cancelled', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    expect(packager.cancel().phase).toBe('running')
    expect(children[0]!.terminated()).toBe(true)
    await children[0]!.finish(null)
    expect(packager.status()).toMatchObject({ phase: 'cancelled' })
    expect(packager.status().error).toBeUndefined()
  })

  it('ignores a cancel request with no running build', () => {
    expect(service({ repositoryRoot: fakeCheckout() }).cancel().phase).toBe('idle')
  })

  it('reports a spawn failure without leaving a running build', () => {
    const root = fakeCheckout()
    const packager = service({ repositoryRoot: root }, [], new Error('spawn denied'))
    expect(packager.start()).toEqual({ ok: false, error: { code: 'spawn-failed', message: 'spawn denied' } })
    expect(packager.status()).toMatchObject({ phase: 'failed', error: 'spawn denied' })
  })

  it('reports a build whose process could not be observed', async () => {
    const root = fakeCheckout()
    const ctx = new Context()
    const handle = fakeSubprocess([])({} as SubprocessSpawnSpec)
    const rejected = Object.assign(handle, {
      done: Promise.reject(new Error('runner crashed')),
      collected: {},
    }) as SubprocessHandle
    ctx.provide('subprocess', { spawn: () => rejected })
    const packager = new DesktopPackagerService(ctx, { repositoryRoot: root })
    packager.start()
    await Promise.resolve()
    await Promise.resolve()
    expect(packager.status()).toMatchObject({
      phase: 'failed',
      error: 'the packaging process could not be observed: runner crashed',
    })
  })

  it('bounds the retained output tail', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root, logTailChars: 1_024 }, children)
    packager.start()
    children[0]!.emit('x'.repeat(4_000))
    const status = packager.status()
    expect(status.log).toHaveLength(1_024)
    await children[0]!.finish(1)
  })

  it('replaces the tail when the collected stream reports a lossy read', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root, logTailChars: 1_024 }, children)
    packager.start()
    children[0]!.emit('first')
    packager.status()
    children[0]!.emit('tail')
    children[0]!.markLossy()
    expect(packager.status().log).toBe('firsttail')
    await children[0]!.finish(1)
  })

  it('resolves the default target and repository from the process', () => {
    const status = service({}).status()
    expect(status.target).toBe('mac-arm64')
    expect(status.repositoryRoot).toBe(process.cwd())
    expect(status.command).toBe('pnpm run package:desktop:mac:arm64:unsigned')
  })

  it('names the configured target in the displayed command even when it is unsupported', () => {
    expect(service({ target: 'linux-x64' }).status()).toMatchObject({
      target: 'linux-x64',
      command: 'pnpm run linux-x64',
      phase: 'idle',
    })
  })

  it('invokes pnpm through the ambient entry point, falling back to PATH', async () => {
    const previous = process.env['npm_execpath']
    const root = fakeCheckout()
    /** Start one build over a fresh context and return the spec it spawned. */
    const spawnSpec = async (entry: string): Promise<SubprocessSpawnSpec | undefined> => {
      const children: FakeChild[] = []
      const specs: SubprocessSpawnSpec[] = []
      const ctx = new Context()
      ctx.provide('subprocess', {
        spawn: (spec: SubprocessSpawnSpec) => {
          specs.push(spec)
          return fakeSubprocess(children)(spec)
        },
      })
      process.env['npm_execpath'] = entry
      new DesktopPackagerService(ctx, { repositoryRoot: root }).start()
      await children[0]!.finish(1)
      return specs[0]
    }
    try {
      expect((await spawnSpec(''))?.argv[0]).toBe('pnpm')
      expect((await spawnSpec('/tools/pnpm.cjs'))?.argv.slice(0, 2)).toEqual([process.execPath, '/tools/pnpm.cjs'])
    } finally {
      if (previous === undefined) delete process.env['npm_execpath']
      else process.env['npm_execpath'] = previous
    }
  })

  it('fails when the root manifest declares an empty version', async () => {
    const root = fakeCheckout()
    writeFileSync(join(root, 'package.json'), '{"version":""}')
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    await children[0]!.finish(0)
    expect(packager.status()).toMatchObject({ phase: 'failed' })
  })

  it('drains a build whose handle exposes one stream only', async () => {
    const root = fakeCheckout()
    const ctx = new Context()
    const base = fakeSubprocess([])({} as SubprocessSpawnSpec)
    ctx.provide('subprocess', {
      spawn: () => Object.assign(base, { collected: { stdout: base.collected.stdout } }) as SubprocessHandle,
    })
    const packager = new DesktopPackagerService(ctx, { repositoryRoot: root })
    packager.start()
    expect(() => packager.status()).not.toThrow()
  })

  it('reports a signal-terminated build that the caller did not cancel', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    await children[0]!.finish(null)
    expect(packager.status()).toMatchObject({
      phase: 'failed',
      error: 'the packaging command exited with a signal',
    })
  })

  it('reports a non-Error spawn failure', () => {
    const root = fakeCheckout()
    const ctx = new Context()
    ctx.provide('subprocess', {
      spawn: () => { throw 'plain refusal' },
    })
    const packager = new DesktopPackagerService(ctx, { repositoryRoot: root })
    expect(packager.start()).toEqual({ ok: false, error: { code: 'spawn-failed', message: 'plain refusal' } })
  })

  it('reports a non-Error observation failure', async () => {
    const root = fakeCheckout()
    const ctx = new Context()
    const handle = fakeSubprocess([])({} as SubprocessSpawnSpec)
    ctx.provide('subprocess', {
      spawn: () => Object.assign(handle, { done: rejectWith<never>('runner gone'), collected: {} }) as SubprocessHandle,
    })
    const packager = new DesktopPackagerService(ctx, { repositoryRoot: root })
    packager.start()
    await Promise.resolve()
    await Promise.resolve()
    expect(packager.status()).toMatchObject({
      phase: 'failed',
      error: 'the packaging process could not be observed: runner gone',
    })
  })

  it('reveals the produced installer through the platform file manager', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const ctx = new Context()
    const specs: SubprocessSpawnSpec[] = []
    ctx.provide('subprocess', {
      spawn: (spec: SubprocessSpawnSpec) => {
        specs.push(spec)
        return fakeSubprocess(children)(spec)
      },
    })
    const packager = new DesktopPackagerService(ctx, { repositoryRoot: root })
    packager.start()
    await children[0]!.finish(0)

    const revealed = packager.reveal()
    const opener = children[1]!
    if (process.platform === 'darwin') {
      expect(specs[1]?.argv.slice(0, 2)).toEqual(['open', '-R'])
      expect(specs[1]?.argv[2]).toBe(packager.status().artifactPath)
    }
    expect(specs[1]?.cwd).toBe(join(root, 'apps', 'desktop', '.desktop-build', 'targets', 'mac-arm64', 'unsigned-artifacts'))
    await opener.finish(0)
    await expect(revealed).resolves.toEqual({ ok: true })
  })

  it('reveals the artifact directory before any build has produced an installer', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const ctx = new Context()
    const specs: SubprocessSpawnSpec[] = []
    ctx.provide('subprocess', {
      spawn: (spec: SubprocessSpawnSpec) => {
        specs.push(spec)
        return fakeSubprocess(children)(spec)
      },
    })
    const packager = new DesktopPackagerService(ctx, { repositoryRoot: root })
    const revealed = packager.reveal()
    const directory = join(
      root, 'apps', 'desktop', '.desktop-build', 'targets', 'mac-arm64', 'unsigned-artifacts',
    )
    if (process.platform === 'darwin') {
      expect(specs[0]?.argv).toEqual(['open', '-R', directory])
    }
    await children[0]!.finish(0)
    await expect(revealed).resolves.toEqual({ ok: true })
  })

  it('creates and reveals the artifact directory when no build has run yet', async () => {
    const root = fakeCheckout({ artifact: false })
    const children: FakeChild[] = []
    const ctx = new Context()
    const specs: SubprocessSpawnSpec[] = []
    ctx.provide('subprocess', {
      spawn: (spec: SubprocessSpawnSpec) => {
        specs.push(spec)
        return fakeSubprocess(children)(spec)
      },
    })
    const directory = join(root, 'apps', 'desktop', '.desktop-build', 'targets', 'mac-arm64', 'unsigned-artifacts')
    expect(existsSync(directory)).toBe(false)

    const revealed = new DesktopPackagerService(ctx, { repositoryRoot: root }).reveal()
    expect(existsSync(directory)).toBe(true)
    if (process.platform === 'darwin') expect(specs[0]?.argv).toEqual(['open', '-R', directory])
    await children[0]!.finish(0)
    await expect(revealed).resolves.toEqual({ ok: true })
  })

  it('refuses to reveal under a root that holds no Desktop app', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'desktop-packager-empty-'))
    roots.push(empty)
    const packager = service({ repositoryRoot: empty })
    await expect(packager.reveal()).resolves.toEqual({
      ok: false,
      error: `${empty} holds no apps/desktop package; set repositoryRoot to the DeepSeek Harness checkout`,
    })
  })

  it('refuses to reveal an unsupported target', async () => {
    const packager = service({ repositoryRoot: fakeCheckout(), target: 'linux-x64' })
    await expect(packager.reveal()).resolves.toEqual({
      ok: false,
      error: 'unsupported target "linux-x64"; expected mac-arm64 or win-x64',
    })
  })

  it('reports a file manager that exits non-zero, with its diagnostic', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    await children[0]!.finish(0)
    const revealed = packager.reveal()
    children[1]!.emitToStderr('open: no such file\n')
    await children[1]!.finish(1)
    await expect(revealed).resolves.toEqual({ ok: false, error: 'open: no such file' })
  })

  it('reports a bare non-zero file manager exit without diagnostics', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    await children[0]!.finish(0)
    const revealed = packager.reveal()
    await children[1]!.finish(2)
    await expect(revealed).resolves.toEqual({
      ok: false,
      error: 'the file manager opener exited with 2',
    })
  })

  it('reports a file manager that cannot be spawned', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const ctx = new Context()
    let calls = 0
    ctx.provide('subprocess', {
      spawn: (spec: SubprocessSpawnSpec) => {
        calls += 1
        if (calls > 1) throw 'no file manager'
        return fakeSubprocess(children)(spec)
      },
    })
    const packager = new DesktopPackagerService(ctx, { repositoryRoot: root })
    packager.start()
    await children[0]!.finish(0)
    await expect(packager.reveal()).resolves.toEqual({ ok: false, error: 'no file manager' })
  })

  it('reports a file manager ended by a signal', async () => {
    const root = fakeCheckout()
    const children: FakeChild[] = []
    const packager = service({ repositoryRoot: root }, children)
    packager.start()
    await children[0]!.finish(0)
    const revealed = packager.reveal()
    await children[1]!.finish(null)
    await expect(revealed).resolves.toEqual({
      ok: false,
      error: 'the file manager opener exited with a signal',
    })
  })
})
