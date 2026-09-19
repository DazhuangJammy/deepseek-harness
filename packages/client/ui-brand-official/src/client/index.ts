/** Official DeepSeek Harness occupants for the generic browser-brand slots. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { BRAND_SETTINGS_NAMESPACE, DEFAULT_BRAND_SETTINGS, type BrandSettings } from '../brand-settings.ts'
import { BrandSettingsCard, type BrandEditorState, OfficialBrandMark, OfficialBrandName, OfficialHeroBrandMark } from './Brand.tsx'
import { en, zh, type BrandLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'ui-brand-official': BrandLocaleKey }
}

class BrandController {
  readonly store: SnapshotStore<BrandSettings>
  readonly editor: SnapshotStore<BrandEditorState>
  private draft: BrandSettings = { ...DEFAULT_BRAND_SETTINGS }
  private dirty = false
  private saving = false
  private failed = false
  private readonly scope: SettingsScope<BrandSettings> | undefined

  constructor(ctx: ClientContext) {
    const settingsScope = ctx.get('settingsScope')
    this.scope = settingsScope?.bind<BrandSettings>({ namespace: BRAND_SETTINGS_NAMESPACE })
    this.store = createSnapshotStore<BrandSettings>({ ...DEFAULT_BRAND_SETTINGS })
    this.editor = createSnapshotStore<BrandEditorState>({
      draft: { ...DEFAULT_BRAND_SETTINGS }, dirty: false, saving: false, failed: false,
    })
    this.scope?.subscribe(() => {
      const value = this.scope?.getSnapshot().value
      if (value !== undefined && !this.dirty) this.draft = { ...value }
      if (value !== undefined) this.store.set({ ...value })
      this.publishEditor()
    })
    const value = this.scope?.getSnapshot().value
    if (value !== undefined) {
      this.draft = { ...value }
      this.store.set({ ...value })
      this.editor.set({ draft: this.draft, dirty: false, saving: false, failed: false })
    }
  }

  face() {
    return {
      hooks: { brand: this.store, editor: this.editor },
      edit: (patch: Partial<BrandSettings>) => {
        this.draft = { ...this.draft, ...patch }
        this.dirty = true
        this.failed = false
        this.publishEditor()
      },
      save: () => { void this.save() },
      reset: () => { void this.reset() },
    }
  }

  private publishEditor(): void {
    this.editor.set({ draft: this.draft, dirty: this.dirty, saving: this.saving, failed: this.failed })
  }

  private async save(): Promise<void> {
    if (!this.dirty || this.saving) return
    this.saving = true
    this.failed = false
    this.publishEditor()
    try {
      if (this.scope === undefined) {
        this.dirty = false
      } else {
        await this.scope.mutate([
          { op: 'set', path: ['enabled'], value: this.draft.enabled },
          { op: 'set', path: ['name'], value: this.draft.name.trim() },
          { op: 'set', path: ['icon'], value: this.draft.icon.trim() },
        ])
        const value = this.scope.getSnapshot().value
        if (value !== undefined) {
          this.draft = { ...value }
          this.store.set({ ...value })
        }
        this.dirty = false
      }
    } catch {
      this.failed = true
    }
    this.saving = false
    this.publishEditor()
  }

  private async reset(): Promise<void> {
    if (this.saving) return
    this.saving = true
    this.failed = false
    this.publishEditor()
    try {
      if (this.scope === undefined) {
        this.dirty = false
      } else {
        await this.scope.mutate([
          { op: 'unset', path: ['enabled'] },
          { op: 'unset', path: ['name'] },
          { op: 'unset', path: ['icon'] },
        ])
        const value = this.scope.getSnapshot().value ?? DEFAULT_BRAND_SETTINGS
        this.draft = { ...value }
        this.store.set({ ...value })
        this.dirty = false
      }
    } catch {
      this.failed = true
    }
    this.saving = false
    this.publishEditor()
  }
}

/** Required service: the UI slot registry. */
export const inject = ['slots']

/**
 * Register the brand occupants a client can actually resolve. A surface keeps
 * its declaring package's fallback until the official build profile requests
 * the shipped brand or the accepted settings carry a value for that surface, so
 * a local build keeps its own mark and build label until someone configures one.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  // Lightweight hosts without SettingsScope retain the historical profile
  // gate; the assembled Web client always has the scope and can configure it.
  if (ctx.get('settingsScope') === undefined && process.env.DSH_CLIENT_BUILD_PROFILE !== 'official') return
  const shipped = process.env.DSH_CLIENT_BUILD_PROFILE === 'official'
  const controller = new BrandController(ctx)
  ctx.effect(() => {
    const locale = ctx.get('locale')
    return locale === undefined ? () => {} : locale.register('ui-brand-official', { zh, en })
  }, 'ui-brand-official: dictionaries')

  /**
   * Keep one occupant registered exactly while `active` holds for the accepted
   * brand, so the slot returns to its declaring fallback as settings change.
   */
  const occupyWhile = (active: (brand: BrandSettings) => boolean, register: () => () => void): () => void => {
    let dispose: (() => void) | undefined
    const sync = (): void => {
      const wanted = active(controller.store.getSnapshot())
      if (wanted && dispose === undefined) {
        dispose = register()
      } else if (!wanted && dispose !== undefined) {
        dispose()
        dispose = undefined
      }
    }
    sync()
    const unsubscribe = controller.store.subscribe(sync)
    return () => {
      unsubscribe()
      dispose?.()
      dispose = undefined
    }
  }

  ctx.slots.inject('sidebar.brand.mark', () => occupyWhile(
    brand => shipped || (brand.enabled && brand.icon.trim() !== ''),
    () => ctx.slots.register({ name: 'sidebar.brand.mark', inject: () => controller.face() }, OfficialBrandMark),
  ))
  ctx.slots.inject('sidebar.brand.name', () => occupyWhile(
    brand => shipped || (brand.enabled && brand.name.trim() !== ''),
    () => ctx.slots.register({ name: 'sidebar.brand.name', inject: () => controller.face() }, OfficialBrandName),
  ))
  ctx.slots.inject('conversation.hero.brand.mark', () => occupyWhile(
    brand => brand.enabled && brand.icon.trim() !== '',
    () => ctx.slots.register({ name: 'conversation.hero.brand.mark', inject: () => controller.face() }, OfficialHeroBrandMark),
  ))
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab', id: BRAND_SETTINGS_NAMESPACE, order: 20,
    // The dictionary is optional — a host without `locale` registers none — so
    // the label reads it through `ctx.get` and falls back to the shipped English
    // copy instead of reaching for an uninjected service.
    label: () => ctx.get('locale')?.bind('ui-brand-official')('title') ?? en.title,
    locale: 'ui-brand-official', inject: () => controller.face(),
  }, BrandSettingsCard))
}
