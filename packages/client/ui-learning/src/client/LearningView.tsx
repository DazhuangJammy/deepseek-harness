/** A teaching-oriented projection over the existing ConversationSnapshot. */
import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ConversationNode, ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { IconLightOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LearningKey, TermKey } from './locales.ts'
import css from './LearningView.module.css'

type RecordTone = 'user' | 'model' | 'tool' | 'system' | 'error'
type DetailKind = 'user' | 'steering' | 'model' | 'tool' | 'command' | 'context' | 'compaction' | 'retry' | 'error' | 'maxTokens' | 'unknown' | 'partial'
type StageId = 'management' | 'plugins' | 'execution' | 'capabilities' | 'evidence'

interface LearningRecord {
  readonly id: string
  readonly kind: DetailKind
  readonly stage: StageId
  readonly tone: RecordTone
  readonly badge: LearningKey
  readonly title: string
  readonly summary: string
  readonly observed: {
    readonly input: string
    readonly output: string
  }
  readonly seq?: number
  readonly turn?: number
  readonly step?: number
  readonly component: {
    readonly role: LearningKey
    readonly name: string
    readonly evidence: LearningKey
  }
  readonly detail: {
    readonly what: LearningKey
    readonly process: LearningKey
    readonly why: LearningKey
    readonly owner: LearningKey
    readonly input: LearningKey
    readonly output: LearningKey
    readonly next: LearningKey
    readonly terms: readonly TermKey[]
  }
}

interface GlossaryEntry {
  readonly analogy: LearningKey
  readonly meaning: LearningKey
  readonly owner: LearningKey
  readonly partners: LearningKey
  readonly location: LearningKey
}

const GLOSSARY_TERMS: readonly TermKey[] = [
  'term.harness', 'term.cordis', 'term.profile', 'term.bundle', 'term.loader', 'term.plugin',
  'term.service', 'term.definition', 'term.provider', 'term.consumer', 'term.registry', 'term.agent',
  'term.loop', 'term.session', 'term.turn', 'term.step', 'term.prompt', 'term.section', 'term.context',
  'term.tool', 'term.mcp', 'term.event', 'term.log', 'term.persistence', 'term.snapshot', 'term.trajectory', 'term.retry',
]

