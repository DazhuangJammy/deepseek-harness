/** Shared expert icon mapping for menu rows, editor choices, and the welcome cue. */

import type { ComponentType } from 'react'
import type { ExpertIcon } from '@deepseek-ai/dsh-agent-presets/types'
import {
  IconCodeOutline16, IconDataOutline16, IconProjectAddOutline16,
  IconSkillOutline16, IconSparkle16, type IconProps,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** Stable picker order. */
export const EXPERT_ICONS: readonly ExpertIcon[] = [
  'sparkles', 'briefcase', 'graduation-cap', 'code', 'chart',
]

const ICONS: Readonly<Record<ExpertIcon, ComponentType<IconProps>>> = {
  sparkles: IconSparkle16,
  briefcase: IconProjectAddOutline16,
  'graduation-cap': IconSkillOutline16,
  code: IconCodeOutline16,
  chart: IconDataOutline16,
}

/** Resolve an optional expert icon to a shared primitive, with Sparkle as the neutral fallback. */
export function expertIcon(icon: ExpertIcon | undefined): ComponentType<IconProps> {
  return icon === undefined ? IconSparkle16 : ICONS[icon]
}
