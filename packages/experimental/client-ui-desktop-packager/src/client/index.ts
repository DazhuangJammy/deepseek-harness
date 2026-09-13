/** Browser entry: mounts the generated Desktop packager Remote contribution and its Settings UI. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import desktopPackagerRemote from '@deepseek-ai/dsh-experimental-desktop-packager/remote'
import { mountDesktopPackagerUi } from './mount.ts'

export { inject } from './mount.ts'
export { phaseText, stageText } from './DesktopPackagerTab.tsx'
export type {
  DesktopPackagerTabInjected,
  DesktopPackagerTabProps,
} from './DesktopPackagerTab.tsx'
export type { DesktopPackagerLocaleKey } from './locales.ts'

/**
 * Mount the generated Desktop packager Remote contribution and register its browser surfaces.
 * @param ctx - Client Context carrying Remote, slot, locale, and command services.
 * @returns disposer for both the UI registrations and the Remote namespace.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  return await mountDesktopPackagerUi(ctx, desktopPackagerRemote)
}