const GLOSSARY: Readonly<Record<TermKey, GlossaryEntry>> = {
  'term.harness': { analogy: 'glossary.harness.analogy', meaning: 'glossary.harness.meaning', owner: 'map.management.roles', partners: 'map.management.partners', location: 'glossary.harness.location' },
  'term.cordis': { analogy: 'glossary.cordis.analogy', meaning: 'glossary.cordis.meaning', owner: 'map.management.roles', partners: 'map.management.partners', location: 'glossary.cordis.location' },
  'term.profile': { analogy: 'glossary.profile.analogy', meaning: 'glossary.profile.meaning', owner: 'map.management.roles', partners: 'map.management.partners', location: 'glossary.profile.location' },
  'term.bundle': { analogy: 'glossary.bundle.analogy', meaning: 'glossary.bundle.meaning', owner: 'map.management.roles', partners: 'map.management.partners', location: 'glossary.bundle.location' },
  'term.loader': { analogy: 'glossary.loader.analogy', meaning: 'glossary.loader.meaning', owner: 'map.management.roles', partners: 'map.management.partners', location: 'glossary.loader.location' },
  'term.plugin': { analogy: 'glossary.plugin.analogy', meaning: 'glossary.plugin.meaning', owner: 'map.plugins.roles', partners: 'map.plugins.partners', location: 'glossary.plugin.location' },
  'term.service': { analogy: 'glossary.service.analogy', meaning: 'glossary.service.meaning', owner: 'map.plugins.roles', partners: 'map.plugins.partners', location: 'glossary.service.location' },
  'term.definition': { analogy: 'glossary.definition.analogy', meaning: 'glossary.definition.meaning', owner: 'map.plugins.roles', partners: 'map.plugins.partners', location: 'glossary.definition.location' },
  'term.provider': { analogy: 'glossary.provider.analogy', meaning: 'glossary.provider.meaning', owner: 'map.plugins.roles', partners: 'map.plugins.partners', location: 'glossary.provider.location' },
  'term.consumer': { analogy: 'glossary.consumer.analogy', meaning: 'glossary.consumer.meaning', owner: 'map.plugins.roles', partners: 'map.plugins.partners', location: 'glossary.consumer.location' },
  'term.registry': { analogy: 'glossary.registry.analogy', meaning: 'glossary.registry.meaning', owner: 'map.capabilities.roles', partners: 'map.capabilities.partners', location: 'glossary.registry.location' },
  'term.agent': { analogy: 'glossary.agent.analogy', meaning: 'glossary.agent.meaning', owner: 'map.execution.roles', partners: 'map.execution.partners', location: 'glossary.agent.location' },
  'term.loop': { analogy: 'glossary.loop.analogy', meaning: 'glossary.loop.meaning', owner: 'map.execution.roles', partners: 'map.execution.partners', location: 'glossary.loop.location' },
  'term.session': { analogy: 'glossary.session.analogy', meaning: 'glossary.session.meaning', owner: 'map.execution.roles', partners: 'map.execution.partners', location: 'glossary.session.location' },
  'term.turn': { analogy: 'glossary.turn.analogy', meaning: 'glossary.turn.meaning', owner: 'map.execution.roles', partners: 'map.execution.partners', location: 'glossary.turn.location' },
  'term.step': { analogy: 'glossary.step.analogy', meaning: 'glossary.step.meaning', owner: 'map.execution.roles', partners: 'map.execution.partners', location: 'glossary.step.location' },
  'term.prompt': { analogy: 'glossary.prompt.analogy', meaning: 'glossary.prompt.meaning', owner: 'map.capabilities.roles', partners: 'map.capabilities.partners', location: 'glossary.prompt.location' },
  'term.section': { analogy: 'glossary.section.analogy', meaning: 'glossary.section.meaning', owner: 'map.capabilities.roles', partners: 'map.capabilities.partners', location: 'glossary.section.location' },
  'term.context': { analogy: 'glossary.context.analogy', meaning: 'glossary.context.meaning', owner: 'map.capabilities.roles', partners: 'map.capabilities.partners', location: 'glossary.context.location' },
  'term.tool': { analogy: 'glossary.tool.analogy', meaning: 'glossary.tool.meaning', owner: 'map.capabilities.roles', partners: 'map.capabilities.partners', location: 'glossary.tool.location' },
  'term.mcp': { analogy: 'glossary.mcp.analogy', meaning: 'glossary.mcp.meaning', owner: 'map.capabilities.roles', partners: 'map.capabilities.partners', location: 'glossary.mcp.location' },
  'term.event': { analogy: 'glossary.event.analogy', meaning: 'glossary.event.meaning', owner: 'map.evidence.roles', partners: 'map.evidence.partners', location: 'glossary.event.location' },
  'term.log': { analogy: 'glossary.log.analogy', meaning: 'glossary.log.meaning', owner: 'map.evidence.roles', partners: 'map.evidence.partners', location: 'glossary.log.location' },
  'term.persistence': { analogy: 'glossary.persistence.analogy', meaning: 'glossary.persistence.meaning', owner: 'map.evidence.roles', partners: 'map.evidence.partners', location: 'glossary.persistence.location' },
  'term.snapshot': { analogy: 'glossary.snapshot.analogy', meaning: 'glossary.snapshot.meaning', owner: 'map.evidence.roles', partners: 'map.evidence.partners', location: 'glossary.snapshot.location' },
  'term.trajectory': { analogy: 'glossary.trajectory.analogy', meaning: 'glossary.trajectory.meaning', owner: 'map.evidence.roles', partners: 'map.evidence.partners', location: 'glossary.trajectory.location' },
  'term.retry': { analogy: 'glossary.retry.analogy', meaning: 'glossary.retry.meaning', owner: 'map.evidence.roles', partners: 'map.evidence.partners', location: 'glossary.retry.location' },
}

