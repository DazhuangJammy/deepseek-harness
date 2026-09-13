/** Durable settings for the optional custom desktop brand. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the brand plugin. */
export const BRAND_SETTINGS_NAMESPACE = 'ui-brand-official'

/** Default settings keep the shell's existing brand presentation. */
export const DEFAULT_BRAND_SETTINGS = { enabled: false, name: '', icon: '' } as const

/** Persisted custom brand values. Empty name/icon deliberately mean fallback. */
export interface BrandSettings {
  /** Whether custom sidebar presentation is active. */
  enabled: boolean
  /** Custom sidebar name; empty keeps the built-in name. */
  name: string
  /** Image URL or data URL; empty keeps the built-in mark. */
  icon: string
}

/** Settings schema used by the Host registry and browser decoder. */
export const BrandSettingsSchema: z<BrandSettings> = z.object({
  enabled: z.boolean().default(DEFAULT_BRAND_SETTINGS.enabled),
  name: z.string().default(DEFAULT_BRAND_SETTINGS.name),
  icon: z.string().default(DEFAULT_BRAND_SETTINGS.icon),
})
