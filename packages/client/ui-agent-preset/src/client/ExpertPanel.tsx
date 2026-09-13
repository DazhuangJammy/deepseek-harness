/** Expert roster, prompt editor, version ledger, and refinement comparison. */

import { useEffect, type ReactNode } from 'react'
import { diffWordsWithSpace, type Change } from 'diff'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { ExpertIcon, ExpertOptimizationProposal } from '@deepseek-ai/dsh-agent-presets/types'
import type { InjectFace, PropsFixedSessionSlots, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button, IconCheckOutline16, IconChevronLeftOutline14, IconEditOutline16,
  IconLoadingOutline16, IconPlusOutline16, IconRefreshOutline16, IconStopFill16, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { EXPERT_ICONS, expertIcon } from './ExpertIcon.tsx'
import { expertDraftChanged, type ExpertDraft, type ExpertUiState } from './expert-store.ts'
import css from './ExpertPanel.module.css'

export interface ExpertPanelInjected {
  hooks: { expertUi: SnapshotStore<ExpertUiState> }
  load: () => Promise<void>
  openList: () => void
  beginCreate: () => void
  beginEdit: (id: string) => Promise<void>
  openVersion: (version: number) => Promise<void>
  closeVersion: () => void
  patchDraft: (patch: Partial<ExpertDraft>) => void
  patchOptimization: (prompt: string) => void
  save: () => Promise<void>
  accept: () => Promise<void>
  dismissOptimization: () => void
}

export type ExpertPanelProps =
  PropsRuntime<'sidebar.right.pane.tab'>
  & PropsFixedSessionSlots<'conversation.view'>
  & PropsLocale<'settings.agentPreset'>
  & InjectFace<ExpertPanelInjected>

function IconChoice({ icon, selected, disabled, onSelect, label }: {
  icon: ExpertIcon
  selected: boolean
  disabled: boolean
  onSelect: () => void
  label: string
}): ReactNode {
  const Icon = expertIcon(icon)
  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        className={css.iconChoice}
        aria-label={label}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
      >
        <Icon />
      </button>
    </Tooltip>
  )
}

