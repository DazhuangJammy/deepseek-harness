/** Browser entry for the read-only Agent architecture learning view. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { LearningView } from './LearningView.tsx'
import { en, NS, zh } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Agent architecture learning view copy. */
    learning: import('./locales.ts').LearningKey
  }
}

/** Services required by the view registration. */
export const inject = ['slots', 'locale']

/**
 * Register the learning tab. The view consumes only the standard conversation
 * snapshot, so unloading this plugin removes one tab without changing runtime.
 * @param ctx - Client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'agent-learning: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'learning',
    order: 20,
    locale: NS,
    label: () => t('view.learning'),
  }, LearningView))
}
