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

/**
 * Live brand fields, declared as this plugin's own Config. `volatile()` is what
 * makes a field a *preference*: the Host settings document persists it, the
 * describe mirror projects exactly the volatile subset, and the browser edits
 * it through `ctx.configForms.get('ui-brand-official')`. Ordinary (non-volatile)
 * Config stays composition-only and never reaches a form.
 */
export const BrandSettingsSchema = z.object({
  enabled: z.boolean().default(DEFAULT_BRAND_SETTINGS.enabled).volatile(),
  name: z.string().default(DEFAULT_BRAND_SETTINGS.name).volatile(),
  icon: z.string().default(DEFAULT_BRAND_SETTINGS.icon).volatile(),
})
