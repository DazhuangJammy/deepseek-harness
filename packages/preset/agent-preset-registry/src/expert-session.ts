/** Bounded Session projection used by expert refinement and resume restoration. */

import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { Message } from '@deepseek-ai/dsh-llm'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { SessionSeq } from '@deepseek-ai/dsh-session/types'
import { z } from 'zod'

/** User action that selected one expert prompt version for subsequent requests. */
export type ExpertPromptApplicationSource = 'manual-save' | 'optimization-accepted' | 'branch-latest'

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** Complete expert prompt version selected for this Session's subsequent requests. */
    'expert/prompt-applied': {
      /** Expert preset whose prompt was selected. */
      readonly expertId: string
      /** Immutable expert version selected. */
      readonly version: number
      /** Complete prompt installed after this event. */
      readonly prompt: string
      /** User action that selected the version. */
      readonly source: ExpertPromptApplicationSource
    }
  }
}

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /** Evidence context injected into the refinement child's opening request.
     * Readers without the registry preserve the message and derive the rest of the
     * transcript; the evidence window the producer rebuilds is its own projection.
     * @persistenceAttribution
     */
    'expert-refinement': { kind: 'expert-refinement' }
  }
}

/** One recent human input or assistant final-text answer retained for refinement evidence. */
export interface ExpertEvidenceMessage {
  readonly seq: SessionSeq
  readonly role: 'user' | 'assistant'
  /** Concatenated text blocks; reasoning blocks and Assistant stream records are excluded. */
  readonly text: string
  readonly messageId?: MessageId | undefined
  /** Complete prompt in force for this assistant answer. */
  readonly prompt?: string | undefined
}

/** Host-only expert state reconstructed incrementally from the Session log. */
export interface ExpertRefinementProjection {
  readonly activePrompt: string | null
  readonly appliedPrompt: string | null
  readonly appliedVersion: number | null
  readonly recent: readonly ExpertEvidenceMessage[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    expertRefinement: ExpertRefinementProjection
  }
}

const stateSchema = z.object({
  activePrompt: z.string().nullable(),
  appliedPrompt: z.string().nullable(),
  appliedVersion: z.number().int().positive().nullable(),
  recent: z.array(z.object({
    seq: z.number().int().nonnegative().transform(SessionSeq),
    role: z.enum(['user', 'assistant']),
    text: z.string(),
    messageId: z.string().transform(value => brandString<MessageId>(value)).optional(),
    prompt: z.string().optional(),
  }).strict()),
}).strict()

/** Return only end-user-visible text blocks from one durable message. */
function visibleTextOf(message: Message): string {
  return message.content
    .filter((block): block is Extract<(typeof message.content)[number], { type: 'text' }> => block.type === 'text')
    .map(block => block.text)
    .join('\n')
}

/**
 * Build the bounded host-only projection for one deployment policy.
 * @param limit - maximum recent human inputs and assistant final-text answers retained.
 * @returns projection definition registered by the agent-preset service.
 */
export function expertRefinementProjectionDefinition(
  limit: number,
): ProjectionDefinition<'expertRefinement', ExpertRefinementProjection> {
  const append = (
    state: ExpertRefinementProjection,
    message: ExpertEvidenceMessage,
  ): ExpertRefinementProjection => ({
    ...state,
    recent: [...state.recent, message].slice(-limit),
  })
  return {
    key: 'expertRefinement',
    stateSchema,
    init: () => ({ activePrompt: null, appliedPrompt: null, appliedVersion: null, recent: [] }),
    apply(state, event) {
      switch (event.type) {
        case 'system/message':
          return { ...state, activePrompt: visibleTextOf(event.data.message) }
        case 'user/message': {
          if (event.data.source.kind !== 'user') return state
          const text = visibleTextOf(event.data)
          return text.trim() === '' ? state : append(state, { seq: event.seq, role: 'user', text })
        }
        case 'assistant/message': {
          const text = visibleTextOf(event.data.message)
          return text.trim() === '' ? state : append(state, {
            seq: event.seq,
            role: 'assistant',
            text,
            messageId: event.data.message.id,
            ...state.activePrompt === null ? {} : { prompt: state.activePrompt },
          })
        }
        case 'expert/prompt-applied':
          return { ...state, appliedPrompt: event.data.prompt, appliedVersion: event.data.version }
        default:
          return state
      }
    },
    stateVersion: 1,
  }
}
