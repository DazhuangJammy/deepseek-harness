/** Right-Sidebar page identity for expert management and refinement review. */

import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import { IconEnhanceOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'

/** Tab kind opened by expert actions. */
export const EXPERT_TAB_KIND = 'expert-prompt'

/** Key shared by the tab definition and its keyed body registration. */
export const EXPERT_TAB_ID = '@deepseek-ai/dsh-client-ui-agent-preset/expert-prompt'

/**
 * Register the expert page as a first-party Sidebar tab.
 * @param t - live expert locale translator.
 * @returns the built-in tab definition.
 */
export function expertTabDefinition(t: TranslateNS<'settings.agentPreset'>): SidebarRightTabDefinition {
  return {
    id: EXPERT_TAB_ID,
    kind: EXPERT_TAB_KIND,
    priority: 'builtin',
    title: () => t('expert.tabTitle'),
    guide: [{
      id: 'manage',
      order: 30,
      title: () => t('expert.manage'),
      description: () => t('expert.manageHint'),
      icon: IconEnhanceOutline16,
    }],
  }
}
