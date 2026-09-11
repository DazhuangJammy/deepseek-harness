/** Blank-session welcome cue for the selected expert. */

import { useEffect, type ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { expertIcon } from './ExpertIcon.tsx'
import type { ExpertUiState } from './expert-store.ts'
import css from './ExpertWelcome.module.css'

export interface ExpertWelcomeInjected {
  hooks: { expertUi: SnapshotStore<ExpertUiState> }
  load: () => Promise<void>
}

export type ExpertWelcomeProps =
  PropsRuntime<'conversation.input.dock'>
  & PropsLocale<'settings.agentPreset'>
  & InjectFace<ExpertWelcomeInjected>

/** Render the expert's author-written first-message cue before the first turn. */
export function ExpertWelcome({ session, useProjection, useExpertUi, load, t }: ExpertWelcomeProps): ReactNode {
  const expertId = useProjection('agentPreset')
  const expert = useExpertUi(state => state.experts.find(item => item.id === expertId))
  useEffect(() => { void load() }, [load])
  if (!session.blank || expert === undefined || expert.welcome.trim() === '') return null
  const Icon = expertIcon(expert.icon)
  return (
    <div className={css.root} role="status">
      <span className={css.icon}><Icon size={16} /></span>
      <span className={css.copy}>
        <strong>{expert.name}</strong>
        <span>{expert.welcome}</span>
      </span>
      <span className={css.version}>{t('expert.version', { version: expert.currentVersion })}</span>
    </div>
  )
}
