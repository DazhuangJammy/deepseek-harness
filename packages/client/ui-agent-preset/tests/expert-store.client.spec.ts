/** Expert UI state keeps roster, editor, and Session-local refinement proposals coherent. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { ExpertDocument, ExpertOptimizationOutcome, ExpertProposalId } from '@deepseek-ai/dsh-agent-presets/types'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import { SessionId } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { ExpertUiController } from '../src/client/expert-store.ts'

const expert: ExpertDocument = {
  id: 'interview',
  name: 'Interview coach',
  welcome: 'Tell me the role.',
  prompt: 'Ask one question.',
  currentVersion: 1,
  updatedAt: 1,
  versions: [{ version: 1, createdAt: 1, summary: 'Initial version', changes: [] }],
}

const proposalId = brandString<ExpertProposalId>('proposal-1')
const childSessionId = SessionId('optimization-child')

/** Session-reference double for the current explicit retain lifecycle. */
function reference(ready: Promise<unknown> = Promise.resolve({})) {
  return { ready, release: () => {} }
}

function optimizationOutcome(
  messageId: MessageId,
  current: ExpertDocument = expert,
): Extract<ExpertOptimizationOutcome, { status: 'ready' }> {
  return {
    status: 'ready',
    proposal: {
      proposalId,
      expertId: current.id,
      targetMessageId: messageId,
      baseVersion: current.currentVersion,
      status: 'changed' as const,
      summary: 'Ask one at a time',
      originalPrompt: current.prompt,
      revisedPrompt: 'Ask one question at a time.',
      changes: [{ before: current.prompt, after: 'Ask one question at a time.', reason: 'The corrected answer worked.' }],
    },
  }
}

function fakeContext() {
  const calls: string[] = []
  let current = expert
  const ok = <T>(value: T) => Promise.resolve({ ok: true as const, value })
  const agentPresets = {
    listExperts: () => ok({ experts: [current], authorable: true }),
    readExpert: (id: string) => { calls.push(`read:${id}`); return ok(current) },
    readExpertVersion: (id: string, version: number) => {
      calls.push(`version:${id}:${String(version)}`)
      return ok({
        version: current.versions.find(item => item.version === version) ?? current.versions[0],
        previousVersion: version === 1 ? null : version - 1,
        previousPrompt: version === 1 ? '' : 'Ask one question.',
        prompt: current.prompt,
      })
    },
    createExpert: (id: string, name: string, welcome: string, prompt: string) => {
      calls.push(`create:${id}`)
      current = { ...expert, id, name, welcome, prompt }
      return ok(current)
    },
    saveExpert: (sessionId: SessionId, id: string, version: number, name: string, welcome: string, prompt: string) => {
      calls.push(`save:${sessionId}:${id}:${String(version)}`)
      const promptChanged = current.prompt !== prompt
      current = {
        ...current,
        name,
        welcome,
        prompt,
        currentVersion: promptChanged ? version + 1 : version,
        versions: promptChanged
          ? [{ version: version + 1, createdAt: 2, summary: 'Manual edit', changes: [] }, ...current.versions]
          : current.versions,
      }
      return ok(current)
    },
    select: (sessionId: SessionId, id: string) => { calls.push(`select:${sessionId}:${id}`); return ok(id) },
    optimizeExpert: (sessionId: SessionId, messageId: MessageId) => {
      calls.push(`optimize:${sessionId}:${messageId}`)
      return ok({ proposalId, childSessionId })
    },
    acceptExpertOptimization: (sessionId: SessionId, acceptedId: ExpertProposalId, revisedPrompt: string) => {
      calls.push(`accept:${sessionId}:${acceptedId}:${revisedPrompt}`)
      current = { ...current, prompt: revisedPrompt, currentVersion: current.currentVersion + 1 }
      return ok(current)
    },
    dismissExpertOptimization: (sessionId: SessionId, dismissedId: ExpertProposalId) => {
      calls.push(`dismiss:${sessionId}:${dismissedId}`)
      return ok(undefined)
    },
  }
  const sessions = {
    retain: () => reference(),
  }
  return { ctx: { remote: { agentPresets }, sessions } as unknown as ClientContext, calls }
}