const TERM_MAP: Readonly<Record<DetailKind, readonly TermKey[]>> = {
  user: ['term.session', 'term.agent', 'term.turn'],
  steering: ['term.session', 'term.loop', 'term.step'],
  model: ['term.agent', 'term.loop', 'term.prompt', 'term.provider', 'term.step'],
  tool: ['term.tool', 'term.registry', 'term.consumer', 'term.provider', 'term.event'],
  command: ['term.tool', 'term.plugin', 'term.provider', 'term.event'],
  context: ['term.service', 'term.context', 'term.provider', 'term.prompt', 'term.section'],
  compaction: ['term.session', 'term.log', 'term.persistence', 'term.prompt'],
  retry: ['term.loop', 'term.retry', 'term.provider', 'term.event'],
  error: ['term.loop', 'term.event', 'term.log'],
  maxTokens: ['term.loop', 'term.provider', 'term.step'],
  unknown: ['term.session', 'term.event', 'term.log'],
  partial: ['term.provider', 'term.event', 'term.step'],
}

function textPreview(value: unknown): string {
  if (!Array.isArray(value)) return ''
  const parts = value.map((block) => {
    if (typeof block !== 'object' || block === null) return ''
    const record = block as Record<string, unknown>
    if (typeof record.text === 'string') return record.text
    if (typeof record.name === 'string') return `调用 ${record.name}`
    if (typeof record.type === 'string') return `[${record.type}]`
    return ''
  }).filter(Boolean)
  const result = parts.join(' ').replace(/\s+/g, ' ').trim()
  return result.length > 100 ? `${result.slice(0, 100)}…` : result
}

function recordDetail(kind: DetailKind, terms: readonly TermKey[] = TERM_MAP[kind]): LearningRecord['detail'] {
  return {
    what: `detail.${kind}.what`,
    process: `detail.${kind}.process`,
    why: `detail.${kind}.why`,
    owner: `detail.${kind}.owner`,
    input: `detail.${kind}.input`,
    output: `detail.${kind}.output`,
    next: `detail.${kind}.next`,
    terms,
  }
}

function observedComponent(role: LearningKey, name: string, evidence: LearningKey): LearningRecord['component'] {
  return { role, name, evidence }
}