function Editor({ state, actions, t }: {
  state: Extract<ExpertUiState['editor'], { kind: 'create' | 'edit' }>
  actions: Pick<ExpertPanelInjected, 'openList' | 'openVersion' | 'patchDraft' | 'save'>
  t: ExpertPanelProps['t']
}): ReactNode {
  const { draft } = state
  const create = state.kind === 'create'
  const changed = state.kind === 'create' || expertDraftChanged(state.document, draft)
  const saveLabel = state.saving
    ? t('expert.saving')
    : state.saved && !changed ? t('expert.saved') : t('expert.save')
  const title = create ? t('expert.create') : t('expert.edit', { name: state.document.name })
  return (
    <div className={css.page}>
      <header className={css.header}>
        <button type="button" className={css.iconButton} aria-label={t('expert.back')} onClick={actions.openList}>
          <IconChevronLeftOutline14 />
        </button>
        <div>
          <h2>{title}</h2>
          <p>{create ? t('expert.createHint') : t('expert.editHint')}</p>
        </div>
      </header>

      <div className={css.form}>
        <label className={css.field}>
          <span>{t('expert.name')}</span>
          <input
            value={draft.name}
            disabled={state.saving}
            placeholder={t('expert.namePlaceholder')}
            onChange={(event) => { actions.patchDraft({ name: event.target.value }) }}
          />
        </label>
        <fieldset className={css.iconField}>
          <legend>{t('expert.icon')}</legend>
          <div className={css.iconChoices}>
            {EXPERT_ICONS.map(icon => (
              <IconChoice
                key={icon}
                icon={icon}
                selected={draft.icon === icon}
                disabled={state.saving}
                label={t(`expert.icon.${icon}`)}
                onSelect={() => { actions.patchDraft({ icon: draft.icon === icon ? undefined : icon }) }}
              />
            ))}
          </div>
        </fieldset>
        <label className={css.field}>
          <span>{t('expert.welcome')}</span>
          <textarea
            className={css.welcome}
            value={draft.welcome}
            disabled={state.saving}
            placeholder={t('expert.welcomePlaceholder')}
            onChange={(event) => { actions.patchDraft({ welcome: event.target.value }) }}
          />
        </label>
        <label className={css.field}>
          <span>{t('expert.prompt')}</span>
          <textarea
            className={css.prompt}
            value={draft.prompt}
            disabled={state.saving}
            spellCheck={false}
            placeholder={t('expert.promptPlaceholder')}
            onChange={(event) => { actions.patchDraft({ prompt: event.target.value }) }}
          />
        </label>
        {state.error !== null && <p className={css.error} role="alert">{state.error}</p>}
        <div className={css.formActions}>
          <Button variant="outline" disabled={state.saving} onClick={actions.openList}>{t('cancel')}</Button>
          <Button
            icon={state.saving ? <IconLoadingOutline16 className={css.spinning} /> : <IconCheckOutline16 />}
            disabled={state.saving || !changed || draft.name.trim() === '' || draft.prompt.trim() === ''}
            onClick={() => { void actions.save() }}
          >
            <span aria-live="polite">{saveLabel}</span>
          </Button>
        </div>
      </div>

      {state.kind === 'edit' && (
        <section className={css.history}>
          <h3>{t('expert.history')}</h3>
          <ol>
            {state.document.versions.map(version => (
              <li key={version.version}>
                <button
                  type="button"
                  aria-label={t('expert.viewVersion', { version: version.version })}
                  onClick={() => { void actions.openVersion(version.version) }}
                >
                  <span>{t('expert.version', { version: version.version })}</span>
                  <strong>{version.summary}</strong>
                  <time dateTime={new Date(version.createdAt).toISOString()}>
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(version.createdAt)}
                  </time>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function VersionReview({ state, actions, t }: {
  state: Omit<Extract<ExpertUiState['editor'], { kind: 'edit' }>, 'versionReview'> & {
    versionReview: Exclude<Extract<ExpertUiState['editor'], { kind: 'edit' }>['versionReview'], null>
  }
  actions: Pick<ExpertPanelInjected, 'closeVersion' | 'openVersion'>
  t: ExpertPanelProps['t']
}): ReactNode {
  const review = state.versionReview
  const version = review.status === 'ready' ? review.comparison.version.version : review.version
  return (
    <div className={css.page}>
      <header className={css.header}>
        <button type="button" className={css.iconButton} aria-label={t('expert.backToEditor')} onClick={actions.closeVersion}>
          <IconChevronLeftOutline14 />
        </button>
        <div>
          <h2>{t('expert.versionReview', { version })}</h2>
          <p>{t('expert.versionReviewHint')}</p>
        </div>
      </header>
      {review.status === 'loading' && (
        <div className={css.center} role="status">
          <IconLoadingOutline16 className={css.spinning} />
          {t('expert.loadingVersion')}
        </div>
      )}
      {review.status === 'failed' && (
        <div className={css.center} role="alert">
          <strong>{t('expert.versionLoadFailed')}</strong>
          <span>{review.error}</span>
          <Button variant="outline" onClick={() => { void actions.openVersion(review.version) }}>{t('retry')}</Button>
        </div>
      )}
      {review.status === 'ready' && (() => {
        const { comparison } = review
        const changes = diffWordsWithSpace(comparison.previousPrompt, comparison.prompt)
        return (
          <div className={css.diffGrid}>
            <DiffSide
              title={comparison.previousVersion === null
                ? t('expert.noPreviousVersion')
                : t('expert.versionPrompt', { version: comparison.previousVersion })}
              changes={changes}
              side="old"
            />
            <DiffSide
              title={t('expert.versionPrompt', { version: comparison.version.version })}
              changes={changes}
              side="new"
            />
          </div>
        )
      })()}
    </div>
  )
}

function DiffSide({ title, changes, side }: {
  title: string
  changes: readonly Change[]
  side: 'old' | 'new'
}): ReactNode {
  return (
    <section className={css.diffSide}>
      <h3>{title}</h3>
      <pre>
        {changes.map((part, index) => {
          if ((side === 'old' && part.added) || (side === 'new' && part.removed)) return null
          const changed = side === 'old' ? part.removed : part.added
          return <mark key={index} data-changed={changed || undefined}>{part.value}</mark>
        })}
      </pre>
    </section>
  )
}

function EditableDiffSide({ title, changes, value, onChange }: {
  title: string
  changes: readonly Change[]
  value: string
  onChange: (value: string) => void
}): ReactNode {
  return (
    <section className={css.diffSide}>
      <h3>{title}</h3>
      <div className={css.editableDiff}>
        <pre className={css.diffPreview} aria-hidden="true">
          {changes.map((part, index) => part.removed
            ? null
            : <mark key={index} data-changed={part.added || undefined}>{part.value}</mark>)}
        </pre>
        <textarea
          className={css.revisedPrompt}
          aria-label={title}
          value={value}
          spellCheck={false}
          onChange={(event) => { onChange(event.target.value) }}
        />
      </div>
    </section>
  )
}

function Review({ proposal, revisedPrompt, accepting, error, actions, t }: {
  proposal: ExpertOptimizationProposal
  revisedPrompt: string
  accepting: boolean
  error: string | null
  actions: Pick<ExpertPanelInjected, 'accept' | 'dismissOptimization' | 'patchOptimization'>
  t: ExpertPanelProps['t']
}): ReactNode {
  const changes = diffWordsWithSpace(proposal.originalPrompt, revisedPrompt)
  const changed = proposal.status === 'changed'
  return (
    <div className={css.page}>
      <header className={css.reviewHeader}>
        <h2>{changed ? t('expert.reviewTitle') : t('expert.noChangeTitle')}</h2>
        <p>{proposal.summary}</p>
      </header>
      {changed && (
        <>
          <div className={css.diffGrid}>
            <DiffSide title={t('expert.original')} changes={changes} side="old" />
            <EditableDiffSide
              title={t('expert.revised')}
              changes={changes}
              value={revisedPrompt}
              onChange={actions.patchOptimization}
            />
          </div>
          <section className={css.changeList}>
            <h3>{t('expert.changeReasons')}</h3>
            <ol>
              {proposal.changes.map((change, index) => <li key={index}>{change.reason}</li>)}
            </ol>
          </section>
        </>
      )}
      {error !== null && <p className={css.error} role="alert">{error}</p>}
      <div className={css.reviewActions}>
        <Button variant="outline" disabled={accepting} onClick={actions.dismissOptimization}>{t('expert.dismiss')}</Button>
        {changed && (
          <Button
            icon={accepting ? <IconLoadingOutline16 className={css.spinning} /> : <IconCheckOutline16 />}
            disabled={accepting || revisedPrompt.trim() === '' || revisedPrompt === proposal.originalPrompt}
            onClick={() => { void actions.accept() }}
          >
            {accepting ? t('expert.accepting') : t('expert.accept')}
          </Button>
        )}
      </div>
    </div>
  )
}

function OptimizationRunHeader({ stop, t }: {
  stop: () => void
  t: ExpertPanelProps['t']
}): ReactNode {
  return (
    <div className={css.agentRunStatus}>
      <span className={css.agentRunStatusCopy} role="status">
        <IconLoadingOutline16 className={css.spinning} />
        <span>{t('expert.optimizing')}</span>
      </span>
      <Tooltip label={t('expert.stopOptimization')} side="bottom">
        <button
          type="button"
          className={`${css.iconButton} ${css.agentRunStop}`}
          aria-label={t('expert.stopOptimization')}
          onClick={() => { stop() }}
        >
          <IconStopFill16 />
        </button>
      </Tooltip>
    </div>
  )
}

/** Render the current Session's optimization first, otherwise the shared expert manager. */
export function ExpertPanel(props: ExpertPanelProps): ReactNode {
  const {
    sessionId, useExpertUi, load, openList, beginCreate, beginEdit, openVersion, closeVersion, patchDraft,
    patchOptimization, save, accept, dismissOptimization, FixedSessionSlotView, t,
  } = props
  const state = useExpertUi(value => value)
  const optimization = state.optimizations.get(sessionId)
  useEffect(() => { void load() }, [load])

  if (optimization?.status === 'starting') {
    return (
      <div className={css.agentRun}>
        <OptimizationRunHeader stop={dismissOptimization} t={t} />
        <div className={css.center}>
          <span>{t('expert.optimizingHint')}</span>
        </div>
      </div>
    )
  }
  if (optimization?.status === 'running') {
    return (
      <div className={css.agentRun}>
        <OptimizationRunHeader stop={dismissOptimization} t={t} />
        <FixedSessionSlotView
          sessionId={optimization.childSessionId}
          slot="conversation.view"
          owner={{ viewRequest: null, openView: () => undefined, completeViewRequest: () => undefined }}
          options={{ only: 'chat' }}
        />
      </div>
    )
  }
  if (optimization?.status === 'failed') {
    return (
      <div className={css.center} role="alert">
        <strong>{t('expert.optimizeFailed')}</strong>
        <span>{optimization.error}</span>
        <Button variant="outline" onClick={dismissOptimization}>{t('close')}</Button>
      </div>
    )
  }
  if (optimization?.status === 'ready') {
    return (
      <Review
        proposal={optimization.proposal}
        revisedPrompt={optimization.revisedPrompt}
        accepting={optimization.accepting}
        error={optimization.error}
        actions={{ accept, dismissOptimization, patchOptimization }}
        t={t}
      />
    )
  }
  if (state.editor.kind === 'loading') {
    return <div className={css.center} role="status"><IconLoadingOutline16 className={css.spinning} />{t('expert.loading')}</div>
  }
  if (state.editor.kind === 'create' || state.editor.kind === 'edit') {
    if (state.editor.kind === 'edit' && state.editor.versionReview !== null) {
      return (
        <VersionReview
          state={{ ...state.editor, versionReview: state.editor.versionReview }}
          actions={{ closeVersion, openVersion }}
          t={t}
        />
      )
    }
    return <Editor state={state.editor} actions={{ openList, openVersion, patchDraft, save }} t={t} />
  }
  return (
    <div className={css.page}>
      <header className={css.header}>
        <div>
          <h2>{t('expert.manage')}</h2>
          <p>{t('expert.manageHint')}</p>
        </div>
        <Tooltip label={t('retry')} side="bottom">
          <button type="button" className={css.iconButton} aria-label={t('retry')} onClick={() => { void load() }}>
            <IconRefreshOutline16 />
          </button>
        </Tooltip>
      </header>
      {state.error !== null && <p className={css.error} role="alert">{state.error}</p>}
      <div className={css.roster}>
        {state.experts.map((expert) => {
          const Icon = expertIcon(expert.icon)
          return (
            <div className={css.expertRow} key={expert.id}>
              <span className={css.rowIcon}><Icon /></span>
              <span className={css.rowCopy}>
                <span className={css.rowTitle}>
                  <strong>{expert.name}</strong>
                  <span className={css.rowVersion}>{t('expert.version', { version: expert.currentVersion })}</span>
                </span>
                <span className={css.rowWelcome}>{expert.welcome || t('expert.noWelcome')}</span>
              </span>
              <Tooltip label={t('expert.edit', { name: expert.name })} side="bottom">
                <button
                  type="button"
                  className={css.iconButton}
                  aria-label={t('expert.edit', { name: expert.name })}
                  onClick={() => { void beginEdit(expert.id) }}
                >
                  <IconEditOutline16 />
                </button>
              </Tooltip>
            </div>
          )
        })}
        {state.status === 'loading' && state.experts.length === 0 && (
          <div className={css.center} role="status"><IconLoadingOutline16 className={css.spinning} />{t('expert.loading')}</div>
        )}
        {state.status === 'ready' && state.experts.length === 0 && (
          <div className={css.empty}><strong>{t('expert.empty')}</strong><span>{t('expert.emptyHint')}</span></div>
        )}
      </div>
      <Button
        icon={<IconPlusOutline16 />}
        disabled={!state.authorable}
        title={state.authorable ? undefined : t('duplicateUnavailable')}
        onClick={beginCreate}
      >
        {t('expert.create')}
      </Button>
    </div>
  )
}
