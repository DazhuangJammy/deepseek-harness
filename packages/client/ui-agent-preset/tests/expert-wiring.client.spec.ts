/** Expert registrations expose one controller through every contributed UI surface. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {
  ExpertDocument, ExpertOptimizationOutcome, ExpertProposalId,
} from '@deepseek-ai/dsh-agent-preset-registry/types'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { CommandContribution } from '@deepseek-ai/dsh-client-ui-commands/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { MessageId } from '@deepseek-ai/dsh-llm/brand'
import { SessionId } from '@deepseek-ai/dsh-session'
import { describe, expect, it, vi } from 'vitest'
import type { ExpertPanelInjected } from '../src/client/ExpertPanel.tsx'
import type { ExpertOptimizeActionInjected } from '../src/client/ExpertOptimizeAction.tsx'
import type { ExpertWelcomeInjected } from '../src/client/ExpertWelcome.tsx'
import { apply } from '../src/client/index.ts'

interface CapturedRegistration {
  options: Record<string, unknown>
  component: unknown
}

const sessionId = SessionId('expert-wiring')
const childSessionId = SessionId('expert-wiring-child')
const proposalId = brandString<ExpertProposalId>('expert-wiring-proposal')
const expert: ExpertDocument = {
  id: 'interview', name: 'Interview coach', welcome: 'Tell me the role.', prompt: 'Ask one question.',
  currentVersion: 1, updatedAt: 1, versions: [{ version: 1, createdAt: 1, summary: 'Initial', changes: [] }],
}

function translate(key: string, params?: Record<string, unknown>): string {
  if (key === 'expert.version') return `v${String(params?.version)}`
  if (key === 'expert.edit') return `Edit ${String(params?.name)}`
  return key
}

function harness() {
  const registrations: CapturedRegistration[] = []
  const commands: CommandContribution[] = []
  const openedTabs: string[] = []
  const calls: string[] = []
  const remoteEvents = new Map<string, (...args: unknown[]) => void>()
  const localEvents = new Map<string, (...args: unknown[]) => void>()
  const disposers: Array<() => void> = []
  const ok = <T>(value: T) => Promise.resolve({ ok: true as const, value })
  const failed = (message: string) => Promise.resolve({ ok: false as const, error: { message } })
  const agentPresets = {
    list: () => ok({
      presets: [{ id: 'standard', isDefault: true }],
    }),
    listExperts: () => { calls.push('listExperts'); return ok({ experts: [expert], authorable: true }) },
    readExpert: (id: string) => { calls.push(`read:${id}`); return ok(expert) },
    readExpertVersion: (id: string, version: number) => {
      calls.push(`version:${id}:${String(version)}`)
      return ok({
        version: expert.versions[0]!, previousVersion: null, previousPrompt: '', prompt: expert.prompt,
      })
    },
    createExpert: (id: string) => { calls.push(`create:${id}`); return ok({ ...expert, id }) },
    saveExpert: (_sid: SessionId, id: string) => { calls.push(`save:${id}`); return ok(expert) },
    select: (_sid: SessionId, id: string) => {
      calls.push(`select:${id}`)
      return id === 'reject' ? failed('selection refused') : ok(id)
    },
    optimizeExpert: (_sid: SessionId, messageId: MessageId) => {
      calls.push(`optimize:${messageId}`)
      return ok({ proposalId, childSessionId })
    },
    acceptExpertOptimization: () => { calls.push('accept'); return ok(expert) },
    dismissExpertOptimization: () => { calls.push('dismiss'); return ok(undefined) },
    read: () => ok({ agentPreset: 'standard', content: '' }),
    copy: () => ok(undefined),
    deletePreset: () => ok(undefined),
  }
  const settings = {
    canOpenAgentPresetDirectory: () => ok(true),
    describe: () => ok({ writable: true, hasDocument: true, namespaces: [] }),
    update: () => ok({}),
    openAgentPresetDirectory: () => ok({ opened: true as const }),
  }
  const context = {
    // Developer tools gate every selection surface this plugin registers.
    configForms: { developerTools: { enabled: createSnapshotStore(true) } },
    effect: (factory: () => unknown) => {
      const disposer = factory()
      if (typeof disposer === 'function') disposers.push(disposer as () => void)
      return disposer
    },
    inject: (_dependencies: readonly string[], callback: (scope: ClientContext) => void) => {
      callback(context as unknown as ClientContext)
    },
    on: (event: string, callback: (...args: unknown[]) => void) => {
      localEvents.set(event, callback)
      return () => { localEvents.delete(event) }
    },
    locale: { register: () => () => {}, bind: () => translate },
    remote: {
      agentPresets,
      settings,
      $on: (event: string, callback: (...args: unknown[]) => void) => {
        remoteEvents.set(event, callback)
        return () => { remoteEvents.delete(event) }
      },
    },
    slots: {
      inject: (_name: string, factory: () => unknown) => factory(),
      register: (options: Record<string, unknown>, component: unknown) => {
        const row = { options, component }
        registrations.push(row)
        return () => { registrations.splice(registrations.indexOf(row), 1) }
      },
    },
    commandUi: { register: (command: CommandContribution) => { commands.push(command); return () => {} } },
    sidebarRight: { openTab: (id: string) => { openedTabs.push(id) } },
    sidebarRightTabs: { register: () => () => {} },
    sessions: {
      list: { getSnapshot: () => ({ current: undefined, byId: {} }), subscribe: () => () => {} },
      retain: () => ({ ready: Promise.resolve({}), release: () => {} }),
    },
    uiWorkspace: { startSession: vi.fn() },
  }
  apply(context as unknown as ClientContext)
  return { context, registrations, commands, openedTabs, calls, remoteEvents, localEvents, disposers }
}

function registration(h: ReturnType<typeof harness>, name: string): CapturedRegistration {
  const found = h.registrations.find(row => row.options.name === name)
  if (found === undefined) throw new Error(`missing registration ${name}`)
  return found
}

describe('expert client wiring', () => {
  it('routes menu choices and secondary actions through the expert controller', async () => {
    const h = harness()
    const command = h.commands.find(row => row.name === 'experts')
    if (command?.ui.kind !== 'popupSelect') throw new Error('expert popup did not register')
    if (command.label === undefined || command.description === undefined) {
      throw new Error('expert popup labels are absent')
    }
    expect(command.label()).toBe('expert.menu')
    expect(command.description()).toBe('expert.menuHint')
    expect(command.available({} as never)).toBe(true)
    expect(command.icon).toBeTypeOf('function')

    const aborted = new AbortController()
    aborted.abort()
    await expect(command.ui.options({} as never, aborted.signal)).resolves.toEqual([])
    const options = await command.ui.options({} as never, new AbortController().signal)
    expect(options.map(row => row.id)).toEqual(['manage', 'create', 'select:interview'])
    // Every expert row carries the hover edit control beside its inline version.
    expect(options[2]).toMatchObject({
      label: 'Interview coach',
      detail: 'v1',
      detailPlacement: 'inline',
      secondaryAction: { label: 'Edit Interview coach' },
    })

    const session = { sessionId } as never
    await command.ui.onSelect({ id: 'create', label: 'create' }, session)
    await command.ui.onSelect({ id: 'manage', label: 'manage' }, session)
    await command.ui.onSelect({ id: 'ignored', label: 'ignored' }, session)
    await command.ui.onSelect({ id: 'select:interview', label: 'interview' }, session)
    await command.ui.onSelect({ id: 'select:reject', label: 'reject' }, session)
    await command.ui.onSecondaryAction?.({ id: 'ignored', label: 'ignored' }, session)
    await command.ui.onSecondaryAction?.({ id: 'select:interview', label: 'interview' }, session)

    expect(h.calls).toEqual(expect.arrayContaining([
      'select:interview', 'select:reject', 'read:interview',
    ]))
    expect(h.openedTabs.length).toBeGreaterThanOrEqual(4)
  })

  it('exposes Sidebar, welcome, action, and settlement callbacks over one store', async () => {
    const h = harness()
    const panel = registration(h, 'sidebar.right.pane.tab')
    expect(panel.options).toMatchObject({ key: '@deepseek-ai/dsh-client-ui-agent-preset/expert-prompt' })
    const panelInject = panel.options.inject as (id: SessionId) => ExpertPanelInjected
    const panelActions = panelInject(sessionId)
    expect(panelActions.childSession(sessionId)).toBeUndefined()
    await panelActions.load()
    panelActions.openList()
    panelActions.beginCreate()
    panelActions.patchDraft({ name: 'New expert', prompt: 'Prompt' })
    await panelActions.save()
    await panelActions.beginEdit('interview')
    await panelActions.openVersion(1)
    panelActions.closeVersion()
    panelActions.patchOptimization('Edited')
    await panelActions.accept()
    panelActions.dismissOptimization()

    const welcome = registration(h, 'conversation.input.dock')
    const welcomeInject = welcome.options.inject as () => ExpertWelcomeInjected
    await welcomeInject().load()

    const action = registration(h, 'conversation.chat.assistant-actions')
    const actionInject = action.options.inject as (id: SessionId) => ExpertOptimizeActionInjected
    actionInject(sessionId).optimize(MessageId('answer-1'))
    await vi.waitFor(() => { expect(h.calls).toContain('optimize:answer-1') })
    const outcome: ExpertOptimizationOutcome = {
      status: 'failed', error: 'child stopped',
    }
    h.remoteEvents.get('expert/optimization-settled')?.(sessionId, proposalId, outcome)
    h.localEvents.get('connection/reset')?.()
    await vi.waitFor(() => { expect(h.calls.filter(call => call === 'listExperts').length).toBeGreaterThan(1) })
  })

  it('disposes every registered effect', () => {
    const h = harness()
    expect(h.registrations.length).toBeGreaterThan(0)
    for (const dispose of h.disposers.reverse()) dispose()
    expect(h.remoteEvents.size).toBe(0)
    expect(h.localEvents.size).toBe(0)
  })
})