function recordFromNode(node: ConversationNode, t: (key: LearningKey) => string): LearningRecord {
  switch (node.kind) {
    case 'user': {
      const summary = textPreview(node.content) || t('record.fallback.user')
      return { id: `user-${node.seq}`, kind: 'user', stage: 'execution', tone: 'user', badge: 'kind.user', title: t('event.user'), summary, observed: { input: summary, output: t('detail.user.output') }, seq: node.seq, component: observedComponent('component.session', t('component.session'), 'graph.evidence.user'), detail: recordDetail('user') }
    }
    case 'steering': {
      const summary = textPreview(node.content) || t('record.fallback.steering')
      return { id: `steering-${node.seq}`, kind: 'steering', stage: 'execution', tone: 'user', badge: 'kind.user', title: t('event.steering'), summary, observed: { input: summary, output: t('detail.steering.output') }, seq: node.seq, component: observedComponent('component.session', t('component.session'), 'graph.evidence.steering'), detail: recordDetail('steering') }
    }
    case 'assistant': {
      const call = node.blocks.find(block => block.kind === 'tool-call')
      const summary = call?.kind === 'tool-call' ? `${t('record.toolCallPrefix')} ${call.name}` : textPreview(node.blocks) || t('record.fallback.model')
      const provider = node.provenance === undefined ? t('graph.notAvailable') : `${node.provenance.provider} / ${node.provenance.model}`
      return { id: `assistant-${node.seq}`, kind: 'model', stage: 'execution', tone: 'model', badge: 'kind.model', title: `${t('event.model')} · T${node.turn} / S${node.step}`, summary, observed: { input: t('graph.notAvailable'), output: summary }, seq: node.seq, turn: node.turn, step: node.step, component: observedComponent('component.llm', provider, node.provenance === undefined ? 'graph.evidence.missingComponent' : 'graph.evidence.assistantProvenance'), detail: recordDetail('model') }
    }
    case 'tool-result': {
      const input = node.call === null ? node.callId : `${node.call.name}(${node.call.argsRaw})`
      const output = node.isError ? t('record.toolError') : textPreview(node.content) || t('record.fallback.tool')
      return { id: `tool-${node.seq}`, kind: 'tool', stage: 'capabilities', tone: node.isError ? 'error' : 'tool', badge: node.isError ? 'kind.error' : 'kind.tool', title: node.call?.name === undefined ? t('event.tool') : `${t('event.tool')} · ${node.call.name}`, summary: output, observed: { input, output }, seq: node.seq, component: observedComponent('component.tool', node.call?.name ?? node.callId, node.call === null ? 'graph.evidence.callId' : 'graph.evidence.toolName'), detail: recordDetail('tool') }
    }
    case 'command': {
      const input = node.name === null ? t('graph.notAvailable') : `${node.name}${node.args === null ? '' : ` ${node.args}`}`
      const output = node.outcome?.text ?? t('record.fallback.command')
      return { id: `command-${node.seq}`, kind: 'command', stage: 'capabilities', tone: node.outcome?.kind === 'error' ? 'error' : 'tool', badge: node.outcome?.kind === 'error' ? 'kind.error' : 'kind.tool', title: node.name === null ? t('event.command') : `${t('event.command')} · ${node.name}`, summary: output, observed: { input, output }, seq: node.seq, component: observedComponent('component.command', node.name ?? t('graph.notAvailable'), 'graph.evidence.commandName'), detail: recordDetail('command') }
    }
    case 'context': {
      const output = textPreview(node.content) || t('record.fallback.context')
      return { id: `context-${node.seq}`, kind: 'context', stage: 'capabilities', tone: 'system', badge: 'kind.system', title: t('event.context'), summary: node.provenance.label ?? output, observed: { input: node.provenance.label ?? t('graph.notAvailable'), output }, seq: node.seq, component: observedComponent('component.context', node.provenance.label ?? t('graph.notAvailable'), 'graph.evidence.contextProvenance'), detail: recordDetail('context') }
    }
    case 'compaction': {
      const output = node.summary === null ? t('record.compactionHidden') : t('record.compactionCount').replace('{count}', String(node.shadowedItemCount ?? 0))
      return { id: `compaction-${node.seq}`, kind: 'compaction', stage: 'evidence', tone: 'system', badge: 'kind.system', title: t('event.compaction'), summary: output, observed: { input: t('detail.compaction.input'), output }, seq: node.seq, component: observedComponent('component.compaction', t('component.compaction'), 'graph.evidence.sessionNode'), detail: recordDetail('compaction') }
    }
    case 'model-retry': {
      const output = t('record.retryAttempt').replace('{count}', String(node.retry))
      return { id: `retry-${node.seq}`, kind: 'retry', stage: 'evidence', tone: 'system', badge: 'kind.system', title: t('event.retry'), summary: `${node.provider} · ${output}`, observed: { input: node.provider, output }, seq: node.seq, turn: node.turn, step: node.step, component: observedComponent('component.retry', node.provider, 'graph.evidence.retryNode'), detail: recordDetail('retry') }
    }
    case 'turn-error':
      return { id: `error-${node.seq}`, kind: 'error', stage: 'evidence', tone: 'error', badge: 'kind.error', title: t('event.error'), summary: node.message, observed: { input: node.message, output: t('detail.error.output') }, seq: node.seq, turn: node.turn, step: node.step, component: observedComponent('component.loop', t('component.loop'), 'graph.evidence.errorNode'), detail: recordDetail('error') }
    case 'turn-max-tokens': {
      const output = t('record.fallback.maxTokens')
      return { id: `max-tokens-${node.seq}`, kind: 'maxTokens', stage: 'execution', tone: 'error', badge: 'kind.error', title: t('event.maxTokens'), summary: output, observed: { input: t('graph.notAvailable'), output }, seq: node.seq, turn: node.turn, step: node.step, component: observedComponent('component.loop', t('component.loop'), 'graph.evidence.errorNode'), detail: recordDetail('maxTokens') }
    }
    case 'unknown':
      return { id: `unknown-${node.seq}`, kind: 'unknown', stage: 'evidence', tone: 'system', badge: 'kind.system', title: t('event.unknown'), summary: node.type, observed: { input: node.type, output: node.type }, seq: node.seq, component: observedComponent('component.unknown', node.type, 'graph.evidence.unknownNode'), detail: recordDetail('unknown') }
  }
}

