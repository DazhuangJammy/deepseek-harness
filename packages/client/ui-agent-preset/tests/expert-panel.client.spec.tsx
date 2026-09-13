// @vitest-environment jsdom
/** Expert editor form omits host-owned internal identity. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { ExpertProposalId } from '@deepseek-ai/dsh-agent-presets/types'
import { MessageId } from '@deepseek-ai/dsh-llm/brand'
import { SessionId } from '@deepseek-ai/dsh-session'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { ExpertPanel, type ExpertPanelProps } from '../src/client/ExpertPanel.tsx'
import type { ExpertUiState } from '../src/client/expert-store.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

function panelProps(state: ExpertUiState, overrides: Partial<ExpertPanelProps> = {}): ExpertPanelProps {
  return {
    sessionId: SessionId('expert-panel'),
    useExpertUi: (selector: (value: ExpertUiState) => unknown) => selector(state),
    load: vi.fn(() => Promise.resolve()), openList: vi.fn(), beginCreate: vi.fn(), beginEdit: vi.fn(() => Promise.resolve()),
    openVersion: vi.fn(() => Promise.resolve()), closeVersion: vi.fn(), patchDraft: vi.fn(),
    patchOptimization: vi.fn(), save: vi.fn(() => Promise.resolve()), accept: vi.fn(() => Promise.resolve()),
    dismissOptimization: vi.fn(), FixedSessionSlotView: () => null,
    t: makeTranslate(zh, commonZh), ...overrides,
  } as unknown as ExpertPanelProps
}

describe('expert panel', () => {
  it('keeps the version beside the expert name and Edit as the final row action', () => {
    const state: ExpertUiState = {
      status: 'ready',
      error: null,
      authorable: true,
      experts: [{ id: 'expert-1', name: 'Interview coach', welcome: 'Tell me the role.', currentVersion: 3, updatedAt: 1 }],
      editor: { kind: 'list' },
      optimizations: new Map(),
    }
    const props = {
      sessionId: SessionId('expert-list'),
      useExpertUi: (selector: (value: ExpertUiState) => unknown) => selector(state),
      load: vi.fn(), openList: vi.fn(), beginCreate: vi.fn(), beginEdit: vi.fn(),
      openVersion: vi.fn(), closeVersion: vi.fn(),
      patchDraft: vi.fn(), patchOptimization: vi.fn(), save: vi.fn(), accept: vi.fn(),
      dismissOptimization: vi.fn(), t: makeTranslate(zh, commonZh),
    } as unknown as ExpertPanelProps

    render(<ExpertPanel {...props} />)

    const version = screen.getByText('v3')
    expect(version.parentElement?.textContent).toBe('Interview coachv3')
    const edit = screen.getByRole('button', { name: '编辑Interview coach' })
    expect(edit.closest('div')?.lastElementChild?.contains(edit)).toBe(true)
  })

  it('keeps the generated identifier out of the create form', () => {
    const state: ExpertUiState = {
      status: 'ready',
      error: null,
      authorable: true,
      experts: [],
      editor: {
        kind: 'create',
        draft: {
          id: 'expert-12345678-1234-1234-1234-123456789abc',
          name: '',
          welcome: '',
          prompt: '',
          icon: undefined,
        },
        saving: false,
        saved: false,
        error: null,
      },
      optimizations: new Map(),
    }
    const props = {
      sessionId: SessionId('expert-panel'),
      useExpertUi: (selector: (value: ExpertUiState) => unknown) => selector(state),
      load: vi.fn(),
      openList: vi.fn(),
      beginCreate: vi.fn(),
      beginEdit: vi.fn(),
      openVersion: vi.fn(),
      closeVersion: vi.fn(),
      patchDraft: vi.fn(),
      patchOptimization: vi.fn(),
      save: vi.fn(),
      accept: vi.fn(),
      dismissOptimization: vi.fn(),
      t: makeTranslate(zh, commonZh),
    } as unknown as ExpertPanelProps

    render(<ExpertPanel {...props} />)

    expect(screen.queryByText('标识符')).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    expect(screen.getByRole('textbox', { name: '名字' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '欢迎语' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '提示词' })).toBeTruthy()
  })

  it('edits the proposed prompt before acceptance', () => {
    const patchOptimization = vi.fn()
    const sessionId = SessionId('expert-review')
    const state: ExpertUiState = {
      status: 'ready',
      error: null,
      authorable: true,
      experts: [],
      editor: { kind: 'list' },
      optimizations: new Map([[sessionId, {
        status: 'ready',
        proposal: {
          proposalId: brandString<ExpertProposalId>('proposal-1'),
          expertId: 'expert-1',
          targetMessageId: MessageId('answer-1'),
          baseVersion: 1,
          status: 'changed',
          summary: 'Make the question focused.',
          originalPrompt: 'Ask one question.',
          revisedPrompt: 'Ask one focused question.',
          changes: [{
            before: 'Ask one question.',
            after: 'Ask one focused question.',
            reason: 'The focused question worked.',
          }],
        },
        revisedPrompt: 'Ask one focused question.',
        accepting: false,
        error: null,
      }]]),
    }
    const props = {
      sessionId,
      useExpertUi: (selector: (value: ExpertUiState) => unknown) => selector(state),
      load: vi.fn(),
      openList: vi.fn(),
      beginCreate: vi.fn(),
      beginEdit: vi.fn(),
      openVersion: vi.fn(),
      closeVersion: vi.fn(),
      patchDraft: vi.fn(),
      patchOptimization,
      save: vi.fn(),
      accept: vi.fn(),
      dismissOptimization: vi.fn(),
      t: makeTranslate(zh, commonZh),
    } as unknown as ExpertPanelProps

    render(<ExpertPanel {...props} />)
    fireEvent.change(screen.getByRole('textbox', { name: '建议提示词' }), {
      target: { value: 'Ask one precise question.' },
    })

    expect(patchOptimization).toHaveBeenCalledExactlyOnceWith('Ask one precise question.')
  })

  it('opens version history through a read-only highlighted comparison', () => {
    const openVersion = vi.fn()
    const state: ExpertUiState = {
      status: 'ready',
      error: null,
      authorable: true,
      experts: [],
      editor: {
        kind: 'edit',
        document: {
          id: 'expert-1',
          name: 'Expert',
          welcome: '',
          prompt: 'Ask one focused question.',
          currentVersion: 2,
          updatedAt: 2,
          versions: [
            { version: 2, createdAt: 2, summary: 'Focus the question', changes: [] },
            { version: 1, createdAt: 1, summary: 'Initial version', changes: [] },
          ],
        },
        draft: { id: 'expert-1', name: 'Expert', welcome: '', prompt: 'Ask one focused question.', icon: undefined },
        saving: false,
        saved: false,
        error: null,
        versionReview: null,
      },
      optimizations: new Map(),
    }
    const props = {
      sessionId: SessionId('expert-history'),
      useExpertUi: (selector: (value: ExpertUiState) => unknown) => selector(state),
      load: vi.fn(), openList: vi.fn(), beginCreate: vi.fn(), beginEdit: vi.fn(),
      openVersion, closeVersion: vi.fn(), patchDraft: vi.fn(), patchOptimization: vi.fn(),
      save: vi.fn(), accept: vi.fn(), dismissOptimization: vi.fn(), t: makeTranslate(zh, commonZh),
    } as unknown as ExpertPanelProps

    const view = render(<ExpertPanel {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '查看 v2 提示词修改' }))
    expect(openVersion).toHaveBeenCalledExactlyOnceWith(2)

    const ready: ExpertUiState = {
      ...state,
      editor: {
        ...state.editor as Extract<ExpertUiState['editor'], { kind: 'edit' }>,
        versionReview: {
          status: 'ready',
          comparison: {
            version: { version: 2, createdAt: 2, summary: 'Focus the question', changes: [] },
            previousVersion: 1,
            previousPrompt: 'Ask one question.',
            prompt: 'Ask one focused question.',
          },
        },
      },
    }
    view.rerender(<ExpertPanel {...({
      ...props,
      useExpertUi: (selector: (value: ExpertUiState) => unknown) => selector(ready),
    } as unknown as ExpertPanelProps)} />)

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('v1 提示词')).toBeTruthy()
    expect(screen.getByText('v2 提示词')).toBeTruthy()
    expect(view.container.querySelectorAll('mark[data-changed]').length).toBeGreaterThan(0)
  })

  it('stops the optimization child from the run header', () => {
    const sessionId = SessionId('expert-running')
    const childSessionId = SessionId('expert-child')
    const state: ExpertUiState = {
      status: 'ready', error: null, authorable: true, experts: [], editor: { kind: 'list' },
      optimizations: new Map([[sessionId, {
        status: 'running',
        proposalId: brandString<ExpertProposalId>('proposal-running'),
        childSessionId,
      }]]),
    }
    const dismissOptimization = vi.fn()
    const props = {
      sessionId,
      useExpertUi: (selector: (value: ExpertUiState) => unknown) => selector(state),
      load: vi.fn(), openList: vi.fn(), beginCreate: vi.fn(), beginEdit: vi.fn(),
      openVersion: vi.fn(), closeVersion: vi.fn(), patchDraft: vi.fn(), patchOptimization: vi.fn(),
      save: vi.fn(), accept: vi.fn(), dismissOptimization, t: makeTranslate(zh, commonZh),
      FixedSessionSlotView: () => null,
    } as unknown as ExpertPanelProps

    render(<ExpertPanel {...props} />)

    fireEvent.click(screen.getByRole('button', { name: '停止优化提示词' }))
    expect(dismissOptimization).toHaveBeenCalledExactlyOnceWith()
  })

  it('routes every create-form control and blocks incomplete or saving drafts', () => {
    const patchDraft = vi.fn()
    const save = vi.fn(() => Promise.resolve())
    const openList = vi.fn()
    const state: ExpertUiState = {
      status: 'ready', error: null, authorable: true, experts: [], optimizations: new Map(),
      editor: {
        kind: 'create', saving: false, saved: false, error: 'Fix the draft',
        draft: { id: 'expert-new', name: 'Coach', welcome: 'Hello', prompt: 'Ask.', icon: 'briefcase' },
      },
    }
    const view = render(<ExpertPanel {...panelProps(state, { patchDraft, save, openList })} />)

    fireEvent.click(screen.getByRole('button', { name: '返回智能体列表' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    fireEvent.change(screen.getByRole('textbox', { name: '名字' }), { target: { value: 'Next' } })
    fireEvent.change(screen.getByRole('textbox', { name: '欢迎语' }), { target: { value: 'Welcome' } })
    fireEvent.change(screen.getByRole('textbox', { name: '提示词' }), { target: { value: 'Prompt' } })
    fireEvent.click(screen.getByRole('button', { name: '商务智能体' }))
    fireEvent.click(screen.getByRole('button', { name: '通用智能体' }))
    fireEvent.click(screen.getByRole('button', { name: '保存智能体' }))

    expect(openList).toHaveBeenCalledTimes(2)
    expect(patchDraft.mock.calls).toEqual([
      [{ name: 'Next' }], [{ welcome: 'Welcome' }], [{ prompt: 'Prompt' }], [{ icon: undefined }], [{ icon: 'sparkles' }],
    ])
    expect(save).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert').textContent).toBe('Fix the draft')

    const saving: ExpertUiState = {
      ...state,
      editor: {
        ...state.editor as Extract<ExpertUiState['editor'], { kind: 'create' }>,
        saving: true,
        saved: false,
        error: null,
      },
    }
    view.rerender(<ExpertPanel {...panelProps(saving)} />)
    expect(screen.getByRole('button', { name: '正在保存…' })).toHaveProperty('disabled', true)
    for (const textbox of screen.getAllByRole('textbox')) expect(textbox).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '商务智能体' })).toHaveProperty('disabled', true)

    const createEditor = state.editor as Extract<ExpertUiState['editor'], { kind: 'create' }>
    const incomplete: ExpertUiState = {
      ...state,
      editor: {
        ...createEditor,
        draft: { ...createEditor.draft, name: ' ', prompt: ' ' }, error: null,
      },
    }
    view.rerender(<ExpertPanel {...panelProps(incomplete)} />)
    expect(screen.getByRole('button', { name: '保存智能体' })).toHaveProperty('disabled', true)
  })

  it('enables saving only after an edit and confirms a successful save', () => {
    const document = {
      id: 'expert-1', name: 'Expert', welcome: 'Hello', prompt: 'Ask.', currentVersion: 1, updatedAt: 1,
      versions: [{ version: 1, createdAt: 1, summary: 'Initial version', changes: [] }],
    }
    const base: ExpertUiState = {
      status: 'ready', error: null, authorable: true, experts: [], optimizations: new Map(),
      editor: {
        kind: 'edit', document, draft: { ...document, icon: undefined }, saving: false, saved: false,
        error: null, versionReview: null,
      },
    }
    const view = render(<ExpertPanel {...panelProps(base)} />)
    expect(screen.getByRole('button', { name: '保存智能体' })).toHaveProperty('disabled', true)

    const changed: ExpertUiState = {
      ...base,
      editor: {
        ...base.editor as Extract<ExpertUiState['editor'], { kind: 'edit' }>,
        draft: { ...document, welcome: 'Welcome back.', icon: undefined },
      },
    }
    view.rerender(<ExpertPanel {...panelProps(changed)} />)
    expect(screen.getByRole('button', { name: '保存智能体' })).toHaveProperty('disabled', false)

    const saved: ExpertUiState = {
      ...base,
      editor: {
        ...base.editor as Extract<ExpertUiState['editor'], { kind: 'edit' }>,
        document: { ...document, welcome: 'Welcome back.', updatedAt: 2 },
        draft: { ...document, welcome: 'Welcome back.', icon: undefined },
        saved: true,
      },
    }
    view.rerender(<ExpertPanel {...panelProps(saved)} />)
    expect(screen.getByRole('button', { name: '已保存' })).toHaveProperty('disabled', true)
  })

  it('renders loading and failed version reviews with working navigation', () => {
    const closeVersion = vi.fn()
    const openVersion = vi.fn(() => Promise.resolve())
    const document = {
      id: 'expert-1', name: 'Expert', welcome: '', prompt: 'Prompt', currentVersion: 2, updatedAt: 2,
      versions: [{ version: 2, createdAt: 2, summary: 'Changed', changes: [] }],
    }
    const base = {
      status: 'ready' as const, error: null, authorable: true, experts: [], optimizations: new Map(),
    }
    const loading: ExpertUiState = {
      ...base,
      editor: {
        kind: 'edit', document, draft: { ...document, icon: undefined }, saving: false, saved: false, error: null,
        versionReview: { status: 'loading', version: 2 },
      },
    }
    const view = render(<ExpertPanel {...panelProps(loading, { closeVersion, openVersion })} />)
    expect(screen.getByRole('status').textContent).toContain('正在加载版本…')
    fireEvent.click(screen.getByRole('button', { name: '返回智能体编辑页' }))
    expect(closeVersion).toHaveBeenCalledTimes(1)

    const failed: ExpertUiState = {
      ...loading,
      editor: { ...loading.editor as Extract<ExpertUiState['editor'], { kind: 'edit' }>, versionReview: {
        status: 'failed', version: 2, error: 'disk unavailable',
      } },
    }
    view.rerender(<ExpertPanel {...panelProps(failed, { closeVersion, openVersion })} />)
    expect(screen.getByRole('alert').textContent).toContain('disk unavailable')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(openVersion).toHaveBeenCalledExactlyOnceWith(2)
  })

  it('renders the initial version against an empty predecessor', () => {
    const state: ExpertUiState = {
      status: 'ready', error: null, authorable: true, experts: [], optimizations: new Map(),
      editor: {
        kind: 'edit',
        document: {
          id: 'expert-1', name: 'Expert', welcome: '', prompt: 'First prompt', currentVersion: 1, updatedAt: 1,
          versions: [{ version: 1, createdAt: 1, summary: 'Initial', changes: [] }],
        },
        draft: { id: 'expert-1', name: 'Expert', welcome: '', prompt: 'First prompt', icon: undefined },
        saving: false, saved: false, error: null,
        versionReview: {
          status: 'ready', comparison: {
            version: { version: 1, createdAt: 1, summary: 'Initial', changes: [] },
            previousVersion: null, previousPrompt: '', prompt: 'First prompt',
          },
        },
      },
    }
    render(<ExpertPanel {...panelProps(state)} />)
    expect(screen.getByText('v1 创建前')).toBeTruthy()
    expect(screen.getByText('v1 提示词')).toBeTruthy()
  })

  it('renders roster loading, errors, empty state, disabled authoring, and row actions', () => {
    const load = vi.fn(() => Promise.resolve())
    const beginCreate = vi.fn()
    const beginEdit = vi.fn(() => Promise.resolve())
    const loading: ExpertUiState = {
      status: 'loading', error: null, authorable: false, experts: [], editor: { kind: 'list' }, optimizations: new Map(),
    }
    const view = render(<ExpertPanel {...panelProps(loading, { load, beginCreate, beginEdit })} />)
    expect(screen.getByRole('status').textContent).toContain('正在加载智能体…')
    expect(screen.getByRole('button', { name: '新增智能体' })).toHaveProperty('disabled', true)

    const empty: ExpertUiState = { ...loading, status: 'ready', error: null, authorable: true }
    view.rerender(<ExpertPanel {...panelProps(empty, { load, beginCreate, beginEdit })} />)
    expect(screen.getByText('还没有智能体')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    fireEvent.click(screen.getByRole('button', { name: '新增智能体' }))
    expect(beginCreate).toHaveBeenCalledTimes(1)

    const ready: ExpertUiState = {
      ...empty, error: 'roster warning', experts: [{
        id: 'expert-2', name: 'Analyst', welcome: '', currentVersion: 1, updatedAt: 1, icon: 'chart',
      }],
    }
    view.rerender(<ExpertPanel {...panelProps(ready, { load, beginCreate, beginEdit })} />)
    expect(screen.getByRole('alert').textContent).toContain('roster warning')
    expect(screen.getByText('暂未填写欢迎语')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '编辑Analyst' }))
    expect(beginEdit).toHaveBeenCalledExactlyOnceWith('expert-2')
  })

  it('renders every optimization outcome and fixed child view', () => {
    const sessionId = SessionId('expert-panel')
    const dismissOptimization = vi.fn()
    const accept = vi.fn(() => Promise.resolve())
    let fixedOwner: { openView: () => unknown; completeViewRequest: () => unknown } | undefined
    const starting: ExpertUiState = {
      status: 'ready', error: null, authorable: true, experts: [], editor: { kind: 'list' },
      optimizations: new Map([[sessionId, { status: 'starting' }]]),
    }
    const view = render(<ExpertPanel {...panelProps(starting, { sessionId, dismissOptimization, accept })} />)
    expect(screen.getByText('优化 skill 正在核对对话证据，只会修改有依据的局部规则。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '停止优化提示词' }))

    const running: ExpertUiState = {
      ...starting,
      optimizations: new Map([[sessionId, {
        status: 'running', proposalId: brandString<ExpertProposalId>('proposal-running'),
        childSessionId: SessionId('child-running'),
      }]]),
    }
    view.rerender(<ExpertPanel {...panelProps(running, {
      sessionId, dismissOptimization,
      FixedSessionSlotView: ((props: { owner: typeof fixedOwner }) => {
        fixedOwner = props.owner
        return <span>child conversation</span>
      }) as ExpertPanelProps['FixedSessionSlotView'],
    })} />)
    expect(screen.getByText('child conversation')).toBeTruthy()
    expect(fixedOwner?.openView()).toBeUndefined()
    expect(fixedOwner?.completeViewRequest()).toBeUndefined()

    const failed: ExpertUiState = {
      ...starting, optimizations: new Map([[sessionId, { status: 'failed', error: 'child failed' }]]),
    }
    view.rerender(<ExpertPanel {...panelProps(failed, { sessionId, dismissOptimization })} />)
    expect(screen.getByRole('alert').textContent).toContain('child failed')
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))

    const proposal = {
      proposalId: brandString<ExpertProposalId>('proposal-ready'), expertId: 'expert-1',
      targetMessageId: MessageId('answer-ready'), baseVersion: 1, status: 'no-change' as const,
      summary: 'No evidence', originalPrompt: 'Same prompt', revisedPrompt: 'Same prompt', changes: [],
    }
    const noChange: ExpertUiState = {
      ...starting,
      optimizations: new Map([[sessionId, {
        status: 'ready', proposal, revisedPrompt: proposal.revisedPrompt, accepting: false, error: 'review note',
      }]]),
    }
    view.rerender(<ExpertPanel {...panelProps(noChange, { sessionId, dismissOptimization, accept })} />)
    expect(screen.getByText('没有足够依据修改')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '确认新版本' })).toBeNull()
    expect(screen.getByRole('alert').textContent).toBe('review note')
    fireEvent.click(screen.getByRole('button', { name: '保留当前版本' }))

    const accepting: ExpertUiState = {
      ...starting,
      optimizations: new Map([[sessionId, {
        status: 'ready', proposal: { ...proposal, status: 'changed', revisedPrompt: 'New prompt', changes: [
          { before: 'Same', after: 'New', reason: 'Evidence' },
        ] }, revisedPrompt: 'New prompt', accepting: true, error: null,
      }]]),
    }
    view.rerender(<ExpertPanel {...panelProps(accepting, { sessionId, dismissOptimization, accept })} />)
    expect(screen.getByRole('button', { name: '正在保存版本…' })).toHaveProperty('disabled', true)

    const changed: ExpertUiState = {
      ...accepting,
      optimizations: new Map([[sessionId, {
        ...accepting.optimizations.get(sessionId) as Extract<ExpertUiState['optimizations'] extends ReadonlyMap<SessionId, infer T> ? T : never, { status: 'ready' }>,
        accepting: false,
      }]]),
    }
    view.rerender(<ExpertPanel {...panelProps(changed, { sessionId, dismissOptimization, accept })} />)
    fireEvent.click(screen.getByRole('button', { name: '确认新版本' }))
    expect(accept).toHaveBeenCalledTimes(1)
  })

  it('renders a document loading route', () => {
    const state: ExpertUiState = {
      status: 'ready', error: null, authorable: true, experts: [],
      editor: { kind: 'loading', id: 'expert-1' }, optimizations: new Map(),
    }
    render(<ExpertPanel {...panelProps(state)} />)
    expect(screen.getByRole('status').textContent).toContain('正在加载智能体…')
  })
})
