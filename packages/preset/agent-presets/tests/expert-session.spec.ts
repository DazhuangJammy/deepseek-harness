/** Expert refinement projection keeps a bounded evidence window and applied prompt override. */

import {
  createAssistantMessage, createSystemMessage, createUserMessage,
} from '@deepseek-ai/dsh-llm'
import { SESSION_FORMAT_VERSION, SessionId, SessionLogOffset, SessionSeq } from '@deepseek-ai/dsh-session'
import type { SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { expertRefinementProjectionDefinition } from '../src/expert-session.ts'

const header: SessionHeader = {
  version: SESSION_FORMAT_VERSION,
  id: SessionId('expert-projection'),
  createdAt: 1,
  isSeeded: false,
}

const system = (seq: number, text: string): SessionEvent => ({
  type: 'system/message',
  seq: SessionSeq(seq),
  time: seq,
  data: {
    turn: 1,
    step: 1,
    message: createSystemMessage(text, 'test'),
  },
  surfaceOp: 'append',
})

const user = (seq: number, text: string): SessionEvent => ({
  type: 'user/message',
  seq: SessionSeq(seq),
  time: seq,
  data: createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }),
  surfaceOp: 'append',
})

const assistant = (seq: number, text: string): SessionEvent => ({
  type: 'assistant/message',
  seq: SessionSeq(seq),
  time: seq,
  data: {
    turn: 1,
    step: seq,
    message: createAssistantMessage({
      content: [{ type: 'text', text }],
      source: { provider: 'mock', model: 'mock' },
    }),
    stream: [],
  },
  surfaceOp: 'append',
})

describe('expert refinement projection', () => {
  it('bounds evidence, attaches the active prompt to answers, and restores the applied version', () => {
    const definition = expertRefinementProjectionDefinition(3)
    let state = definition.init(header, SessionLogOffset(0))
    state = definition.apply(state, system(0, 'Prompt v1'))
    state = definition.apply(state, user(1, 'Weak request'))
    state = definition.apply(state, assistant(2, 'Weak answer'))
    state = definition.apply(state, user(3, 'Correct it'))
    state = definition.apply(state, assistant(4, 'Better answer'))

    expect(state.recent.map(message => [message.role, message.text])).toEqual([
      ['assistant', 'Weak answer'],
      ['user', 'Correct it'],
      ['assistant', 'Better answer'],
    ])
    expect(state.recent[0]?.prompt).toBe('Prompt v1')
    expect(state.recent[2]?.prompt).toBe('Prompt v1')

    state = definition.apply(state, {
      type: 'expert/prompt-applied',
      seq: SessionSeq(5),
      time: 5,
      data: {
        expertId: 'interview',
        version: 2,
        prompt: 'Prompt v2',
        source: 'manual-save',
      },
    })

    expect(state).toMatchObject({ appliedPrompt: 'Prompt v2', appliedVersion: 2 })
    expect(definition.stateSchema.parse(state)).toEqual(state)
  })

  it('ignores plugin and empty messages while retaining prompt-free assistant evidence', () => {
    const definition = expertRefinementProjectionDefinition(4)
    let state = definition.init(header, SessionLogOffset(0))
    state = definition.apply(state, {
      type: 'user/message',
      seq: SessionSeq(0),
      time: 0,
      data: createUserMessage({
        content: [{ type: 'text', text: 'plugin context' }],
        source: { kind: 'plugin', plugin: 'fixture' },
      }),
      surfaceOp: 'append',
    })
    state = definition.apply(state, user(1, '   '))
    state = definition.apply(state, assistant(2, ''))
    state = definition.apply(state, assistant(3, 'Visible answer'))
    state = definition.apply(state, {
      type: 'turn/start', seq: SessionSeq(4), time: 4, data: { turn: 1 },
    })

    expect(state.recent).toEqual([expect.objectContaining({
      seq: SessionSeq(3), role: 'assistant', text: 'Visible answer',
    })])
    expect(state.recent[0]).not.toHaveProperty('prompt')
  })
})
