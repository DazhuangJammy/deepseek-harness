/**
 * Official browser-brand plugin, node half. The custom-brand preference is this
 * plugin's own Config, so the Host settings document owns persistence and the
 * generic describe mirror serves it; the browser half ships through
 * `exports["./client"]`.
 */

import type { Context, Volatile } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { BrandSettingsSchema } from './brand-settings.ts'

export {
  BRAND_SETTINGS_NAMESPACE, DEFAULT_BRAND_SETTINGS, BrandSettingsSchema, type BrandSettings,
} from './brand-settings.ts'

/** Runtime custom-brand values projected to the browser. */
export interface Config {
  /** Whether custom sidebar presentation is active. */
  enabled: Volatile<boolean>
  /** Custom sidebar name; empty keeps the built-in name. */
  name: Volatile<string>
  /** Image URL or data URL; empty keeps the built-in mark. */
  icon: Volatile<string>
}

/** Live custom-brand fields, editable through the Settings → Plugins tab. */
export const Config = BrandSettingsSchema

/**
 * Claim the brand page policy when the settings service is composed. The plugin
 * ships its own card in `settings.plugins.tab`, so the auto-generated page for
 * this entry is suppressed; without a settings service the plugin stays inert
 * and the browser half keeps its build-profile default.
 * @param ctx - Host plugin context.
 */
export function apply(ctx?: Context): void {
  if (ctx === undefined) return
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber))
  })
}
