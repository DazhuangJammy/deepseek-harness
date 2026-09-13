/**
 * Official browser-brand plugin, node half. The empty apply gives Loader a
 * host-side row while the browser half ships through `exports["./client"]`.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { BRAND_SETTINGS_NAMESPACE, BrandSettingsSchema } from './brand-settings.ts'

export { BRAND_SETTINGS_NAMESPACE, DEFAULT_BRAND_SETTINGS, BrandSettingsSchema, type BrandSettings } from './brand-settings.ts'

/** Register the durable brand section when the settings service is composed. */
export function apply(ctx?: Context): void {
  if (ctx === undefined) return
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(BRAND_SETTINGS_NAMESPACE, BrandSettingsSchema)
  })
}
