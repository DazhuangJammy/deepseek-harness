// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { LearningView } from '../src/client/LearningView.tsx'
import { zh, type LearningKey } from '../src/client/locales.ts'
import { apply as clientApply } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import * as invariant from '../src/invariant.ts'

const snapshot = {
  sessionId: 'learning-test',
  nodes: [
    { kind: 'user', seq: 1, time: 1, content: [{ type: 'text', text: '列出项目结构' }], source: null },
    { kind: 'assistant', seq: 2, time: 2, turn: 1, step: 1, blocks: [{ kind: 'text', text: '我先查看目录。' }] },
    { kind: 'tool-result', seq: 3, time: 3, callId: 'call-1', call: { name: 'list_dir', argsRaw: '{}' }, callTime: 2, content: [{ type: 'text', text: 'packages' }], isError: false, callView: null, resultView: null, subCalls: [] },
  ],
  partial: null,
  running: false,
} as unknown as ConversationSnapshot

const contextBatchSnapshot = {
  ...snapshot,
  nodes: [
    snapshot.nodes[0],
    { kind: 'context', seq: 8, time: 8, content: [{ type: 'text', text: 'runtime rules' }], source: null, provenance: { role: 'inject', label: '@deepseek-ai/dsh-system-prompt' }, form: 'snapshot' },
    { kind: 'context', seq: 9, time: 9, content: [{ type: 'text', text: 'available skills' }], source: null, provenance: { role: 'inject', label: 'skill-catalog' }, form: 'catalog' },
  ],
} as unknown as ConversationSnapshot

function props(value: ConversationSnapshot): ComponentProps<typeof LearningView> {
  return {
    useSession: ((selector: (snapshot: ConversationSnapshot) => unknown) => selector(value)) as ConvViewProps['useSession'],
    t: (key: LearningKey) => zh[key],
  } as unknown as ComponentProps<typeof LearningView>
}

function withNodes(nodes: readonly unknown[], extra: Partial<ConversationSnapshot> = {}): ConversationSnapshot {
  return { ...snapshot, nodes, partial: null, running: false, ...extra } as unknown as ConversationSnapshot
}

