/** Expert optimization frames a standard-Agent skill task and validates its result. */

import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { brandString } from '@deepseek-ai/dsh-brand'
import { MessageId } from '@deepseek-ai/dsh-llm/brand'
import { Session, SessionId, SessionSeq } from '@deepseek-ai/dsh-session'
import {
  buildExpertOptimizationTask,
  expertPromptRefinerRegistration,
  expertProposalFromOutput,
} from '../src/expert-optimizer.ts'
import { DEFAULT_EXPERT_CONFIG } from '../src/preset.ts'
import type { ExpertDocument, ExpertProposalId } from '../src/types.ts'

const sessionId = SessionId('expert-optimizer')
const targetMessageId = MessageId('improved-answer')
const expert: ExpertDocument = {
  id: 'interview-coach',
  name: 'Interview coach',
  welcome: 'What role are you interviewing for?',
  currentVersion: 1,
  updatedAt: 1,
  prompt: 'Ask one question at a time.',
  versions: [{ version: 1, createdAt: 1, summary: 'Initial version', changes: [] }],
}

function agent(): Agent {
  return { id: sessionId, session: Session.create(sessionId) } as unknown as Agent
}

describe('expert prompt optimizer', () => {
  it('registers the bundled skill for explicit invocation without advertising it', () => {
    const registration = expertPromptRefinerRegistration()

    expect(registration).toMatchObject({
      name: 'expert-prompt-refiner',
      invocation: { modelInvocable: false, userInvocable: true },
    })
    expect(registration.content).toContain('name: expert-prompt-refiner')
    expect(registration.content).toContain('<output-format>')
    expect(registration.resourceBase).toBeUndefined()
  })

  it('frames the selected evidence as an explicit skill task', () => {
    const task = buildExpertOptimizationTask(
      agent(),
      expert,
      [
        { seq: SessionSeq(2), role: 'user', text: 'Ask a more focused question.' },
        {
          seq: SessionSeq(3),
          role: 'assistant',
          text: 'What backend system did you scale?',
          messageId: targetMessageId,
          prompt: expert.prompt,
        },
      ],
      targetMessageId,
    )
    const text = task.prompt[0]?.type === 'text' ? task.prompt[0].text : ''
    const context = task.promptContext.content[0]?.type === 'text'
      ? task.promptContext.content[0].text
      : ''

    expect(text.startsWith('/expert-prompt-refiner\n')).toBe(true)
    expect(text).toContain('请根据已注入的专家提示词和对话证据')
    expect(text).not.toContain('Optimize the expert prompt')
    expect(text).not.toContain(expert.prompt)
    expect(task.promptContext.source).toEqual({ kind: 'expert-refinement' })
    expect(context).toContain(`"originalPrompt":"${expert.prompt}"`)
    expect(context).toContain('Ask a more focused question.')
    expect(text).not.toContain('improved-answer')
    expect(task.evidenceSeqs).toEqual([SessionSeq(2), SessionSeq(3)])
  })

  it('rejects a missing target answer', () => {
    expect(() => buildExpertOptimizationTask(
      agent(), expert, [], targetMessageId,
    )).toThrow(/所选回答不在当前证据窗口内/)
  })

  it('validates a local revision returned by the child Agent', () => {
    const revisedPrompt = 'Ask one focused prompt at a time.'
    const proposal = expertProposalFromOutput({
      summary: '让问题更聚焦',
      revisedPrompt,
      reasons: ['用户纠正后，聚焦追问产生了更好的回答。'],
    }, brandString<ExpertProposalId>('proposal-1'), expert, targetMessageId, DEFAULT_EXPERT_CONFIG.maxPromptBytes)

    expect(proposal).toMatchObject({
      proposalId: 'proposal-1',
      status: 'changed',
      originalPrompt: expert.prompt,
      revisedPrompt,
      changes: [{
        before: 'question',
        after: 'focused prompt',
        reason: '用户纠正后，聚焦追问产生了更好的回答。',
      }],
    })
  })

  it('derives no-change status from the complete prompt instead of model-authored metadata', () => {
    const proposal = expertProposalFromOutput({
      summary: '证据不足',
      revisedPrompt: expert.prompt,
      reasons: [],
    }, brandString<ExpertProposalId>('proposal-2'), expert, targetMessageId, DEFAULT_EXPERT_CONFIG.maxPromptBytes)

    expect(proposal).toMatchObject({ status: 'no-change', revisedPrompt: expert.prompt, changes: [] })
  })

  it('turns an unusable empty candidate into a reviewable no-change result', () => {
    const proposal = expertProposalFromOutput({
      summary: '',
      revisedPrompt: '   ',
      reasons: [''],
    }, brandString<ExpertProposalId>('proposal-3'), expert, targetMessageId, DEFAULT_EXPERT_CONFIG.maxPromptBytes)

    expect(proposal).toMatchObject({
      status: 'no-change',
      summary: '现有证据不足，未修改专家提示词',
      revisedPrompt: expert.prompt,
      changes: [],
    })
  })

  it('rejects malformed and oversized child results', () => {
    expect(() => expertProposalFromOutput(
      { summary: 'missing fields' }, brandString<ExpertProposalId>('invalid'), expert,
      targetMessageId, DEFAULT_EXPERT_CONFIG.maxPromptBytes,
    )).toThrow(/不符合结构化输出要求/)
    expect(() => expertProposalFromOutput(
      { summary: 'large', revisedPrompt: '12345', reasons: [] },
      brandString<ExpertProposalId>('large'), expert, targetMessageId, 4,
    )).toThrow(/超过 4 UTF-8 字节/)
  })

  it('supplies a deterministic changed summary and deduplicated reason', () => {
    const proposal = expertProposalFromOutput({
      summary: ' ', revisedPrompt: 'Ask exactly one question.',
      reasons: [' evidence ', '', 'evidence'],
    }, brandString<ExpertProposalId>('fallback'), expert, targetMessageId,
    DEFAULT_EXPERT_CONFIG.maxPromptBytes)

    expect(proposal).toMatchObject({
      status: 'changed', summary: '根据对话证据局部优化了专家提示词',
      changes: [{ reason: 'evidence' }],
    })
  })

  it('uses the summary as the change reason when the child supplied none', () => {
    const proposal = expertProposalFromOutput({
      summary: '明确单问', revisedPrompt: 'Ask exactly one question.', reasons: [],
    }, brandString<ExpertProposalId>('summary-reason'), expert, targetMessageId,
    DEFAULT_EXPERT_CONFIG.maxPromptBytes)
    expect(proposal.changes).toEqual([expect.objectContaining({ reason: '明确单问' })])
  })

  it.each([
    {
      name: 'an insertion',
      original: 'Ask one question at a time.',
      revised: 'Ask one focused question at a time.',
      before: '',
      after: 'focused ',
    },
    {
      name: 'a deletion',
      original: 'Ask one focused question at a time.',
      revised: 'Ask one question at a time.',
      before: 'focused ',
      after: '',
    },
    {
      name: 'a Unicode replacement',
      original: 'Use 😀 carefully.',
      revised: 'Use 😁 carefully.',
      before: '😀',
      after: '😁',
    },
  ])('derives exact replacement text for $name', ({ original, revised, before, after }) => {
    const proposal = expertProposalFromOutput({
      summary: '局部修改',
      revisedPrompt: revised,
      reasons: ['对话证据支持这项修改。'],
    }, brandString<ExpertProposalId>('proposal-4'), { ...expert, prompt: original }, targetMessageId,
    DEFAULT_EXPERT_CONFIG.maxPromptBytes)

    expect(proposal.changes).toEqual([{ before, after, reason: '对话证据支持这项修改。' }])
  })
})
