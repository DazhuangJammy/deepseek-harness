import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-experimental-desktop-packager/remote'
import type { DesktopPackagerStatus } from '@deepseek-ai/dsh-experimental-desktop-packager/types'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { CommandContribution } from '@deepseek-ai/dsh-client-ui-commands/client'
import { DesktopPackagerTab, type DesktopPackagerTabInjected } from '../src/client/DesktopPackagerTab.tsx'
import { inject, mountDesktopPackagerUi } from '../src/client/mount.ts'
import { apply as browserApply } from '../src/client/index.ts'
import { apply as nodeApply } from '../src/index.ts'

const REMOTE: TypertRemoteContribution = {
  package: '@deepseek-ai/dsh-experimental-desktop-packager',
  descriptors: [],
}

const IDLE: DesktopPackagerStatus = {
  phase: 'idle',
  stage: 'idle',
  target: 'mac-arm64',
  repositoryRoot: '/checkout',
  command: 'pnpm run package:desktop:mac:arm64:unsigned',
  log: '',
}

/** One mounted plugin over stubbed Remote, slot, locale, and command services. */
async function bench(options: { registrationFailure?: boolean; running?: boolean; viaApply?: boolean } = {}) {
  const ctx = new Context()
  const calls: string[] = []
  const status = (): Promise<{ ok: true; value: DesktopPackagerStatus }> => {
    calls.push('status')
    return Promise.resolve({ ok: true, value: options.running === true ? { ...IDLE, phase: 'running' } : IDLE })
  }
  class RemoteService extends Service {
    readonly disposeMount = vi.fn(() => Promise.resolve())
    readonly mount = vi.fn((_contribution: unknown) => Promise.resolve(this.disposeMount))

    constructor(serviceCtx: Context) {
      super(serviceCtx, 'remote')
    }

    $mount(contribution: unknown): Promise<() => Promise<void>> {
      return this.mount(contribution)
    }
  }
  const remote = new RemoteService(ctx)
  ctx.provide('remote.desktopPackager', {
    status,
    reveal: () => {
      calls.push('reveal')
      return Promise.resolve({ ok: true, value: { ok: true } })
    },
    start: () => {
      calls.push('start')
      return Promise.resolve({ ok: true, value: { ok: true, value: { ...IDLE, phase: 'running' } } })
    },
    cancel: () => {
      calls.push('cancel')
      return Promise.resolve({ ok: true, value: { ...IDLE, phase: 'cancelled' } })
    },
  })
  ctx.provide('locale', new LocaleRuntime(ctx))
  const commandDispose = vi.fn()
  const contributions: CommandContribution[] = []
  ctx.provide('commandUi', {
    register: (contribution: CommandContribution) => {
      contributions.push(contribution)
      return commandDispose
    },
    decorate: () => () => {},
    popupFor: () => undefined,
  })
  await ctx.plugin(SlotRegistry).await()
  const collapseTabs = ctx.slots.register({
    name: 'root',
    children: { 'settings.plugins.tab': { kind: 'list', scope: 'root' } },
  } as never, () => null)
  if (options.registrationFailure === true) {
    vi.spyOn(ctx.slots, 'inject').mockImplementationOnce(() => { throw new Error('slot registration failed') })
  }
  const fiber = options.registrationFailure === true
    ? ctx.plugin({ apply() {} })
    : ctx.plugin({
      inject: [...inject],
      apply: clientCtx => options.viaApply === true
        ? browserApply(clientCtx)
        : mountDesktopPackagerUi(clientCtx, REMOTE),
    })
  const activation: Promise<unknown> = options.registrationFailure === true
    ? mountDesktopPackagerUi(ctx, REMOTE).catch((error: unknown) => error)
    : fiber.await()
  if (options.registrationFailure !== true) await activation
  else await fiber.await()
  const entry = () => ctx.slots.entries('settings.plugins.tab')
    .find(candidate => candidate.component === DesktopPackagerTab)
  return { ctx, fiber, activation, calls, remote, entries: entry, contributions, commandDispose, collapseTabs }
}

