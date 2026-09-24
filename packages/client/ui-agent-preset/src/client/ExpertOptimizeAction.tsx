/** Finalized-assistant action that starts expert prompt refinement. */

import type { ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconEnhanceOutlineRegular, IconLoadingOutlineRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ExpertUiState } from './expert-store.ts'
import css from './ExpertOptimizeAction.module.css'

export interface ExpertOptimizeActionInjected {
  hooks: { expertUi: SnapshotStore<ExpertUiState> }
  optimize: (messageId: MessageId) => void
}

export type ExpertOptimizeActionProps =
  PropsRuntime<'conversation.chat.assistant-actions'>
  & PropsLocale<'settings.agentPreset'>
  & InjectFace<ExpertOptimizeActionInjected>

/** Show the action only for a Session whose selected preset is an expert. */
export function ExpertOptimizeAction({
  sessionId, messageId, useProjection, useExpertUi, optimize, t,
}: ExpertOptimizeActionProps): ReactNode {
  const expertId = useProjection('agentPreset')
  const state = useExpertUi(value => ({
    expert: value.experts.some(item => item.id === expertId),
    optimization: value.optimizations.get(sessionId),
  }))
  if (!state.expert) return null
  const running = state.optimization?.status === 'starting'
    || state.optimization?.status === 'running'
    || (state.optimization?.status === 'ready' && state.optimization.accepting)
  return (
    <Tooltip label={t(running ? 'expert.optimizing' : 'expert.optimize')} side="bottom">
      <button
        type="button"
        className={css.action}
        aria-label={t(running ? 'expert.optimizing' : 'expert.optimize')}
        disabled={running}
        onClick={() => { optimize(messageId) }}
      >
        {running ? <IconLoadingOutlineRegular className={css.spinning} /> : <IconEnhanceOutlineRegular />}
      </button>
    </Tooltip>
  )
}