function partialRecord(snapshot: ConversationSnapshot, t: (key: LearningKey) => string): LearningRecord | null {
  if (snapshot.partial === null) return null
  return {
    id: 'partial', kind: 'partial', stage: 'execution', tone: 'model', badge: 'kind.model',
    title: `${t('event.partial')} · T${snapshot.partial.turn} / S${snapshot.partial.step}`,
    summary: textPreview(snapshot.partial.blocks) || t('record.fallback.partial'),
    observed: { input: t('detail.partial.input'), output: textPreview(snapshot.partial.blocks) || t('record.fallback.partial') },
    turn: snapshot.partial.turn,
    step: snapshot.partial.step,
    component: observedComponent('component.llm', t('component.stream'), 'graph.evidence.partial'),
    detail: recordDetail('partial'),
  }
}

function currentPosition(snapshot: ConversationSnapshot): { turn: number | null; step: number | null } {
  const last = snapshot.partial?.turn === undefined ? snapshot.nodes.at(-1) : snapshot.partial
  if (last === undefined) return { turn: null, step: null }
  if ('turn' in last && typeof last.turn === 'number') return { turn: last.turn, step: 'step' in last && typeof last.step === 'number' ? last.step : null }
  return { turn: null, step: null }
}

/**
 * Render the learning view from the standard session snapshot. No event
 * listener or second projection is created here.
 */