describe('desktop packager browser plugin', () => {
  it('mounts one Remote namespace and registers the tab and the /desktop command', async () => {
    const b = await bench()
    expect(inject).toEqual(['remote', 'slots', 'locale', 'commandUi'])
    expect(b.remote.mount).toHaveBeenCalledOnce()
    expect(b.remote.mount).toHaveBeenCalledWith(REMOTE)
    expect(b.entries()).toMatchObject({
      options: { id: 'desktop', order: 5 },
      locale: 'settings.desktopPackager',
    })
    expect(b.contributions).toHaveLength(1)
    expect(b.contributions[0]).toMatchObject({ name: 'desktop', ui: { kind: 'popupSelect' } })

    const actions = (b.entries()!.inject as unknown as () => DesktopPackagerTabInjected)()
    await expect(actions.status()).resolves.toMatchObject({ target: 'mac-arm64', repositoryRoot: '/checkout' })
    await expect(actions.start()).resolves.toMatchObject({ ok: true })
    await expect(actions.cancel()).resolves.toMatchObject({ phase: 'cancelled' })
    await expect(actions.reveal()).resolves.toEqual({ ok: true })
    expect(b.calls).toEqual(['status', 'start', 'cancel', 'reveal'])
  })

  it('unwraps a Remote carrier failure into a thrown error', async () => {
    const b = await bench()
    const failing = {
      ok: false as const,
      error: { code: 'gateway/internal', message: 'offline' },
    }
    const ctx = b.ctx as unknown as { remote: { desktopPackager: { status: () => Promise<unknown> } } }
    ctx.remote.desktopPackager.status = () => Promise.resolve(failing)
    const actions = (b.entries()!.inject as unknown as () => DesktopPackagerTabInjected)()
    await expect(actions.status()).rejects.toThrow('gateway/internal: offline')
  })

  it('offers start, status, and cancel options with an acknowledged start', async () => {
    const b = await bench({ running: true })
    const contribution = b.contributions[0]!
    const spec = contribution.ui
    if (spec.kind !== 'popupSelect') throw new Error('expected a popupSelect command')
    const options = await spec.options({} as never, new AbortController().signal)
    expect(options.map(option => option.id)).toEqual(['start', 'status', 'cancel'])
    expect(options[0]).toMatchObject({ active: false })
    expect(typeof options[0]?.confirmation?.acknowledgeLabel).toBe('string')
    expect(options[2]).toMatchObject({ active: true })

    await spec.onSelect(options[0]!, {} as never)
    await spec.onSelect(options[2]!, {} as never)
    await spec.onSelect(options[1]!, {} as never)
    expect(b.calls).toEqual(['status', 'start', 'cancel'])
  })

  it('disposes the tab, the command, and the Remote namespace together', async () => {
    const b = await bench()
    await b.fiber.dispose()
    expect(b.entries()).toBeUndefined()
    expect(b.commandDispose).toHaveBeenCalledOnce()
    expect(b.remote.disposeMount).toHaveBeenCalledOnce()
  })

  it('unmounts the Remote contribution when later Client registration fails', async () => {
    const b = await bench({ registrationFailure: true })
    await expect(b.activation).resolves.toMatchObject({ message: 'slot registration failed' })
    expect(b.remote.mount).toHaveBeenCalledOnce()
    expect(b.remote.disposeMount).toHaveBeenCalledOnce()
  })

  it('re-registers after the Plugins tab slot is collapsed and declared again', async () => {
    const b = await bench()
    expect(b.entries()).toBeDefined()
    b.collapseTabs()
    expect(b.entries()).toBeUndefined()
    b.ctx.slots.register({
      name: 'root',
      children: { 'settings.plugins.tab': { kind: 'list', scope: 'root' } },
    } as never, () => null)
    await Promise.resolve()
    expect(b.entries()).toBeDefined()
  })

  it('reads every registered label and capability from the bound dictionaries', async () => {
    const b = await bench()
    const entry = b.entries()!
    const label = (entry.options as { label?: () => string }).label
    expect(typeof label?.()).toBe('string')
    const contribution = b.contributions[0]!
    // The fixture Client Runtime resolves the default locale, so copy comes from the English dictionary.
    expect(contribution.label?.()).toBe('Build desktop installer')
    expect(contribution.description?.()).toBe('Run the local packaging pipeline to produce an unsigned desktop installer')
    expect(contribution.available({} as never)).toBe(true)
  })

  it('registers the same surfaces through the browser entry apply()', async () => {
    const b = await bench({ viaApply: true })
    expect(b.remote.mount).toHaveBeenCalledOnce()
    expect(b.entries()).toBeDefined()
    expect(b.contributions).toHaveLength(1)
    await b.fiber.dispose()
    expect(b.remote.disposeMount).toHaveBeenCalledOnce()
  })

  it('keeps the node half inert', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