describe('expert UI controller', () => {
  it('loads, edits, and saves through one version-aware document', async () => {
    const { ctx, calls } = fakeContext()
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('editor')

    await controller.load()
    await controller.beginEdit(sessionId, 'interview')
    controller.patchDraft({ prompt: 'Ask one question at a time.' })
    await controller.save(sessionId)

    expect(calls).toContain('read:interview')
    expect(calls).toContain('save:editor:interview:1')
    expect(controller.store.getSnapshot().editor).toMatchObject({
      kind: 'edit',
      document: { currentVersion: 2, prompt: 'Ask one question at a time.' },
      saving: false,
      saved: true,
    })
  })

  it('does not save an unchanged draft and resets Saved after the next edit', async () => {
    const { ctx, calls } = fakeContext()
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('editor-state')

    await controller.beginEdit(sessionId, 'interview')
    await controller.save(sessionId)
    expect(calls.some(call => call.startsWith('save:'))).toBe(false)

    controller.patchDraft({ welcome: 'Welcome back.' })
    await controller.save(sessionId)
    expect(controller.store.getSnapshot().editor).toMatchObject({
      kind: 'edit',
      document: { currentVersion: 1, versions: [{ version: 1 }] },
      saved: true,
    })

    controller.patchDraft({ icon: 'briefcase' })
    expect(controller.store.getSnapshot().editor).toMatchObject({ kind: 'edit', saved: false })
  })

  it('creates an expert with its hidden generated identifier', async () => {
    const { ctx, calls } = fakeContext()
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('create')

    controller.beginCreate(sessionId)
    const editor = controller.store.getSnapshot().editor
    expect(editor.kind).toBe('create')
    if (editor.kind !== 'create') throw new Error('create editor did not open')
    expect(editor.draft.id).toMatch(/^expert-[0-9a-f-]{36}$/u)
    controller.patchDraft({ name: 'Debt coach', prompt: 'Explain debt financing.' })
    await controller.save(sessionId)

    expect(calls).toContain(`create:${editor.draft.id}`)
  })

  it('loads one version comparison and returns to the unchanged editor draft', async () => {
    const { ctx, calls } = fakeContext()
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('history')

    await controller.beginEdit(sessionId, 'interview')
    controller.patchDraft({ prompt: 'Unsaved local draft.' })
    await controller.openVersion(1)

    expect(calls).toContain('version:interview:1')
    expect(controller.store.getSnapshot().editor).toMatchObject({
      kind: 'edit',
      draft: { prompt: 'Unsaved local draft.' },
      versionReview: { status: 'ready', comparison: { previousPrompt: '', prompt: 'Ask one question.' } },
    })
    controller.closeVersion()
    expect(controller.store.getSnapshot().editor).toMatchObject({
      kind: 'edit', draft: { prompt: 'Unsaved local draft.' }, versionReview: null,
    })
  })

  it('keeps optimization state under the addressed Session and clears it after acceptance', async () => {
    const { ctx, calls } = fakeContext()
    const controller = new ExpertUiController(ctx)
    const first = SessionId('first')
    const second = SessionId('second')
    const message = brandString<MessageId>('answer-1')

    await controller.optimize(first, message)
    controller.settleOptimization(first, proposalId, optimizationOutcome(message))

    expect(controller.store.getSnapshot().optimizations.get(first)).toMatchObject({ status: 'ready' })
    expect(controller.store.getSnapshot().optimizations.has(second)).toBe(false)

    controller.patchOptimization(first, 'Ask one precise question at a time.')
    await controller.accept(first)

    expect(calls).toContain('accept:first:proposal-1:Ask one precise question at a time.')
    expect(controller.store.getSnapshot().optimizations.has(first)).toBe(false)
    expect(controller.store.getSnapshot().editor).toMatchObject({ kind: 'edit', document: { currentVersion: 2 } })
  })

  it('leaves a settled optimization when opening create or the expert list', async () => {
    const { ctx } = fakeContext()
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('navigation')
    const message = brandString<MessageId>('answer-2')

    await controller.optimize(sessionId, message)
    controller.settleOptimization(sessionId, proposalId, optimizationOutcome(message))
    controller.beginCreate(sessionId)
    expect(controller.store.getSnapshot()).toMatchObject({ editor: { kind: 'create' } })
    expect(controller.store.getSnapshot().optimizations.has(sessionId)).toBe(false)

    await controller.optimize(sessionId, message)
    controller.settleOptimization(sessionId, proposalId, optimizationOutcome(message))
    controller.openList(sessionId)
    expect(controller.store.getSnapshot()).toMatchObject({ editor: { kind: 'list' } })
    expect(controller.store.getSnapshot().optimizations.has(sessionId)).toBe(false)
  })

  it('does not reopen optimization after navigation when an older request settles late', async () => {
    const message = brandString<MessageId>('answer-3')
    const pending = Promise.withResolvers<{ ok: true; value: { proposalId: ExpertProposalId; childSessionId: SessionId } }>()
    const ctx = {
      remote: {
        agentPresets: {
          optimizeExpert: () => pending.promise,
          dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
        },
      },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('late-navigation')
    const optimizing = controller.optimize(sessionId, message)

    controller.beginCreate(sessionId)
    pending.resolve({ ok: true, value: { proposalId, childSessionId } })
    await optimizing

    expect(controller.store.getSnapshot()).toMatchObject({ editor: { kind: 'create' } })
    expect(controller.store.getSnapshot().optimizations.has(sessionId)).toBe(false)
  })

  it('aborts an optimization start when the user stops it', async () => {
    const message = brandString<MessageId>('answer-stop')
    const pending = Promise.withResolvers<{
      ok: true
      value: { proposalId: ExpertProposalId; childSessionId: SessionId }
    }>()
    let signal: AbortSignal | undefined
    const ctx = {
      remote: {
        agentPresets: {
          optimizeExpert: (_sessionId: SessionId, _messageId: MessageId, operationSignal: AbortSignal) => {
            signal = operationSignal
            return pending.promise
          },
          dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
        },
      },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('stop-starting')
    const optimizing = controller.optimize(sessionId, message)

    controller.dismissOptimization(sessionId)
    expect(signal?.aborted).toBe(true)
    expect(controller.store.getSnapshot().optimizations.has(sessionId)).toBe(false)
    pending.resolve({ ok: true, value: { proposalId, childSessionId } })
    await optimizing
  })

  it('keeps a settlement that arrives while child Session observation is pending', async () => {
    const message = brandString<MessageId>('answer-4')
    const observation = Promise.withResolvers<object>()
    const observing = Promise.withResolvers<undefined>()
    const ctx = {
      remote: {
        agentPresets: {
          optimizeExpert: () => Promise.resolve({ ok: true as const, value: { proposalId, childSessionId } }),
          dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
        },
      },
      sessions: {
        retain: () => {
          observing.resolve(undefined)
          return reference(observation.promise)
        },
      },
    } as unknown as ClientContext
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('early-settlement')
    const optimizing = controller.optimize(sessionId, message)
    await observing.promise

    controller.settleOptimization(sessionId, proposalId, optimizationOutcome(message))
    expect(controller.store.getSnapshot().optimizations.get(sessionId)).toEqual({ status: 'starting' })

    observation.resolve({})
    await optimizing
    expect(controller.store.getSnapshot().optimizations.get(sessionId)).toMatchObject({
      status: 'ready',
      revisedPrompt: 'Ask one question at a time.',
    })
  })

  it('holds the refinement child generation only while the run is live', async () => {
    const sessionId = SessionId('expert-retain')
    const message = brandString<MessageId>('answer-retain')
    const releases: string[] = []
    const ctx = {
      remote: { agentPresets: {
        optimizeExpert: () => Promise.resolve({ ok: true as const, value: { proposalId, childSessionId } }),
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
      sessions: {
        retain: () => ({ ready: Promise.resolve({}), release: () => { releases.push('release') } }),
      },
    } as unknown as ClientContext
    const controller = new ExpertUiController(ctx)

    await controller.optimize(sessionId, message)
    expect(controller.childSession(sessionId)).toBeDefined()
    expect(releases).toEqual([])

    // The embedded view is the only holder, so a settled run returns the generation.
    controller.settleOptimization(sessionId, proposalId, optimizationOutcome(message))
    expect(controller.childSession(sessionId)).toBeUndefined()
    expect(releases).toEqual(['release'])

    // Teardown returns whatever a still-running refinement holds.
    await controller.optimize(sessionId, message)
    expect(controller.childSession(sessionId)).toBeDefined()
    controller.dispose()
    expect(controller.childSession(sessionId)).toBeUndefined()
    expect(releases).toEqual(['release', 'release'])
  })

  it('reports roster and editor read failures without discarding the shared controller', async () => {
    let listCalls = 0
    const ctx = {
      remote: { agentPresets: {
        listExperts: () => {
          listCalls += 1
          return Promise.resolve({ ok: false as const, error: { message: 'roster failed' } })
        },
        readExpert: () => Promise.resolve({ ok: false as const, error: { message: 'expert failed' } }),
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext
    const controller = new ExpertUiController(ctx)
    await controller.load()
    expect(controller.store.getSnapshot()).toMatchObject({ status: 'error', error: 'roster failed' })

    controller.store.set({ ...controller.store.getSnapshot(), status: 'loading' })
    await controller.load()
    expect(listCalls).toBe(1)

    await controller.beginEdit(SessionId('read-failure'), 'missing')
    expect(controller.store.getSnapshot()).toMatchObject({
      status: 'error', error: 'expert failed', editor: { kind: 'list' },
    })
  })

  it('ignores editor-only actions outside their routes and reports version failures', async () => {
    const pending = Promise.withResolvers<{ ok: true; value: ExpertDocument }>()
    const ctx = {
      remote: { agentPresets: {
        readExpert: () => pending.promise,
        readExpertVersion: () => Promise.resolve({ ok: false as const, error: { message: 'version failed' } }),
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
    } as unknown as ClientContext
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('route-guards')
    await controller.openVersion(1)
    controller.closeVersion()
    controller.patchDraft({ name: 'ignored' })
    await controller.save(sessionId)
    controller.patchOptimization(sessionId, 'ignored')
    await controller.accept(sessionId)

    const editing = controller.beginEdit(sessionId, 'interview')
    controller.beginCreate(sessionId)
    pending.resolve({ ok: true, value: expert })
    await editing
    expect(controller.store.getSnapshot().editor.kind).toBe('edit')

    await controller.openVersion(2)
    expect(controller.store.getSnapshot().editor).toMatchObject({
      kind: 'edit', versionReview: { status: 'failed', version: 2, error: 'version failed' },
    })
    controller.closeVersion()
    controller.closeVersion()
  })

  it('keeps a newer editor route when an older version read settles', async () => {
    const pending = Promise.withResolvers<{
      ok: true
      value: {
        version: ExpertDocument['versions'][number]
        previousVersion: null
        previousPrompt: string
        prompt: string
      }
    }>()
    const { ctx } = fakeContext()
    Object.assign(ctx.remote.agentPresets, { readExpertVersion: () => pending.promise })
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('stale-version')
    await controller.beginEdit(sessionId, 'interview')
    const opening = controller.openVersion(1)
    controller.beginCreate(sessionId)
    pending.resolve({
      ok: true,
      value: {
        version: expert.versions[0]!, previousVersion: null, previousPrompt: '', prompt: expert.prompt,
      },
    })
    await opening
    expect(controller.store.getSnapshot().editor.kind).toBe('create')
  })

  it('keeps form errors on failed saves and reports selection refusal', async () => {
    const ctx = {
      remote: { agentPresets: {
        createExpert: () => Promise.resolve({ ok: false as const, error: { message: 'create failed' } }),
        saveExpert: () => Promise.resolve({ ok: false as const, error: { message: 'save failed' } }),
        select: (_sessionId: SessionId, id: string) => id === 'ok'
          ? Promise.resolve({ ok: true as const, value: id })
          : Promise.resolve({ ok: false as const, error: { message: 'selection failed' } }),
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
    } as unknown as ClientContext
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('save-failure')

    controller.beginCreate(sessionId)
    controller.patchDraft({ name: 'Expert', prompt: 'Prompt' })
    await controller.save(sessionId)
    expect(controller.store.getSnapshot().editor).toMatchObject({ kind: 'create', saving: false, error: 'create failed' })

    controller.store.set({
      ...controller.store.getSnapshot(),
      editor: {
        kind: 'edit', document: expert, draft: {
          id: expert.id, name: expert.name, welcome: expert.welcome, prompt: expert.prompt, icon: undefined,
        }, saving: false, saved: false, error: null, versionReview: null,
      },
    })
    controller.patchDraft({ name: 'Changed expert' })
    await controller.save(sessionId)
    expect(controller.store.getSnapshot().editor).toMatchObject({ kind: 'edit', saving: false, error: 'save failed' })
    await expect(controller.select(sessionId, 'ok')).resolves.toBeUndefined()
    await expect(controller.select(sessionId, 'nope')).resolves.toBe('selection failed')
    expect(controller.store.getSnapshot()).toMatchObject({ status: 'error', error: 'selection failed' })
  })

  it('does not restore a failed save after the user leaves its editor', async () => {
    const pending = Promise.withResolvers<{ ok: false; error: { message: string } }>()
    const controller = new ExpertUiController({
      remote: { agentPresets: {
        createExpert: () => pending.promise,
        listExperts: () => Promise.resolve({ ok: true as const, value: { experts: [], authorable: true } }),
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
    } as unknown as ClientContext)
    const sessionId = SessionId('save-left-editor')
    controller.beginCreate(sessionId)
    controller.patchDraft({ name: 'Expert', prompt: 'Prompt' })
    const saving = controller.save(sessionId)
    controller.openList(sessionId)
    pending.resolve({ ok: false, error: { message: 'late save failure' } })
    await saving
    expect(controller.store.getSnapshot().editor.kind).toBe('list')
  })

  it('contains optimization startup, observation, and Host refusal failures', async () => {
    const message = brandString<MessageId>('answer-errors')
    const sessionId = SessionId('optimization-errors')
    const dismiss = () => Promise.resolve({ ok: true as const, value: undefined })
    const thrown = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => Promise.reject(new Error('transport failed')),
        dismissExpertOptimization: dismiss,
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext)
    await thrown.optimize(sessionId, message)
    expect(thrown.store.getSnapshot().optimizations.get(sessionId)).toMatchObject({
      status: 'failed', error: 'Error: transport failed',
    })

    const refused = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => Promise.resolve({ ok: false as const, error: { message: 'Host refused' } }),
        dismissExpertOptimization: dismiss,
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext)
    await refused.optimize(sessionId, message)
    expect(refused.store.getSnapshot().optimizations.get(sessionId)).toMatchObject({
      status: 'failed', error: 'Host refused',
    })

    const observeFailed = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => Promise.resolve({ ok: true as const, value: { proposalId, childSessionId } }),
        dismissExpertOptimization: dismiss,
      } },
      sessions: { retain: () => reference(Promise.reject(new Error('observe failed'))) },
    } as unknown as ClientContext)
    await observeFailed.optimize(sessionId, message)
    expect(observeFailed.store.getSnapshot().optimizations.get(sessionId)).toMatchObject({
      status: 'failed', error: 'Error: observe failed',
    })
  })

  it('retires results that arrive after startup or observation was dismissed', async () => {
    const sessionId = SessionId('late-result')
    const message = brandString<MessageId>('answer-late')
    const dismissCalls: string[] = []
    const start = Promise.withResolvers<{ ok: true; value: { proposalId: ExpertProposalId; childSessionId: SessionId } }>()
    const starting = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => start.promise,
        dismissExpertOptimization: (_sessionId: SessionId, id: ExpertProposalId) => {
          dismissCalls.push(id)
          return Promise.resolve({ ok: true as const, value: undefined })
        },
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext)
    const startingRun = starting.optimize(sessionId, message)
    starting.dismissOptimization(sessionId)
    start.resolve({ ok: true, value: { proposalId, childSessionId } })
    await startingRun

    const observation = Promise.withResolvers<object>()
    const observing = Promise.withResolvers<undefined>()
    const observed = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => Promise.resolve({ ok: true as const, value: { proposalId, childSessionId } }),
        dismissExpertOptimization: (_sessionId: SessionId, id: ExpertProposalId) => {
          dismissCalls.push(id)
          return Promise.resolve({ ok: true as const, value: undefined })
        },
      } },
      sessions: { retain: () => { observing.resolve(undefined); return reference(observation.promise) } },
    } as unknown as ClientContext)
    const observedRun = observed.optimize(sessionId, message)
    await observing.promise
    observed.dismissOptimization(sessionId)
    observation.resolve({})
    await observedRun
    expect(dismissCalls).toEqual([proposalId, proposalId])
  })

  it('ignores rejected or refused startup after that start was dismissed', async () => {
    const sessionId = SessionId('late-start-failure')
    const message = brandString<MessageId>('answer-late-failure')
    const rejected = Promise.withResolvers<never>()
    const rejectedController = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => rejected.promise,
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext)
    const rejectedRun = rejectedController.optimize(sessionId, message)
    rejectedController.dismissOptimization(sessionId)
    rejected.reject(new Error('late transport failure'))
    await rejectedRun
    expect(rejectedController.store.getSnapshot().optimizations.has(sessionId)).toBe(false)

    const refused = Promise.withResolvers<{ ok: false; error: { message: string } }>()
    const refusedController = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => refused.promise,
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext)
    const refusedRun = refusedController.optimize(sessionId, message)
    refusedController.dismissOptimization(sessionId)
    refused.resolve({ ok: false, error: { message: 'late refusal' } })
    await refusedRun
    expect(refusedController.store.getSnapshot().optimizations.has(sessionId)).toBe(false)
  })

  it('handles failed outcomes, stale settlements, acceptance failures, and replaced acceptance', async () => {
    const sessionId = SessionId('settlement-errors')
    const message = brandString<MessageId>('answer-settlement')
    const accepted = Promise.withResolvers<{ ok: true; value: ExpertDocument }>()
    const ctx = {
      remote: { agentPresets: {
        optimizeExpert: () => Promise.resolve({ ok: true as const, value: { proposalId, childSessionId } }),
        acceptExpertOptimization: () => accepted.promise,
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
        listExperts: () => Promise.resolve({ ok: true as const, value: { experts: [expert], authorable: true } }),
        readExpert: () => Promise.resolve({ ok: true as const, value: expert }),
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext
    const controller = new ExpertUiController(ctx)
    controller.settleOptimization(sessionId, proposalId, { status: 'failed', error: 'too early' })
    await controller.optimize(sessionId, message)
    controller.settleOptimization(sessionId, brandString<ExpertProposalId>('wrong'), {
      status: 'failed', error: 'wrong proposal',
    })
    controller.settleOptimization(sessionId, proposalId, { status: 'failed', error: 'child failed' })
    expect(controller.store.getSnapshot().optimizations.get(sessionId)).toMatchObject({ status: 'failed', error: 'child failed' })

    controller.dismissOptimization(sessionId)
    await controller.optimize(sessionId, message)
    controller.settleOptimization(sessionId, proposalId, optimizationOutcome(message))
    controller.patchOptimization(sessionId, 'Edited proposal')
    const accepting = controller.accept(sessionId)
    controller.dismissOptimization(sessionId)
    accepted.resolve({ ok: true, value: expert })
    await accepting
    expect(controller.store.getSnapshot().optimizations.has(sessionId)).toBe(false)

    const failure = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => Promise.resolve({ ok: true as const, value: { proposalId, childSessionId } }),
        acceptExpertOptimization: () => Promise.resolve({ ok: false as const, error: { message: 'accept failed' } }),
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext)
    await failure.optimize(sessionId, message)
    failure.settleOptimization(sessionId, proposalId, optimizationOutcome(message))
    await failure.accept(sessionId)
    expect(failure.store.getSnapshot().optimizations.get(sessionId)).toMatchObject({
      status: 'ready', accepting: false, error: 'accept failed',
    })
  })

  it('ignores a failed acceptance after its review was dismissed', async () => {
    const sessionId = SessionId('late-accept-failure')
    const message = brandString<MessageId>('answer-late-accept')
    const accepted = Promise.withResolvers<{ ok: false; error: { message: string } }>()
    const controller = new ExpertUiController({
      remote: { agentPresets: {
        optimizeExpert: () => Promise.resolve({ ok: true as const, value: { proposalId, childSessionId } }),
        acceptExpertOptimization: () => accepted.promise,
        dismissExpertOptimization: () => Promise.resolve({ ok: true as const, value: undefined }),
      } },
      sessions: { retain: () => reference() },
    } as unknown as ClientContext)
    await controller.optimize(sessionId, message)
    controller.settleOptimization(sessionId, proposalId, optimizationOutcome(message))
    const accepting = controller.accept(sessionId)
    controller.dismissOptimization(sessionId)
    accepted.resolve({ ok: false, error: { message: 'late accept failure' } })
    await accepting
    expect(controller.store.getSnapshot().optimizations.has(sessionId)).toBe(false)
  })

  it('dismisses every proposal-bearing optimization state', () => {
    const { ctx, calls } = fakeContext()
    const controller = new ExpertUiController(ctx)
    const sessionId = SessionId('dismiss-states')
    const ready = optimizationOutcome(brandString<MessageId>('answer')).proposal
    for (const state of [
      { status: 'running' as const, proposalId, childSessionId },
      { status: 'ready' as const, proposal: ready, revisedPrompt: ready.revisedPrompt, accepting: false, error: null },
      { status: 'failed' as const, error: 'failed', proposalId },
      { status: 'failed' as const, error: 'failed' },
    ]) {
      controller.store.set({
        ...controller.store.getSnapshot(), optimizations: new Map([[sessionId, state]]),
      })
      controller.dismissOptimization(sessionId)
    }
    expect(calls.filter(call => call.startsWith('dismiss:'))).toHaveLength(3)
  })
})
