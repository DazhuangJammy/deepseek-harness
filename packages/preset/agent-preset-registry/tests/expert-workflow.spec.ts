/** Expert refinement coordinates a standard child and installs the reviewed result. */

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import AgentRegistry, { assembleContextFor, type Agent, type AgentHandle } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import {
  createAssistantMessage, createSystemMessage, createUserMessage, LlmRuntime,
  type ContentBlock,
} from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as Persona from '@deepseek-ai/dsh-persona'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { brandString } from '@deepseek-ai/dsh-brand'
import { MessageId } from '@deepseek-ai/dsh-llm/brand'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AgentPresets from '../src/index.ts'
import type { ExpertOptimizationOutcome, ExpertProposalId } from '../src/types.ts'

const roots: string[] = []
const contexts: Context[] = []

afterEach(async () => {
  await Promise.allSettled(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function createAgent(ctx: Context, sessionId: string, preset: string): Promise<AgentHandle> {
  return ctx.agents.create({
    sessionId: SessionId(sessionId),
    setup: async agentCtx => void await ctx.agentPresets.mount(agentCtx, preset),
  })
}

function output(structured: unknown): { output: ContentBlock[]; structured: unknown; stopReason: string } {
  return { output: [], structured, stopReason: 'completed' }
}

interface ChildRunDouble {
  id: SessionId
  result: Promise<{
    output: ContentBlock[]
    structured?: unknown
    stopReason: string
    diagnostic?: string
  }>
  dispose(): Promise<void>
}

async function workflowHarness(
  start: (request: Record<string, unknown>) => Promise<ChildRunDouble>,
  icon?: 'briefcase',
): Promise<Context> {
  const userRoot = await mkdtemp(join(tmpdir(), 'dsh-expert-errors-'))
  roots.push(userRoot)
  const ctx = new Context()
  contexts.push(ctx)
  ctx.baseUrl = pathToFileURL(join(process.cwd(), 'packages/preset/agent-preset-registry/src/index.ts')).href
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  ctx.loader.builtins['@deepseek-ai/dsh-persona'] = Persona
  for (const name of ['shell', 'shellEnv', 'fs', 'subprocess']) ctx.provide(name as never, {} as never)
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(SystemPrompt, { personaPrefix: '' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  ctx.provide('subagents' as never, {
    start: (_provider: string, request: Record<string, unknown>) => start(request),
  } as never)
  await ctx.plugin(AgentPresets, {
    default: 'standard', roots: [{ path: userRoot, trust: 'user' }],
  })
  await ctx.agentPresets.remoteExportCreateExpert(
    'interview', 'Interview coach', 'Tell me the role.', 'Ask one question.', icon,
  )
  return ctx
}

function appendAnswer(agent: AgentHandle['agent'], prompt = 'Ask one question.'): MessageId {
  const answer = createAssistantMessage({
    content: [{ type: 'text', text: 'What system did you scale?' }],
    source: { provider: 'mock', model: 'selected-model' },
  })
  agent.session.append('turn/start', { turn: 1 })
  agent.session.append('system/message', {
    turn: 1, step: 1, message: createSystemMessage(prompt),
  }, { surfaceOp: 'append' })
  agent.session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: 'Ask a focused question.' }], source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  agent.session.append('assistant/message', {
    turn: 1, step: 1, message: answer, stream: [],
  }, { surfaceOp: 'append' })
  agent.session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  return answer.id
}

describe('expert optimization workflow', () => {
  it('runs standard mode and installs the human-edited candidate for current and later Sessions', async () => {
    const userRoot = await mkdtemp(join(tmpdir(), 'dsh-expert-workflow-'))
    roots.push(userRoot)
    await mkdir(userRoot, { recursive: true })
    const ctx = new Context()
    contexts.push(ctx)
    ctx.baseUrl = pathToFileURL(join(process.cwd(), 'packages/preset/agent-preset-registry/src/index.ts')).href
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    ctx.loader.builtins['@deepseek-ai/dsh-persona'] = Persona
    // This spec never executes file tools, but their real plugins must reach
    // ready state before the managed expert composition can mount.
    for (const name of ['shell', 'shellEnv', 'fs', 'subprocess']) {
      ctx.provide(name as never, {} as never)
    }
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(SystemPrompt, { personaPrefix: '' })
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(AgentLoop, { agents: [] })

    const childResult = Promise.withResolvers<{ output: ContentBlock[]; stopReason: string }>()
    const disposeChild = vi.fn(() => Promise.resolve())
    const abandonedResult = Promise.withResolvers<{ output: ContentBlock[]; stopReason: string }>()
    const disposeAbandoned = vi.fn(() => {
      abandonedResult.resolve({ output: [], stopReason: 'aborted' })
      return Promise.resolve()
    })
    const childRuns = [
      { id: SessionId('optimizer-child'), result: childResult.promise, dispose: disposeChild },
      { id: SessionId('abandoned-child'), result: abandonedResult.promise, dispose: disposeAbandoned },
    ]
    const startRequests: Record<string, unknown>[] = []
    ctx.provide('subagents' as never, {
      start: (_provider: string, request: Record<string, unknown>) => {
        startRequests.push(request)
        const run = childRuns[startRequests.length - 1]
        if (run === undefined) throw new Error('unexpected extra optimization run')
        return Promise.resolve(run)
      },
    } as never)
    await ctx.plugin(AgentPresets, {
      default: 'standard',
      roots: [{ path: userRoot, trust: 'user' }],
    })
    await ctx.agentPresets.remoteExportCreateExpert(
      'interview',
      'Interview coach',
      'Tell me the role.',
      'Ask one question.',
    )
    const parentHandle = await createAgent(ctx, 'expert-parent', 'interview')
    const parent = parentHandle.agent
    const answer = createAssistantMessage({
      content: [
        { type: 'reasoning', text: 'Private workflow reasoning must not reach refinement.' },
        { type: 'text', text: 'What system did you scale?' },
      ],
      source: { provider: 'mock', model: 'selected-model' },
    })
    parent.session.append('turn/start', { turn: 1 })
    parent.session.append('system/message', {
      turn: 1,
      step: 1,
      message: createSystemMessage('Ask one question.'),
    }, { surfaceOp: 'append' })
    parent.session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'Ask a focused question.' }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    parent.session.append('assistant/message', {
      turn: 1,
      step: 1,
      message: answer,
      stream: [{
        type: 'reasoning-chunks', time0: 1, index: 0, dt: [],
        texts: ['Private workflow reasoning must not reach refinement.'],
      }],
    }, { surfaceOp: 'append' })
    parent.session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
    const branchSeed = parent.session.snapshotEvents()
    const untouchedHandle = await createAgent(ctx, 'expert-untouched', 'interview')

    const settled = Promise.withResolvers<ExpertOptimizationOutcome>()
    const outcomes: ExpertOptimizationOutcome[] = []
    ctx.on('expert/optimization-settled', (_sessionId, _proposalId, outcome) => {
      outcomes.push(outcome)
      settled.resolve(outcome)
    })
    const run = await ctx.agentPresets.remoteExportOptimizeExpert(
      parent.id,
      answer.id,
      new AbortController().signal,
    )

    expect(run.childSessionId).toBe('optimizer-child')
    expect(startRequests[0]).toMatchObject({
      agentPreset: 'standard',
      promptContext: { source: { kind: 'expert-refinement' } },
      outputSchema: { type: 'object', required: ['summary', 'revisedPrompt', 'reasons'] },
    })
    expect(startRequests[0]).not.toHaveProperty('agentOptions')
    expect(startRequests[0]).not.toHaveProperty('persona')
    const promptContext = startRequests[0]?.['promptContext'] as { content: ContentBlock[] }
    const promptContextText = promptContext.content[0]?.type === 'text' ? promptContext.content[0].text : ''
    expect(promptContextText).toContain('"originalPrompt":"Ask one question."')
    expect(promptContextText).toContain('"text":"What system did you scale?"')
    expect(promptContextText).not.toContain('Private workflow reasoning must not reach refinement.')
    const prompt = (startRequests[0]?.['prompt'] as ContentBlock[] | undefined)?.[0]
    expect(prompt?.type === 'text' ? prompt.text.startsWith('/expert-prompt-refiner\n') : false).toBe(true)
    expect(prompt?.type === 'text' ? prompt.text.includes('Ask one question.') : true).toBe(false)

    childResult.resolve(output({
      summary: '让问题更聚焦',
      revisedPrompt: 'Ask one focused question.',
      reasons: ['用户纠正后，聚焦提问产生了更好的结果。'],
    }))
    const outcome = await settled.promise
    expect(outcome.status).toBe('ready')
    if (outcome.status !== 'ready') throw new Error('optimization did not produce a proposal')
    await ctx.agentPresets.remoteExportAcceptExpertOptimization(
      parent.id,
      outcome.proposal.proposalId,
      'Ask one precise question.',
    )

    const optimized = await ctx.agentPresets.remoteExportReadExpert('interview')
    expect(optimized).toMatchObject({ currentVersion: 2, prompt: 'Ask one precise question.' })
    const optimizedPrompt = await ctx.systemPrompt.assemble(assembleContextFor(parent))
    expect(optimizedPrompt.sections.map(section => section.text).join('\n')).toContain('Ask one precise question.')
    const edited = await ctx.agentPresets.remoteExportSaveExpert(
      parent.id,
      'interview',
      2,
      'Interview coach',
      'Tell me the role.',
      'Ask one precise question at a time.',
    )
    expect(edited).toMatchObject({ currentVersion: 3, prompt: 'Ask one precise question at a time.' })
    const currentPrompt = await ctx.systemPrompt.assemble(assembleContextFor(parent))
    expect(currentPrompt.sections.map(section => section.text).join('\n'))
      .toContain('Ask one precise question at a time.')
    const untouchedPrompt = await ctx.systemPrompt.assemble(assembleContextFor(untouchedHandle.agent))
    expect(untouchedPrompt.sections.map(section => section.text).join('\n')).toContain('Ask one question.')
    const laterHandle = await createAgent(ctx, 'expert-later', 'interview')
    const laterPrompt = await ctx.systemPrompt.assemble(assembleContextFor(laterHandle.agent))
    expect(laterPrompt.sections.map(section => section.text).join('\n'))
      .toContain('Ask one precise question at a time.')
    const branchHandle = await ctx.agents.create({
      sessionId: SessionId('expert-branch'),
      seed: branchSeed,
      inheritedEventCount: SessionLogOffset(branchSeed.length),
      meta: {
        parentSession: parent.id,
        isSeeded: true,
        agentPreset: 'interview',
      },
      setup: async (agentCtx, agent) => {
        await ctx.agentPresets.mount(agentCtx, 'interview')
        await ctx.agentPresets.applyLatestExpertPromptForBranch(agent)
      },
    })
    const branchPrompt = await ctx.systemPrompt.assemble(assembleContextFor(branchHandle.agent))
    expect(branchPrompt.sections.map(section => section.text).join('\n'))
      .toContain('Ask one precise question at a time.')
    expect(ctx.sessionProjections.stateOf(branchHandle.agent.session, 'expertRefinement')).toMatchObject({
      activePrompt: 'Ask one question.',
      appliedPrompt: 'Ask one precise question at a time.',
      appliedVersion: 3,
    })
    expect(branchHandle.agent.session.snapshotEvents().findLast(event => event.type === 'expert/prompt-applied'))
      .toMatchObject({
        data: {
          expertId: 'interview',
          version: 3,
          prompt: 'Ask one precise question at a time.',
          source: 'branch-latest',
        },
      })
    expect(ctx.sessionProjections.stateOf(parent.session, 'expertRefinement')).toMatchObject({
      activePrompt: 'Ask one question.',
      appliedPrompt: 'Ask one precise question at a time.',
      appliedVersion: 3,
    })
    const appliedPrompts = parent.session.snapshotEvents().flatMap(event =>
      event.type === 'expert/prompt-applied' ? [event.data] : [])
    expect(appliedPrompts).toEqual([
      {
        expertId: 'interview',
        version: 2,
        prompt: 'Ask one precise question.',
        source: 'optimization-accepted',
      },
      {
        expertId: 'interview',
        version: 3,
        prompt: 'Ask one precise question at a time.',
        source: 'manual-save',
      },
    ])
    expect(disposeChild).toHaveBeenCalledTimes(1)

    const abandoned = await ctx.agentPresets.remoteExportOptimizeExpert(
      parent.id,
      answer.id,
      new AbortController().signal,
    )
    expect(abandoned.childSessionId).toBe('abandoned-child')
    await ctx.agentPresets.remoteExportDismissExpertOptimization(parent.id, abandoned.proposalId)
    await abandonedResult.promise
    await Promise.resolve()
    expect(disposeAbandoned).toHaveBeenCalledTimes(1)
    expect(outcomes).toHaveLength(1)

    await branchHandle.dispose()
    await laterHandle.dispose()
    await untouchedHandle.dispose()
    await parentHandle.dispose()
  })

  it('rejects missing Agent, preset, answer, and stored prompt version', async () => {
    const ctx = await workflowHarness(() => Promise.reject(new Error('must not start')))
    const signal = new AbortController().signal
    await expect(ctx.agentPresets.remoteExportOptimizeExpert(
      SessionId('missing-agent'), MessageId('answer'), signal,
    )).rejects.toThrow(/no live Agent/)

    const bare = await ctx.agents.create({ sessionId: SessionId('bare-agent') })
    await expect(ctx.agentPresets.remoteExportOptimizeExpert(
      bare.agent.id, MessageId('answer'), signal,
    )).rejects.toThrow(/uses no Agent preset/)

    const missingAnswer = await createAgent(ctx, 'missing-answer', 'interview')
    await expect(ctx.agentPresets.remoteExportOptimizeExpert(
      missingAnswer.agent.id, MessageId('answer'), signal,
    )).rejects.toThrow(/has no logged expert prompt/)

    const externalPrompt = await createAgent(ctx, 'external-prompt', 'interview')
    const answerId = appendAnswer(externalPrompt.agent, 'Externally edited prompt')
    await expect(ctx.agentPresets.remoteExportOptimizeExpert(
      externalPrompt.agent.id, answerId, signal,
    )).rejects.toThrow(/has no stored version/)
  })

  it('preserves Remote startup failures and wraps unexpected startup errors', async () => {
    let failure: Error = new Error('subagent failed')
    const ctx = await workflowHarness(() => Promise.reject(failure))
    const parent = await createAgent(ctx, 'startup-errors', 'interview')
    const answerId = appendAnswer(parent.agent)
    await expect(ctx.agentPresets.remoteExportOptimizeExpert(
      parent.agent.id, answerId, new AbortController().signal,
    )).rejects.toThrow(/subagent failed/)

    const remote = new RemoteError(
      'expert/optimization-unavailable', 'provider refused',
      { sessionId: parent.agent.id, reason: 'provider refused' },
    )
    failure = remote
    await expect(ctx.agentPresets.remoteExportOptimizeExpert(
      parent.agent.id, answerId, new AbortController().signal,
    )).rejects.toBe(remote)
  })

  it('keeps the standard child running beyond the former refinement deadline', async () => {
    const result = Promise.withResolvers<{ output: ContentBlock[]; stopReason: string }>()
    let childSignal: AbortSignal | undefined
    const ctx = await workflowHarness((request) => {
      childSignal = request['signal'] as AbortSignal
      return Promise.resolve({
        id: SessionId('unbounded-child'),
        result: result.promise,
        dispose: () => {
          result.resolve({ output: [], stopReason: 'aborted' })
          return Promise.resolve()
        },
      })
    })
    const parent = await createAgent(ctx, 'unbounded-parent', 'interview')
    const answerId = appendAnswer(parent.agent)

    vi.useFakeTimers()
    try {
      const run = await ctx.agentPresets.remoteExportOptimizeExpert(
        parent.agent.id, answerId, new AbortController().signal,
      )
      await vi.advanceTimersByTimeAsync(120_001)
      expect(childSignal?.aborted).toBe(false)
      await ctx.agentPresets.remoteExportDismissExpertOptimization(parent.agent.id, run.proposalId)
    } finally {
      vi.useRealTimers()
    }
  })

  it('turns incomplete child settlements into reviewable failures', async () => {
    const runs: ChildRunDouble[] = [
      {
        id: SessionId('no-structured'), result: Promise.resolve({ output: [], stopReason: 'completed' }),
        dispose: () => Promise.reject(new Error('dispose failed')),
      },
      {
        id: SessionId('aborted'), result: Promise.resolve({ output: [], stopReason: 'aborted' }),
        dispose: () => Promise.resolve(),
      },
      {
        id: SessionId('diagnostic'),
        result: Promise.resolve({ output: [], stopReason: 'failed', diagnostic: 'child diagnostic' }),
        dispose: () => Promise.resolve(),
      },
    ]
    const ctx = await workflowHarness(() => {
      const run = runs.shift()
      if (run === undefined) throw new Error('unexpected run')
      return Promise.resolve(run)
    })
    const parent = await createAgent(ctx, 'settlement-errors', 'interview')
    const answerId = appendAnswer(parent.agent)
    const outcomes: ExpertOptimizationOutcome[] = []
    ctx.on('expert/optimization-settled', (_sid, _proposal, outcome) => { outcomes.push(outcome) })

    for (const expected of ['未返回结构化结果', '已停止：aborted', 'child diagnostic']) {
      const run = await ctx.agentPresets.remoteExportOptimizeExpert(
        parent.agent.id, answerId, new AbortController().signal,
      )
      await vi.waitFor(() => { expect(outcomes.length).toBeGreaterThan(0) })
      const outcome = outcomes.shift()
      expect(outcome?.status).toBe('failed')
      if (outcome?.status !== 'failed') throw new Error('expected failed optimization outcome')
      expect(outcome.error).toContain(expected)
      await ctx.agentPresets.remoteExportDismissExpertOptimization(parent.agent.id, run.proposalId)
    }
  })

  it('rejects unavailable, running, no-change, and reverted proposals before saving', async () => {
    const pending = Promise.withResolvers<{
      output: ContentBlock[]
      structured?: unknown
      stopReason: string
    }>()
    const noChange = Promise.resolve(output({
      summary: 'No change', revisedPrompt: 'Ask one question.', reasons: [],
    }))
    const changed = Promise.resolve(output({
      summary: 'Focus', revisedPrompt: 'Ask one focused question.', reasons: ['evidence'],
    }))
    const runs = [pending.promise, noChange, changed]
    const ctx = await workflowHarness(() => {
      const result = runs.shift()
      if (result === undefined) throw new Error('unexpected run')
      return Promise.resolve({
        id: SessionId(`proposal-${String(runs.length)}`), result, dispose: () => Promise.resolve(),
      })
    }, 'briefcase')
    const parent = await createAgent(ctx, 'proposal-errors', 'interview')
    const answerId = appendAnswer(parent.agent)
    const signal = new AbortController().signal
    await expect(ctx.agentPresets.remoteExportAcceptExpertOptimization(
      parent.agent.id, brandString<ExpertProposalId>('missing'), 'Prompt',
    )).rejects.toThrow(/no longer available/)

    const running = await ctx.agentPresets.remoteExportOptimizeExpert(parent.agent.id, answerId, signal)
    await expect(ctx.agentPresets.remoteExportAcceptExpertOptimization(
      SessionId('wrong-parent'), running.proposalId, 'Prompt',
    )).rejects.toThrow(/no longer available/)
    await expect(ctx.agentPresets.remoteExportAcceptExpertOptimization(
      parent.agent.id, running.proposalId, 'Prompt',
    )).rejects.toThrow(/still running/)
    await ctx.agentPresets.remoteExportDismissExpertOptimization(SessionId('wrong-parent'), running.proposalId)
    await ctx.agentPresets.remoteExportDismissExpertOptimization(
      parent.agent.id, brandString<ExpertProposalId>('missing'),
    )
    await ctx.agentPresets.remoteExportDismissExpertOptimization(parent.agent.id, running.proposalId)
    pending.resolve({ output: [], stopReason: 'aborted' })

    const outcomes: ExpertOptimizationOutcome[] = []
    ctx.on('expert/optimization-settled', (_sid, _proposal, outcome) => { outcomes.push(outcome) })
    const unchanged = await ctx.agentPresets.remoteExportOptimizeExpert(parent.agent.id, answerId, signal)
    await vi.waitFor(() => { expect(outcomes.length).toBe(1) })
    await expect(ctx.agentPresets.remoteExportAcceptExpertOptimization(
      parent.agent.id, unchanged.proposalId, 'Ask one focused question.',
    )).rejects.toThrow(/no-change proposal/)
    await ctx.agentPresets.remoteExportDismissExpertOptimization(parent.agent.id, unchanged.proposalId)

    const revision = await ctx.agentPresets.remoteExportOptimizeExpert(parent.agent.id, answerId, signal)
    await vi.waitFor(() => { expect(outcomes.length).toBe(2) })
    await expect(ctx.agentPresets.remoteExportAcceptExpertOptimization(
      parent.agent.id, revision.proposalId, 'Ask one question.',
    )).rejects.toThrow(/has no change to save/)
    const get = vi.spyOn(ctx.agents, 'get').mockReturnValueOnce(undefined)
    const saved = await ctx.agentPresets.remoteExportAcceptExpertOptimization(
      parent.agent.id, revision.proposalId, 'Ask one focused question.',
    )
    expect(saved).toMatchObject({ currentVersion: 2, icon: 'briefcase' })
    get.mockRestore()
  })

  it('retires the previous run, then retires current work on Agent and plugin disposal', async () => {
    const results = [Promise.withResolvers<{ output: ContentBlock[]; stopReason: string }>(),
      Promise.withResolvers<{ output: ContentBlock[]; stopReason: string }>(),
      Promise.withResolvers<{ output: ContentBlock[]; stopReason: string }>()]
    const firstDispose = vi.fn()
    const secondDispose = vi.fn()
    const thirdDispose = vi.fn()
    const disposalQueue = [firstDispose, secondDispose, thirdDispose]
    const ctx = await workflowHarness(() => {
      const result = results.shift()
      const dispose = disposalQueue.shift()
      if (result === undefined || dispose === undefined) throw new Error('unexpected run')
      return Promise.resolve({
        id: SessionId(`lifecycle-${String(results.length)}`), result: result.promise,
        dispose: async () => { dispose(); result.resolve({ output: [], stopReason: 'aborted' }) },
      })
    })
    const firstParent = await createAgent(ctx, 'replacement-parent', 'interview')
    const firstAnswer = appendAnswer(firstParent.agent)
    await ctx.agentPresets.remoteExportOptimizeExpert(
      firstParent.agent.id, firstAnswer, new AbortController().signal,
    )
    await ctx.agentPresets.remoteExportOptimizeExpert(
      firstParent.agent.id, firstAnswer, new AbortController().signal,
    )
    expect(firstDispose).toHaveBeenCalledTimes(1)
    await firstParent.dispose()
    await vi.waitFor(() => { expect(secondDispose).toHaveBeenCalledTimes(1) })

    const secondParent = await createAgent(ctx, 'plugin-disposal-parent', 'interview')
    const secondAnswer = appendAnswer(secondParent.agent)
    await ctx.agentPresets.remoteExportOptimizeExpert(
      secondParent.agent.id, secondAnswer, new AbortController().signal,
    )
    await ctx.fiber.dispose()
    expect(thirdDispose).toHaveBeenCalledTimes(1)
  })

  it('keeps retirement idempotent without deleting a newer Session index', async () => {
    const ctx = await workflowHarness(() => Promise.reject(new Error('unused')))
    const oldId = brandString<ExpertProposalId>('old-proposal')
    const currentId = brandString<ExpertProposalId>('current-proposal')
    const parentId = SessionId('retirement-map')
    const dispose = vi.fn(() => Promise.resolve())
    const held = {
      sessionId: parentId,
      run: { id: SessionId('retirement-child'), result: Promise.resolve(output({})), dispose },
    }
    const internals = ctx.agentPresets as unknown as {
      expertProposals: Map<ExpertProposalId, typeof held>
      expertProposalBySession: Map<SessionId, ExpertProposalId>
      retireExpertOptimization(id: ExpertProposalId): Promise<void>
    }

    await internals.retireExpertOptimization(oldId)
    internals.expertProposals.set(oldId, held)
    internals.expertProposalBySession.set(parentId, currentId)
    await internals.retireExpertOptimization(oldId)

    expect(internals.expertProposalBySession.get(parentId)).toBe(currentId)
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('scopes the refinement skill to its child instead of the deployment catalog', async () => {
    const started: { registry?: Context } = {}
    const children: Agent[] = []
    const ctx = await workflowHarness(async (request) => {
      const parent = request['parent'] as Agent
      const handle = await started.registry!.agents.create({
        sessionId: SessionId(`refinement-child-${children.length}`),
        parentAgent: parent,
        meta: { parentSession: parent.session.header.id, origin: 'subagent' },
        setup: async agentCtx => void await started.registry!.agentPresets.mount(agentCtx, 'interview'),
      })
      children.push(handle.agent)
      return { id: handle.agent.id, result: Promise.resolve(output({})), dispose: () => Promise.resolve() }
    })
    started.registry = ctx
    const parent = await createAgent(ctx, 'expert-parent', 'interview')
    const answerId = appendAnswer(parent.agent)

    await ctx.agentPresets.remoteExportOptimizeExpert(
      SessionId('expert-parent'), answerId, new AbortController().signal,
    )

    const catalog = async (scope?: Agent): Promise<string[]> => {
      const skills = scope === undefined
        ? await ctx.skills.list({ cwd: process.cwd() })
        : await ctx.skills.list({ cwd: process.cwd(), scope })
      return skills.map(skill => skill.name)
    }
    expect(await catalog()).not.toContain('expert-prompt-refiner')
    const refinementChild = children[0]
    if (refinementChild === undefined) throw new Error('the refinement child was not created')
    expect(await catalog(refinementChild)).toContain('expert-prompt-refiner')

    // A sibling subagent of the same expert starts outside a refinement window.
    const sibling = await ctx.agents.create({
      sessionId: SessionId('sibling-child'),
      parentAgent: parent.agent,
      meta: { parentSession: parent.agent.session.header.id, origin: 'subagent' },
      setup: async agentCtx => void await ctx.agentPresets.mount(agentCtx, 'interview'),
    })
    expect(await catalog(sibling.agent)).not.toContain('expert-prompt-refiner')
  })
})
