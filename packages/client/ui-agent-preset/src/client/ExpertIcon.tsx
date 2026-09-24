/** Shared expert icon mapping for menu rows, editor choices, and the welcome cue. */

import type { ComponentType } from 'react'
import type { ExpertIcon } from '@deepseek-ai/dsh-agent-preset-registry/types'
import {
  IconCodeOutlineRegular, IconDataOutlineRegular, IconProjectAddOutlineRegular,
  IconSkillOutlineRegular, IconSparkleRegular, type IconProps,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** Stable picker order. */
export const EXPERT_ICONS: readonly ExpertIcon[] = [
  'sparkles', 'briefcase', 'graduation-cap', 'code', 'chart',
]

const ICONS: Readonly<Record<ExpertIcon, ComponentType<IconProps>>> = {
  sparkles: IconSparkleRegular,
  briefcase: IconProjectAddOutlineRegular,
  'graduation-cap': IconSkillOutlineRegular,
  code: IconCodeOutlineRegular,
  chart: IconDataOutlineRegular,
}

/** Resolve an optional expert icon to a shared primitive, with Sparkle as the neutral fallback. */
export function expertIcon(icon: ExpertIcon | undefined): ComponentType<IconProps> {
  return icon === undefined ? IconSparkleRegular : ICONS[icon]
}