describe('Agent Learning view', () => {
  afterEach(cleanup)

  it('explains the existing session records and lets the learner inspect one', () => {
    render(<LearningView {...props(snapshot)} />)

    expect(screen.getByRole('heading', { name: '沿着真实事件走一遍' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '真实事件节点图' })).toBeTruthy()
    expect(screen.getByText('模型响应 · T1 / S1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /工具结果/ }))
    expect(screen.getByText('工具结果 · list_dir')).toBeTruthy()
    expect(screen.getAllByText('Tool Consumer').length).toBeGreaterThan(0)
    expect(screen.getByText('list_dir({})')).toBeTruthy()
    expect(screen.getAllByText('packages').length).toBeGreaterThan(0)
    expect(screen.getAllByText('输入').length).toBeGreaterThan(1)
    expect(screen.getByText('插件处理过程')).toBeTruthy()
    expect(screen.getByText('输出')).toBeTruthy()
    expect(screen.getByText('Tool Registry 按工具名找到定义，依次经过 tools/pre-execute、tools/execute、tools/post-execute，再提交 Tool Result。')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: '术语：Provider' })[0]!)
    expect(screen.getByRole('dialog', { name: '术语 · Provider' })).toBeTruthy()
    expect(screen.getByText('真正提供能力的柜台或供应商，例如模型、文件系统、搜索服务。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '关闭术语解释' }))
    expect(screen.queryByRole('dialog', { name: '术语 · Provider' })).toBeNull()
  })

  it('renders a useful empty state without inventing runtime records', () => {
    render(<LearningView {...props({ ...snapshot, nodes: [], partial: null })} />)

    expect(screen.getByText('这个 Session 还没有可解释的运行记录。')).toBeTruthy()
    expect(screen.queryByText('模型响应 · T1 / S1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '打开完整字典' }))
    expect(screen.getByRole('dialog', { name: '术语字典' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '关闭术语解释' }))
    expect(screen.queryByRole('dialog', { name: '术语字典' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '术语：Harness' }))
    expect(screen.getByRole('dialog', { name: '术语 · Harness' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '关闭术语解释' }))

    fireEvent.click(screen.getByRole('button', { name: '打开完整字典' }))
    fireEvent.click(screen.getByRole('button', { name: 'Harness' }))
    expect(screen.getByRole('dialog', { name: '术语 · Harness' })).toBeTruthy()
  })

  it('builds the graph from the supplied snapshot instead of a fixed teaching fixture', () => {
    const first = { ...snapshot, nodes: snapshot.nodes.slice(0, 1) }
    const { rerender } = render(<LearningView {...props(first)} />)

    expect(screen.getByText('事件 #1')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '项目架构地图' })).toBeNull()
    expect(screen.queryByText('工具结果 · list_dir')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /用户输入/ }))
    rerender(<LearningView {...props(first)} />)
    expect(screen.getByRole('button', { name: /用户输入/ }).getAttribute('aria-expanded')).toBe('true')

    rerender(<LearningView {...props(snapshot)} />)
    expect(screen.getByText('事件 #3')).toBeTruthy()
    expect(screen.getByText('工具结果 · list_dir')).toBeTruthy()

    rerender(<LearningView {...props(withNodes(snapshot.nodes.slice(1)))} />)
    expect(screen.getByRole('button', { name: /模型响应/ }).getAttribute('aria-expanded')).toBe('false')
  })

  it('marks adjacent context providers as one prompt input batch', () => {
    render(<LearningView {...props(contextBatchSnapshot)} />)

    expect(screen.getByText('同一 Step · 并列输入（独立来源）')).toBeTruthy()
  })

  it('explains every projected event kind and its recorded fallback states', () => {
    const longText = 'x'.repeat(110)
    const nodes = [
      { kind: 'user', seq: 10, time: 10, content: [null, 'skip', { name: 'catalog' }, { type: 'image' }, {}, { text: longText }] },
      { kind: 'user', seq: 11, time: 11, content: [] },
      { kind: 'user', seq: 111, time: 111, content: null },
      { kind: 'steering', seq: 12, time: 12, content: [] },
      { kind: 'assistant', seq: 13, time: 13, turn: 2, step: 1, blocks: [{ kind: 'tool-call', name: 'read_file', argsRaw: '{}' }], provenance: { provider: 'deepseek', model: 'deepseek-chat' } },
      { kind: 'assistant', seq: 14, time: 14, turn: 2, step: 2, blocks: [] },
      { kind: 'tool-result', seq: 15, time: 15, callId: 'missing-call', call: null, content: [], isError: false },
      { kind: 'tool-result', seq: 16, time: 16, callId: 'failed-call', call: { name: 'write_file', argsRaw: '{"path":"x"}' }, content: [{ type: 'text', text: 'denied' }], isError: true },
      { kind: 'command', seq: 17, time: 17, name: null, args: null, outcome: null },
      { kind: 'command', seq: 18, time: 18, name: 'shell', args: '--help', outcome: { kind: 'error', text: 'bad command' } },
      { kind: 'command', seq: 19, time: 19, name: 'status', args: null, outcome: { kind: 'success', text: 'ready' } },
      { kind: 'context', seq: 20, time: 20, content: [], provenance: { role: 'inject', label: null }, form: 'snapshot' },
      { kind: 'compaction', seq: 21, time: 21, summary: null },
      { kind: 'compaction', seq: 22, time: 22, summary: 'summary', shadowedItemCount: 4 },
      { kind: 'compaction', seq: 23, time: 23, summary: 'summary' },
      { kind: 'model-retry', seq: 24, time: 24, turn: 3, step: 2, provider: 'deepseek', retry: 2 },
      { kind: 'turn-error', seq: 25, time: 25, turn: 3, step: 2, message: 'network failed' },
      { kind: 'turn-max-tokens', seq: 26, time: 26, turn: 3, step: 3 },
      { kind: 'unknown', seq: 27, time: 27, type: 'future-event', data: {} },
    ]
    render(<LearningView {...props(withNodes(nodes, { running: true }))} />)

    for (const text of [
      '运行中的追加输入', '请求工具： read_file', '模型返回了内容', '工具已完成', '工具返回错误',
      '命令已执行', 'bad command', 'ready', 'Context Provider', '摘要内容未在当前窗口中',
      '压缩了 4 条历史', '压缩了 0 条历史', 'deepseek · 第 2 次尝试', 'network failed',
      '模型输出达到本次预算', 'future-event',
    ]) expect(screen.getAllByText(text).length).toBeGreaterThan(0)
    expect(screen.getByText(/调用 catalog \[image\].*…/)).toBeTruthy()
    expect(screen.getByText('运行中')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /工具结果.*missing-call/ }))
    expect(screen.getAllByText('missing-call').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /工具结果.*missing-call/ }))
    expect(screen.getByRole('button', { name: /工具结果.*missing-call/ }).getAttribute('aria-expanded')).toBe('false')
  })

  it('shows partial output and derives the current turn and step from it', () => {
    const partial: NonNullable<ConversationSnapshot['partial']> = {
      turn: 8, step: 5, blocks: [{ kind: 'text', text: 'still streaming' }],
    }
    const { rerender } = render(
      <LearningView {...props(withNodes([], { partial, running: true }))} />,
    )

    expect(screen.getByText('模型正在输出 · T8 / S5')).toBeTruthy()
    expect(screen.getByText('still streaming')).toBeTruthy()
    expect(screen.getByText('流式中')).toBeTruthy()
    expect(screen.getAllByText('8').length).toBeGreaterThan(0)
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)

    rerender(
      <LearningView {...props(withNodes([], { partial: { ...partial, blocks: [] } }))} />,
    )
    expect(screen.getByText('正在接收流式片段')).toBeTruthy()
  })

  it('derives the current position from the latest completed node', () => {
    render(<LearningView {...props(withNodes([
      { kind: 'turn-error', seq: 30, time: 30, turn: 9, message: 'stopped' },
    ]))} />)

    expect(screen.getAllByText('9').length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('removes its slot contribution when the plugin effect is disposed', () => {
    const disposers: Array<() => void> = []
    let mounted = 0
    let label = ''
    const context = {
      effect: (factory: () => undefined | (() => void)) => {
        const disposer = factory()
        if (typeof disposer === 'function') disposers.push(disposer)
        return disposer
      },
      locale: {
        register: () => () => {},
        bind: () => (key: LearningKey) => zh[key],
      },
      slots: {
        inject: (_name: string, factory: () => () => void) => { disposers.push(factory()) },
        register: (options: { label: () => string }) => {
          mounted += 1
          label = options.label()
          return () => { mounted -= 1 }
        },
      },
    } as unknown as Parameters<typeof clientApply>[0]

    clientApply(context)
    expect(mounted).toBe(1)
    expect(label).toBe('学习')
    while (disposers.length > 0) disposers.pop()?.()
    expect(mounted).toBe(0)
  })

  it('keeps the host entry inert and registers the invariant companion', async () => {
    let packageName = ''
    let installerCalled = false
    const disposer = () => {}
    const context = {
      invariants: {
        register: (name: string, installer: () => void) => {
          packageName = name
          installer()
          installerCalled = true
          return disposer
        },
      },
    } as unknown as Parameters<typeof invariant.apply>[0]

    expect(() => { hostApply() }).not.toThrow()
    await expect(invariant.apply(context)).resolves.toBe(disposer)
    expect(packageName).toBe('@deepseek-ai/dsh-client-ui-learning')
    expect(installerCalled).toBe(true)
    expect(invariant.name).toBe('client-ui-learning-invariant')
    expect(invariant.inject).toEqual(['invariants'])
  })
})
