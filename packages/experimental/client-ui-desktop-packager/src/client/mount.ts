/** Source-safe Desktop packager browser registration and Remote mount lifecycle. */

import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-commands/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-experimental-desktop-packager/remote'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import {
  DesktopPackagerTab,
  phaseText,
  stageText,
  type DesktopPackagerTabInjected,
} from './DesktopPackagerTab.tsx'
import { en, NS, zh, type DesktopPackagerLocaleKey } from './locales.ts'

export type { DesktopPackagerTabInjected, DesktopPackagerTabProps } from './DesktopPackagerTab.tsx'
export type { DesktopPackagerLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Desktop packager Settings and command copy. */
    'settings.desktopPackager': DesktopPackagerLocaleKey
  }
}

/** Required browser services for Remote calls, slots, localized copy, and the `/desktop` command. */
export const inject = ['remote', 'slots', 'locale', 'commandUi']

/** One Remote call result, as returned by the generated client surface. */
type RemoteCall<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

function registerUi(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'client-ui-desktop-packager: dictionaries')
  const t = ctx.locale.bind(NS)

  /** Unwrap one Remote call; a transport failure becomes a thrown error for the caller to show. */
  const call = async <T>(operation: () => Promise<RemoteCall<T>>): Promise<T> => {
    const result = await operation()
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }

  const actions: DesktopPackagerTabInjected = {
    status: async () => await call(() => ctx.remote.desktopPackager.status()),
    start: async () => await call(() => ctx.remote.desktopPackager.start()),
    cancel: async () => await call(() => ctx.remote.desktopPackager.cancel()),
    reveal: async () => await call(() => ctx.remote.desktopPackager.reveal()),
  }

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'desktop',
    order: 5,
    label: () => t('tab'),
    locale: NS,
    inject: () => actions,
  }, DesktopPackagerTab))

  ctx.effect(() => ctx.commandUi.register({
    name: 'desktop',
    label: () => t('commandLabel'),
    description: () => t('commandDescription'),
    available: () => true,
    ui: {
      kind: 'popupSelect',
      async options() {
        const snapshot = await actions.status()
        const running = snapshot.phase === 'running'
        return [
          {
            id: 'start',
            label: t('optionStart'),
            detail: t('optionStartDetail'),
            active: !running,
            confirmation: {
              title: t('confirmTitle'),
              description: t('confirmDescription'),
              acknowledgeLabel: t('confirmAcknowledge'),
              cancelLabel: t('confirmCancel'),
              confirmLabel: t('confirmConfirm'),
            },
          },
          {
            id: 'status',
            label: t('optionStatus'),
            detail: `${phaseText(snapshot, t)} · ${stageText(snapshot, t)}`,
          },
          {
            id: 'cancel',
            label: t('optionCancel'),
            detail: t('optionCancelDetail'),
            active: running,
          },
        ]
      },
      async onSelect(option) {
        if (option.id === 'start') await actions.start()
        else if (option.id === 'cancel') await actions.cancel()
      },
    },
  }), 'client-ui-desktop-packager: /desktop command')
}

/**
 * Mount one generated Desktop packager Remote contribution, then register its browser surfaces.
 * @param ctx - Client Context carrying Remote, slot, locale, and command services.
 * @param contribution - generated packager descriptors selected by the browser entry.
 * @returns disposer for both the UI registrations and the Remote namespace.
 */
export async function mountDesktopPackagerUi(
  ctx: ClientContext,
  contribution: TypertRemoteContribution,
): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(contribution)
  const ui = ctx.inject(['remote.desktopPackager', 'slots', 'locale', 'commandUi'], registerUi)
  try {
    await ui
  } catch (error) {
    await ui.dispose()
    await disposeRemote()
    throw error
  }
  return async () => {
    await ui.dispose()
    await disposeRemote()
  }
}
