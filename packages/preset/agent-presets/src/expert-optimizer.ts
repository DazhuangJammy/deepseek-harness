/** Expert refinement skill registration, task framing, and result validation. */

import { readFileSync } from 'node:fs'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage, type ContentBlock, type MessageId, type UserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionSeq } from '@deepseek-ai/dsh-session/types'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'
import type { ObjectJsonSchema } from '@deepseek-ai/dsh-tools'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { z } from 'zod'
import type {
  ExpertDocument, ExpertOptimizationProposal, ExpertPromptChange, ExpertProposalId,
} from './types.ts'
import type { ExpertEvidenceMessage } from './expert-session.ts'

/** Stable name invoked by the internal optimization task. */
export const EXPERT_PROMPT_REFINER_SKILL = 'expert-prompt-refiner'
const SKILL_ROOT = new URL('../presets/chat/skills/expert-prompt-refiner/', import.meta.url)

const candidateSchema = z.object({
  summary: z.string(),
  revisedPrompt: z.string(),
  reasons: z.array(z.string()),
}).strict()

/** Structured result contract enforced by the in-process optimization child. */
export const EXPERT_OPTIMIZATION_OUTPUT_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  description: '专家提示词局部优化结果。所有说明文字使用简体中文。',
  properties: {
    summary: { type: 'string', description: '用简体中文概括本次修改或不修改的原因。' },
    revisedPrompt: { type: 'string', description: '完整的新版提示词；保持原提示词的语言。' },
    reasons: {
      type: 'array',
      description: '用简体中文说明对话证据为何支持修改；没有修改时必须为空数组。',
      items: { type: 'string' },
    },
  },
  required: ['summary', 'revisedPrompt', 'reasons'],
  additionalProperties: false,
}

/** Model-facing task and evidence identity for one optimization run. */
export interface ExpertOptimizationTask {
  readonly prompt: ContentBlock[]
  readonly promptContext: UserMessage
  readonly evidenceSeqs: SessionSeq[]
}

function unavailable(sessionId: Agent['id'], reason: string): RemoteError<'expert/optimization-unavailable'> {
  return new RemoteError(
    'expert/optimization-unavailable',
    `无法优化会话“${sessionId}”的专家提示词：${reason}`,
    { sessionId, reason },
  )
}

function evidenceFor(
  agent: Agent,
  recent: readonly ExpertEvidenceMessage[],
  targetMessageId: MessageId,
): ExpertEvidenceMessage[] {
  const target = recent.findIndex(message => message.messageId === targetMessageId)
  if (target < 0) throw unavailable(agent.id, '所选回答不在当前证据窗口内')
  return recent.slice(0, target + 1).map(({ prompt: _prompt, messageId: _messageId, ...message }) => message)
}

function skillContent(): string {
  const skill = readFileSync(new URL('SKILL.md', SKILL_ROOT), 'utf8')
  const format = readFileSync(new URL('assets/output-format.md', SKILL_ROOT), 'utf8')
  return `${skill}\n\n<output-format>\n${format}\n</output-format>`
}

/**
 * Build the scoped runtime registration loaded by an explicit skill invocation.
 * @returns the bundled expert refinement skill with its resource directory.
 */
export function expertPromptRefinerRegistration(): SkillRegistration {
  return {
    name: EXPERT_PROMPT_REFINER_SKILL,
    description: '根据用户纠正与后续改好结果，对专家提示词做有证据的局部优化。',
    content: skillContent(),
    source: 'bundled',
    provider: 'agent-presets',
    invocation: { modelInvocable: false, userInvocable: true },
  }
}

/**
 * Frame one user-explicit skill invocation for a standard-mode child Agent.
 * @param agent - parent expert Agent whose evidence window is addressed.
 * @param expert - exact prompt version used by the selected answer.
 * @param recent - bounded visible human/assistant evidence.
 * @param targetMessageId - finalized answer ending the evidence window.
 * @returns the compact child prompt, injected context, and evidence sequences used by the run.
 */
export function buildExpertOptimizationTask(
  agent: Agent,
  expert: ExpertDocument,
  recent: readonly ExpertEvidenceMessage[],
  targetMessageId: MessageId,
): ExpertOptimizationTask {
  const evidence = evidenceFor(agent, recent, targetMessageId)
  const framed = JSON.stringify({ originalPrompt: expert.prompt, conversationEvidence: evidence })
  const task = [
    `/${EXPERT_PROMPT_REFINER_SKILL}`,
    '',
    '请根据已注入的专家提示词和对话证据，完成一次克制的局部优化。',
    '不要编辑文件。分析完成后，调用 structured_output 提交最终结果。',
    '新版提示词保持原语言；summary 和 reasons 必须使用简体中文。',
  ].join('\n')
  const context = `<expert-refinement-input>${framed}</expert-refinement-input>`
  return {
    prompt: [{ type: 'text', text: task }],
    promptContext: createUserMessage({
      content: [{ type: 'text', text: context }],
      source: { kind: 'plugin', plugin: EXPERT_PROMPT_REFINER_SKILL },
    }),
    evidenceSeqs: evidence.map(item => item.seq),
  }
}

function promptChange(originalPrompt: string, revisedPrompt: string, reason: string): ExpertPromptChange {
  const original = Array.from(originalPrompt)
  const revised = Array.from(revisedPrompt)
  let prefix = 0
  while (prefix < original.length && prefix < revised.length && original[prefix] === revised[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < original.length - prefix
    && suffix < revised.length - prefix
    && original[original.length - suffix - 1] === revised[revised.length - suffix - 1]
  ) suffix += 1
  return {
    before: original.slice(prefix, original.length - suffix).join(''),
    after: revised.slice(prefix, revised.length - suffix).join(''),
    reason,
  }
}

/**
 * Validate a child Agent's structured result and materialize the review proposal.
 * @param output - structured value captured from the standard-mode child.
 * @param proposalId - identity reserved before the child starts.
 * @param expert - exact source expert version.
 * @param targetMessageId - answer the run optimized through.
 * @param maxPromptBytes - deployment limit for the final candidate.
 * @returns the validated immutable proposal.
 */
export function expertProposalFromOutput(
  output: unknown,
  proposalId: ExpertProposalId,
  expert: ExpertDocument,
  targetMessageId: MessageId,
  maxPromptBytes: number,
): ExpertOptimizationProposal {
  const parsed = candidateSchema.safeParse(output)
  if (!parsed.success) throw new Error('专家提示词优化结果不符合结构化输出要求')
  const candidate = parsed.data
  if (Buffer.byteLength(candidate.revisedPrompt, 'utf8') > maxPromptBytes) {
    throw new Error(`专家提示词优化结果超过 ${String(maxPromptBytes)} UTF-8 字节`)
  }
  const usableRevision = candidate.revisedPrompt.trim().length === 0 ? expert.prompt : candidate.revisedPrompt
  const status = usableRevision === expert.prompt ? 'no-change' : 'changed'
  const summary = candidate.summary.trim()
    || (status === 'changed' ? '根据对话证据局部优化了专家提示词' : '现有证据不足，未修改专家提示词')
  const reason = [...new Set(candidate.reasons.map(item => item.trim()).filter(Boolean))].join('；') || summary
  const changes = status === 'changed' ? [promptChange(expert.prompt, usableRevision, reason)] : []
  return {
    proposalId,
    expertId: expert.id,
    targetMessageId,
    baseVersion: expert.currentVersion,
    originalPrompt: expert.prompt,
    status,
    summary,
    revisedPrompt: usableRevision,
    changes,
  }
}