export function LearningView({ useSession, t }: ConvViewProps & PropsLocale<'learning'>): JSX.Element {
  const snapshot = useSession(value => value)
  const records = useMemo(() => {
    const values = snapshot.nodes.map(node => recordFromNode(node, t))
    const partial = partialRecord(snapshot, t)
    return partial === null ? values : [...values, partial]
  }, [snapshot, t])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<TermKey | null>(null)
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  useEffect(() => {
    if (records.length === 0) {
      setSelectedId(null)
      return
    }
    setSelectedId(current => current !== null && records.some(record => record.id === current) ? current : null)
  }, [records])
  const glossary = selectedTerm === null ? undefined : GLOSSARY[selectedTerm]
  const position = currentPosition(snapshot)
  const openTerm = (term: TermKey) => {
    setDictionaryOpen(false)
    setSelectedTerm(term)
  }

  return (
    <main className={css.root}>
      <header className={css.header}>
        <div className={css.eyebrow}><span className={css.eyebrowIcon}><IconLightOutline16 size={15} /></span>{t('header.eyebrow')}<span className={css.readonly}>{t('readonly')}</span></div>
        <h1>{t('graph.title')}</h1>
        <p>{t('graph.description')}</p>
      </header>

      <section className={css.status} aria-label={t('status.title')}>
        <div><span>{t('status.turn')}</span><strong>{position.turn === null ? '—' : position.turn}</strong></div>
        <div><span>{t('status.step')}</span><strong>{position.step === null ? '—' : position.step}</strong></div>
        <div><span>{t('status.records')}</span><strong>{records.length}</strong></div>
        <div><span>{snapshot.running ? t('status.running') : t('status.idle')}</span><i className={snapshot.running ? css.statusLive : css.statusIdle} /></div>
      </section>

      <section className={css.graphSection} aria-labelledby="learning-graph-title">
        <div className={css.graphHeader}><div><h2 id="learning-graph-title">{t('graph.timelineTitle')}</h2><p>{t('graph.timelineDescription')}</p></div><span className={css.graphLegend}>{t('graph.legend')}</span></div>
        {records.length === 0 ? (
          <div className={css.empty}><span className={css.emptyIcon}><IconLightOutline16 size={18} /></span><strong>{t('records.empty')}</strong><p>{t('records.emptyHint')}</p></div>
        ) : (
          <div className={css.eventGraph} role="list">
            {records.map((record, index) => {
              const expanded = record.id === selectedId
              const sameContextBatch = record.kind === 'context' && records[index - 1]?.kind === 'context'
              return (
                <div className={css.nodeTrack} key={record.id} role="listitem">
                  {index > 0 && <div className={`${css.connector} ${sameContextBatch ? css.contextConnector : ''}`} aria-hidden="true"><span>{sameContextBatch ? t('graph.contextBatch') : '↓'}</span></div>}
                  <button className={`${css.eventNode} ${expanded ? css.eventNodeExpanded : ''}`} data-tone={record.tone} type="button" aria-expanded={expanded} onClick={() => { setSelectedId(expanded ? null : record.id) }}>
                    <span className={css.nodeRail}><span className={css.nodeIndex}>{String(index + 1).padStart(2, '0')}</span><span className={css.nodeDot} aria-hidden="true" /></span>
                    <span className={css.nodeContent}><span className={css.nodeMeta}><span>{t(record.badge)}</span><span>{record.seq === undefined ? t('graph.streaming') : `${t('graph.event')} #${record.seq}`}</span>{record.turn === undefined ? null : <span>T{record.turn} · S{record.step}</span>}</span><strong>{record.title}</strong><span className={css.nodeSummary}>{record.summary}</span><span className={css.nodeComponent}><span>{t('graph.component')}</span><b>{t(record.component.role)}</b><code>{record.component.name}</code></span></span><span className={css.nodeToggle} aria-hidden="true">{expanded ? '−' : '+'}</span>
                  </button>
                  {expanded && <div className={css.nodeDetail}>
                    <div className={css.nodeDetailHeader}><span>{t('graph.expanded')}</span><strong>{t(`graph.stage.${record.stage}`)}</strong></div>
                    <div className={css.processFlow}>
                      <div><span>{t('graph.input')}</span><p className={css.processValue}>{record.observed.input}</p><small>{t(record.detail.input)}</small></div>
                      <div className={css.processStep}><span>{t('graph.process')}</span><p>{t(record.detail.process)}</p></div>
                      <div><span>{t('graph.output')}</span><p className={css.processValue}>{record.observed.output}</p><small>{t(record.detail.output)}</small></div>
                    </div>
                    <div className={css.nodeFacts}>
                      <div><span>{t('graph.component')}</span><p><strong>{t(record.component.role)}</strong><code>{record.component.name}</code></p><small>{t(record.component.evidence)}</small></div>
                      <div><span>{t('graph.why')}</span><p>{t(record.detail.why)}</p></div>
                      <div><span>{t('graph.next')}</span><p>{t(record.detail.next)}</p></div>
                    </div>
                    <div className={css.terms}><span>{t('inspector.terms')}</span><div>{record.detail.terms.map(term => <button className={css.termButton} key={term} type="button" aria-haspopup="dialog" aria-label={`${t('glossary.termPrefix')}：${t(term)}`} onClick={() => { openTerm(term) }}>{t(term)}</button>)}</div></div>
                  </div>}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className={css.glossarySection} aria-labelledby="learning-glossary-title">
        <div className={css.glossaryBar}><div><h2 id="learning-glossary-title">{t('glossary.indexTitle')}</h2><p>{t('glossary.indexDescription')}</p></div><button className={css.dictionaryButton} type="button" onClick={() => { setDictionaryOpen(true) }}>{t('glossary.browseAll')}</button></div>
        <div className={css.glossaryPreview}>{GLOSSARY_TERMS.slice(0, 5).map(term => <button className={css.termButton} key={term} type="button" aria-haspopup="dialog" aria-label={`${t('glossary.termPrefix')}：${t(term)}`} onClick={() => { openTerm(term) }}>{t(term)}</button>)}</div>
      </section>

      <Modal open={dictionaryOpen} onClose={() => { setDictionaryOpen(false) }} title={t('glossary.indexTitle')} closeLabel={t('glossary.close')} description={t('glossary.description')} className={css.dictionaryModal} contentClassName={css.dictionaryModalContent}>
        <div className={css.dictionaryGrid}>{GLOSSARY_TERMS.map(term => <button className={css.dictionaryTerm} key={term} type="button" aria-label={t(term)} onClick={() => { openTerm(term) }}><strong>{t(term)}</strong><span>{t(GLOSSARY[term].meaning)}</span></button>)}</div>
      </Modal>

      <Modal open={selectedTerm !== null} onClose={() => { setSelectedTerm(null) }} title={selectedTerm === null ? t('glossary.indexTitle') : `${t('glossary.termPrefix')} · ${t(selectedTerm)}`} closeLabel={t('glossary.close')} description={t('glossary.description')} className={css.glossaryModal} contentClassName={css.glossaryModalContent}>
        {selectedTerm === null || glossary === undefined ? null : <div className={css.glossaryDialog}>{(['analogy', 'meaning', 'owner', 'partners', 'location'] as const).map(field => <div className={css.glossaryRow} key={field}><strong>{t(`glossary.${field}`)}</strong><p>{t(glossary[field])}</p></div>)}</div>}
      </Modal>
    </main>
  )
}
