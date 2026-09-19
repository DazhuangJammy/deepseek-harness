import { useRef, useState } from 'react'
import { BrandWordmark, Button, FishLogo, IconChevronDownOutline14, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { BrandSettings } from '../brand-settings.ts'
import { DEFAULT_BRAND_SETTINGS } from '../brand-settings.ts'
import css from './Brand.module.css'

/** Browser-facing brand state and editor actions. */
export interface BrandFace {
  /** Reactive accepted settings and editor state. */
  hooks: { brand: SnapshotStore<BrandSettings>; editor: SnapshotStore<BrandEditorState> }
  /** Stage one editor change. */
  edit: (patch: Partial<BrandSettings>) => void
  /** Persist staged values. */
  save: () => void
  /** Remove all user overrides. */
  reset: () => void
}

/** Reactive editor state used by the Settings card. */
export interface BrandEditorState {
  /** Values currently shown in the editor. */
  draft: BrandSettings
  /** Whether the draft differs from the accepted settings. */
  dirty: boolean
  /** Whether a settings write is in flight. */
  saving: boolean
  /** Whether the last write failed. */
  failed: boolean
}

type BrandProps = Partial<InjectFace<BrandFace>>

/**
 * Render the official mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the official whale mark.
 */
export function OfficialBrandMark({ size, useBrand }: SidebarBrandMarkOwnerProps & BrandProps) {
  const brand = useBrand?.(value => value) ?? DEFAULT_BRAND_SETTINGS
  if (!brand.enabled || brand.icon.trim() === '') return <FishLogo size={size} />
  return <img className={css.mark} src={brand.icon} width={size} height={size} alt="" />
}

/**
 * Render the custom mark in the new-session hero while its slot is active.
 * @param props - Host-supplied hero geometry and the accepted brand source.
 * @returns the configured image, or null during a same-frame settings withdrawal.
 */
export function OfficialHeroBrandMark({ size, className, useBrand }: HeroBrandMarkOwnerProps & BrandProps) {
  const brand = useBrand?.(value => value) ?? DEFAULT_BRAND_SETTINGS
  if (!brand.enabled || brand.icon.trim() === '') return null
  return <img className={className === undefined ? css.mark : `${css.mark} ${className}`} src={brand.icon} width={size} height={size} alt="" />
}

/**
 * Render the official name artwork without its independently slotted mark.
 * @returns the official name wordmark.
 */
export function OfficialBrandName({ useBrand }: BrandProps) {
  const brand = useBrand?.(value => value) ?? DEFAULT_BRAND_SETTINGS
  if (!brand.enabled || brand.name.trim() === '') return <BrandWordmark includeMark={false} />
  return <span className={css.customName}>{brand.name}</span>
}

/**
 * Settings card rendered inside Settings → Plugins.
 * @param props - localized copy, editor state, and actions.
 * @returns the brand settings form, or null when its injected face is absent.
 */
export function BrandSettingsCard({ t, useBrand, useEditor, edit, save, reset }: BrandProps & PropsLocale<'ui-brand-official'>) {
  if (useBrand === undefined || useEditor === undefined || edit === undefined || save === undefined || reset === undefined) return null
  const { draft, dirty, saving, failed } = useEditor(value => value)
  const brand = useBrand(value => value)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const previewName = draft.enabled && draft.name.trim() !== '' ? draft.name : t('preview')
  const upload = (file: File): void => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') edit({ icon: reader.result })
      setUploading(false)
    }
    reader.onerror = () => { setUploading(false) }
    reader.readAsDataURL(file)
  }
  return (
    <section className={`${css.card}${open ? ` ${css.cardOpen}` : ''}`} aria-label={t('title')}>
      <button type="button" className={css.header} aria-expanded={open} onClick={() => { setOpen(value => !value) }}>
        <span className={css.headText}>
          <span className={css.name}>{t('title')}</span>
          <span className={css.description}>{t('description')}</span>
        </span>
        {dirty && <Tag tone="neutral" className={css.pending}>{t('unsaved')}</Tag>}
        <IconChevronDownOutline14 className={`${css.chevron}${open ? ` ${css.chevronOpen}` : ''}`} aria-hidden />
      </button>
      {open && <div className={css.body}>
        <label className={css.toggle}>
          <input type="checkbox" checked={draft.enabled} disabled={saving} onChange={(event) => { edit({ enabled: event.target.checked }) }} />
          <span>{t('enabled')}</span>
        </label>
        <div className={css.preview}>
          {draft.enabled && draft.icon.trim() !== '' ? <img className={css.previewMark} src={draft.icon} width={28} height={28} alt="" /> : <FishLogo size={28} />}
          <strong>{previewName}</strong>
        </div>
        <label className={css.field}>
          <span>{t('name')}</span>
          <input value={draft.name} disabled={saving || !draft.enabled} onChange={(event) => { edit({ name: event.target.value }) }} />
          <small>{t('nameHint')}</small>
        </label>
        <label className={css.field}>
          <span>{t('icon')}</span>
          <div className={css.iconRow}>
            <input value={draft.icon.startsWith('data:') ? '' : draft.icon} disabled={saving || !draft.enabled} placeholder={t('iconPlaceholder')} onChange={(event) => { edit({ icon: event.target.value }) }} />
            <Button variant="outline" size="sm" disabled={saving || !draft.enabled || uploading} onClick={() => { fileInput.current?.click() }}>{uploading ? t('uploading') : t('upload')}</Button>
            <input
              ref={fileInput}
              className={css.fileInput}
              type="file"
              accept="image/*"
              disabled={saving || !draft.enabled}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file !== undefined) upload(file)
              }}
            />
          </div>
          <small>{t('iconHint')}</small>
        </label>
        <div className={css.footer}>
          {failed && <p className={css.failed} role="status">{t('failed')}</p>}
          <button type="button" className={css.discard} disabled={saving} onClick={reset}>{t('reset')}</button>
          <button type="button" className={css.save} disabled={!dirty || saving} onClick={save}>{saving ? t('saving') : t('save')}</button>
        </div>
        {!dirty && brand.enabled && <span className={css.saved} role="status">{t('saved')}</span>}
      </div>}
    </section>
  )
}

export { DEFAULT_BRAND_SETTINGS }
