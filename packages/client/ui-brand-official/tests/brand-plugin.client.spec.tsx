import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import type { StubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'
import { BRAND_SETTINGS_NAMESPACE, DEFAULT_BRAND_SETTINGS } from '../src/brand-settings.ts'
import type { BrandSettings } from '../src/brand-settings.ts'
import type { BrandFace } from '../src/client/Brand.tsx'
import { en, zh } from '../src/client/locales.ts'

afterEach(() => {
  vi.unstubAllEnvs()
})

/** Resolve after the microtask a started write settles on. */
const settled = async (): Promise<void> => {
  await new Promise<void>((resolve) => { setTimeout(resolve, 0) })
}

const CHILDREN = {
  'sidebar.brand.mark': { kind: 'single', scope: 'root' },
  'sidebar.brand.name': { kind: 'single', scope: 'root' },
  'conversation.hero.brand.mark': { kind: 'single', scope: 'root' },
  'settings.plugins.tab': { kind: 'list', scope: 'root' },
} as const

interface BenchOptions {
  /** Build profile read by the optional-service gate. */
  env?: string
  /** Settings-scope service under test; omit for the lightweight host. */
  settingsScope?: unknown
  /** Locale service under test; omit to exercise the no-dictionary arm. */
  locale?: unknown
  /** Declare the brand slots before apply (default true). */
  declare?: boolean
}

interface Bench {
  ctx: Context
  slots: SlotRegistry
  declare: () => void
}

async function bench(options: BenchOptions = {}): Promise<Bench> {
  if (options.env !== undefined) vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', options.env)
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  if (options.settingsScope !== undefined) ctx.provide('settingsScope', options.settingsScope as never)
  if (options.locale !== undefined) ctx.provide('locale', options.locale as never)
  const slots = ctx.get('slots') as SlotRegistry
  const declare = (): void => {
    slots.register({ name: 'root', children: CHILDREN } as never, () => null)
  }
  if (options.declare !== false) declare()
  return { ctx, slots, declare }
}

async function mount(subject: Bench) {
  const fiber = subject.ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  await Promise.resolve()
  return fiber
}

function faceOf(slots: SlotRegistry, hole: string): BrandFace {
  const entry = slots.entries(hole as never)[0]
  if (entry === undefined) throw new Error(`no occupant on ${hole}`)
  return (entry.inject as unknown as () => BrandFace)()
}

/** The controller face, reached through the settings card every host registers. */
function controllerFace(subject: Bench): BrandFace {
  return faceOf(subject.slots, 'settings.plugins.tab')
}

/** Provide a scope binder and record the namespace each bind asked for. */
function settingsService(scope: StubSettingsScope<BrandSettings>) {
  const bind = vi.fn(() => scope.scope)
  return { bind, service: { bind } }
}

/** Bring up a controller bound to a reachable settings scope. */
async function withScope(options: { declare?: boolean } = {}) {
  const scope = stubSettingsScope<BrandSettings>()
  const settings = settingsService(scope)
  const subject = await bench({ env: 'local', settingsScope: settings.service, ...options })
  const fiber = await mount(subject)
  return { scope, settings, subject, fiber }
}

describe('ui-brand-official browser half', () => {
  it('binds the brand namespace and follows accepted snapshots', async () => {
    const bound = await withScope({ declare: false })
    expect(bound.settings.bind).toHaveBeenCalledWith({ namespace: BRAND_SETTINGS_NAMESPACE })

    bound.scope.publish({ status: 'ready', value: { enabled: true, name: 'Acme', icon: 'https://x/logo.png' } })
    bound.subject.declare()
    await Promise.resolve()
    const face = controllerFace(bound.subject)
    expect(face.hooks.brand.getSnapshot()).toEqual({ enabled: true, name: 'Acme', icon: 'https://x/logo.png' })
    expect(face.hooks.editor.getSnapshot()).toEqual({
      draft: { enabled: true, name: 'Acme', icon: 'https://x/logo.png' }, dirty: false, saving: false, failed: false,
    })

    bound.scope.publish({ value: { enabled: false, name: 'Zed', icon: '' } })
    expect(face.hooks.brand.getSnapshot()).toEqual({ enabled: false, name: 'Zed', icon: '' })
    expect(face.hooks.editor.getSnapshot().draft).toEqual({ enabled: false, name: 'Zed', icon: '' })

    face.edit({ name: 'Pinned' })
    bound.scope.publish({ value: { enabled: true, name: 'Host', icon: 'https://x/host.png' } })
    expect(face.hooks.editor.getSnapshot().draft.name).toBe('Pinned')
    expect(face.hooks.brand.getSnapshot().name).toBe('Host')

    bound.scope.publish({ value: undefined })
    expect(face.hooks.editor.getSnapshot().saving).toBe(false)

    await bound.fiber.dispose()
  })

  it('stages edits locally without writing', async () => {
    const { scope, subject } = await withScope()
    const face = controllerFace(subject)
    face.edit({ name: 'New' })
    expect(scope.mutate).not.toHaveBeenCalled()
    expect(face.hooks.editor.getSnapshot()).toMatchObject({ dirty: true, failed: false })
    expect(face.hooks.editor.getSnapshot().draft.name).toBe('New')
    expect(face.hooks.brand.getSnapshot().name).toBe(DEFAULT_BRAND_SETTINGS.name)
  })

  it('writes the trimmed draft and adopts the accepted snapshot', async () => {
    const { scope, subject } = await withScope()
    const face = controllerFace(subject)

    face.edit({ enabled: true, name: '  New  ', icon: '  https://x/new.png  ' })
    scope.publish({ value: { enabled: true, name: 'New', icon: 'https://x/new.png' } })
    face.save()
    await settled()

    expect(scope.mutate).toHaveBeenCalledWith([
      { op: 'set', path: ['enabled'], value: true },
      { op: 'set', path: ['name'], value: 'New' },
      { op: 'set', path: ['icon'], value: 'https://x/new.png' },
    ])
    expect(face.hooks.brand.getSnapshot()).toEqual({ enabled: true, name: 'New', icon: 'https://x/new.png' })
    expect(face.hooks.editor.getSnapshot()).toEqual({
      draft: { enabled: true, name: 'New', icon: 'https://x/new.png' }, dirty: false, saving: false, failed: false,
    })
  })

  it('keeps the accepted value when a save publishes nothing new', async () => {
    const { scope, subject } = await withScope()
    const face = controllerFace(subject)
    face.edit({ name: 'New' })
    face.save()
    await settled()
    expect(scope.mutate).toHaveBeenCalledOnce()
    expect(face.hooks.editor.getSnapshot()).toMatchObject({ dirty: false, saving: false })
    expect(face.hooks.brand.getSnapshot()).toEqual({ ...DEFAULT_BRAND_SETTINGS })
  })

  it('clears the staged flag without a settings scope on the lightweight host', async () => {
    const subject = await bench({ env: 'official' })
    await mount(subject)
    const face = controllerFace(subject)
    face.edit({ name: 'New' })
    face.save()
    expect(face.hooks.editor.getSnapshot()).toMatchObject({ dirty: false, saving: false, failed: false })
  })

  it('skips a save that is clean or already in flight', async () => {
    const { scope, subject } = await withScope()
    const face = controllerFace(subject)
    face.save()
    expect(scope.mutate).not.toHaveBeenCalled()

    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    scope.mutate.mockReturnValue(gate)
    face.edit({ name: 'New' })
    face.save()
    face.save()
    expect(scope.mutate).toHaveBeenCalledOnce()

    release()
    await settled()
    expect(face.hooks.editor.getSnapshot().saving).toBe(false)
  })

  it('reports a failed save until the next edit', async () => {
    const { scope, subject } = await withScope()
    const face = controllerFace(subject)
    scope.mutate.mockImplementation(() => { throw new Error('denied') })

    face.edit({ name: 'New' })
    face.save()
    await settled()
    expect(face.hooks.editor.getSnapshot()).toMatchObject({ failed: true, saving: false, dirty: true })

    face.edit({ name: 'Newer' })
    expect(face.hooks.editor.getSnapshot()).toMatchObject({ failed: false, dirty: true })
  })

  it('restores the accepted value or the defaults on reset', async () => {
    const accepted = await withScope()
    const acceptedScope = accepted.scope
    const acceptedFace = controllerFace(accepted.subject)
    acceptedScope.publish({ value: { enabled: true, name: 'Acme', icon: 'https://x/logo.png' } })
    acceptedFace.reset()
    await settled()
    expect(acceptedScope.mutate).toHaveBeenCalledWith([
      { op: 'unset', path: ['enabled'] },
      { op: 'unset', path: ['name'] },
      { op: 'unset', path: ['icon'] },
    ])
    expect(acceptedFace.hooks.brand.getSnapshot()).toEqual({ enabled: true, name: 'Acme', icon: 'https://x/logo.png' })
    expect(acceptedFace.hooks.editor.getSnapshot().dirty).toBe(false)

    const empty = await withScope()
    const emptyFace = controllerFace(empty.subject)
    emptyFace.reset()
    await settled()
    expect(emptyFace.hooks.brand.getSnapshot()).toEqual({ ...DEFAULT_BRAND_SETTINGS })
  })

  it('clears the staged flag on a lightweight-host reset', async () => {
    const subject = await bench({ env: 'official' })
    await mount(subject)
    const face = controllerFace(subject)
    face.edit({ name: 'New' })
    face.reset()
    expect(face.hooks.editor.getSnapshot()).toMatchObject({ dirty: false, saving: false, failed: false })
  })

  it('reports a failed reset and ignores one already in flight', async () => {
    const failing = await withScope()
    const failingFace = controllerFace(failing.subject)
    failing.scope.mutate.mockImplementation(() => { throw new Error('denied') })
    failingFace.reset()
    await settled()
    expect(failingFace.hooks.editor.getSnapshot()).toMatchObject({ failed: true, saving: false })

    const pending = await withScope()
    const pendingFace = controllerFace(pending.subject)
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    pending.scope.mutate.mockReturnValue(gate)
    pendingFace.reset()
    pendingFace.reset()
    expect(pending.scope.mutate).toHaveBeenCalledOnce()
    release()
    await settled()
    expect(pendingFace.hooks.editor.getSnapshot().saving).toBe(false)
  })

  it('registers and withdraws the hero occupants with the accepted brand', async () => {
    const scope = stubSettingsScope<BrandSettings>()
    scope.publish({ status: 'ready', value: { ...DEFAULT_BRAND_SETTINGS, enabled: true } })
    const subject = await bench({ env: 'local', settingsScope: settingsService(scope).service, declare: false })
    const fiber = await mount(subject)
    subject.declare()
    await Promise.resolve()

    expect(subject.slots.entries('conversation.hero.brand.mark')).toHaveLength(0)

    scope.publish({ value: { enabled: true, name: 'Acme', icon: 'https://x/logo.png' } })
    expect(subject.slots.entries('conversation.hero.brand.mark')).toHaveLength(1)
    const heroFace = faceOf(subject.slots, 'conversation.hero.brand.mark')
    expect(heroFace.hooks.brand.getSnapshot().icon).toBe('https://x/logo.png')

    scope.publish({ value: { enabled: true, name: 'Acme', icon: '' } })
    expect(subject.slots.entries('conversation.hero.brand.mark')).toHaveLength(0)

    scope.publish({ value: { enabled: false, name: 'Acme', icon: '' } })

    scope.publish({ value: { enabled: true, name: 'Acme', icon: 'https://x/logo.png' } })
    expect(subject.slots.entries('conversation.hero.brand.mark')).toHaveLength(1)

    await fiber.dispose()
    expect(subject.slots.entries('conversation.hero.brand.mark')).toHaveLength(0)
  })

  it('keeps the sidebar fallback until the official profile or a configured value asks for it', async () => {
    const scope = stubSettingsScope<BrandSettings>()
    const subject = await bench({ env: 'local', settingsScope: settingsService(scope).service, declare: false })
    const fiber = await mount(subject)
    subject.declare()
    await Promise.resolve()

    expect(subject.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    expect(subject.slots.entries('sidebar.brand.name')).toHaveLength(0)

    scope.publish({ value: { enabled: true, name: 'Acme', icon: 'https://x/logo.png' } })
    expect(subject.slots.entries('sidebar.brand.mark')).toHaveLength(1)
    expect(subject.slots.entries('sidebar.brand.name')).toHaveLength(1)
    expect(faceOf(subject.slots, 'sidebar.brand.mark').hooks.brand.getSnapshot().name).toBe('Acme')
    expect(faceOf(subject.slots, 'sidebar.brand.name').hooks.brand.getSnapshot().name).toBe('Acme')

    scope.publish({ value: { enabled: true, name: 'Acme', icon: '' } })
    expect(subject.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    expect(subject.slots.entries('sidebar.brand.name')).toHaveLength(1)

    scope.publish({ value: { enabled: false, name: 'Acme', icon: 'https://x/logo.png' } })
    expect(subject.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    expect(subject.slots.entries('sidebar.brand.name')).toHaveLength(0)

    await fiber.dispose()
    expect(subject.slots.entries('sidebar.brand.name')).toHaveLength(0)
  })

  it('keeps the shipped sidebar brand on the official profile without a configured value', async () => {
    const subject = await bench({ env: 'official' })
    await mount(subject)

    expect(subject.slots.entries('sidebar.brand.mark')).toHaveLength(1)
    expect(subject.slots.entries('sidebar.brand.name')).toHaveLength(1)
    expect(subject.slots.entries('conversation.hero.brand.mark')).toHaveLength(0)
  })

  it('registers the dictionaries and the namespace-keyed settings card', async () => {
    const register = vi.fn(() => () => {})
    const scope = stubSettingsScope<BrandSettings>()
    const subject = await bench({
      env: 'local', settingsScope: settingsService(scope).service, locale: { register },
    })
    await mount(subject)

    expect(register).toHaveBeenCalledWith('ui-brand-official', { zh, en })
    const card = subject.slots.entries('settings.plugins.tab')[0]
    expect(card?.options.id).toBe(BRAND_SETTINGS_NAMESPACE)
    expect(card?.locale).toBe('ui-brand-official')
    expect((card?.inject as unknown as () => BrandFace)()).toHaveProperty('hooks')
  })

  it('leaves every brand surface empty on a lightweight host outside the official profile', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.get('slots') as SlotRegistry
    slots.register({ name: 'root', children: CHILDREN } as never, () => null)
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'local')
    await ctx.plugin({ inject: [...inject], apply }).await()
    for (const hole of ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark', 'settings.plugins.tab']) {
      expect(slots.entries(hole as never)).toHaveLength(0)
    }
  })
})
