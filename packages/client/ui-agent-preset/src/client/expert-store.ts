/** Browser state for the expert roster, editor, and per-Session refinement review. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {
  ExpertDocument, ExpertIcon, ExpertOptimizationOutcome, ExpertOptimizationProposal,
  ExpertProposalId, ExpertSummary, ExpertVersionComparison,
} from '@deepseek-ai/dsh-agent-presets/types'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Editable expert fields shared by create and update. */
export interface ExpertDraft {
  readonly id: string
  readonly name: string
  readonly welcome: string
  readonly prompt: string
  readonly icon: ExpertIcon | undefined
}

/** Lazy state for one read-only prompt-version comparison. */
export type ExpertVersionReviewState =
  | { readonly status: 'loading'; readonly version: number }
  | { readonly status: 'ready'; readonly comparison: ExpertVersionComparison }
  | { readonly status: 'failed'; readonly version: number; readonly error: string }

/** Expert manager route and its asynchronous save state. */
export type ExpertEditorState =
  | { readonly kind: 'list' }
  | { readonly kind: 'loading'; readonly id: string }
  | {
    readonly kind: 'create'
    readonly draft: ExpertDraft
    readonly saving: boolean
    readonly saved: boolean
    readonly error: string | null
  }
  | {
    readonly kind: 'edit'
    readonly document: ExpertDocument
    readonly draft: ExpertDraft
    readonly saving: boolean
    readonly saved: boolean
    readonly error: string | null
    readonly versionReview: ExpertVersionReviewState | null
  }

/** One Session's refinement progress, candidate, or failure. */
export type ExpertOptimizationState =
  | { readonly status: 'starting' }
  | { readonly status: 'running'; readonly proposalId: ExpertProposalId; readonly childSessionId: SessionId }
  | {
    readonly status: 'ready'
    readonly proposal: ExpertOptimizationProposal
    readonly revisedPrompt: string
    readonly accepting: boolean
    readonly error: string | null
  }
  | { readonly status: 'failed'; readonly error: string; readonly proposalId?: ExpertProposalId }

/** Complete state shared by every expert UI contribution. */
export interface ExpertUiState {
  readonly status: 'idle' | 'loading' | 'ready' | 'error'
  readonly error: string | null
  readonly authorable: boolean
  readonly experts: readonly ExpertSummary[]
  readonly editor: ExpertEditorState
  readonly optimizations: ReadonlyMap<SessionId, ExpertOptimizationState>
}

const INITIAL: ExpertUiState = {
  status: 'idle',
  error: null,
  authorable: false,
  experts: [],
  editor: { kind: 'list' },
  optimizations: new Map(),
}

function draftOf(document: ExpertDocument): ExpertDraft {
  return {
    id: document.id,
    name: document.name,
    welcome: document.welcome,
    prompt: document.prompt,
    icon: document.icon,
  }
}

/**
 * Compare editable fields with the last committed expert document.
 * @param document - last document returned by the Host.
 * @param draft - current browser draft.
 * @returns whether saving would persist at least one changed field.
 */
export function expertDraftChanged(document: ExpertDocument, draft: ExpertDraft): boolean {
  return draft.name !== document.name
    || draft.welcome !== document.welcome
    || draft.prompt !== document.prompt
    || draft.icon !== document.icon
}

/** One root controller shared by the picker, welcome row, action, and Sidebar tab. */
export class ExpertUiController {
  /** Shared snapshot consumed by every expert contribution. */
  readonly store: SnapshotStore<ExpertUiState> = createSnapshotStore(INITIAL)

  /** Cancellation owner of the latest in-flight optimization start for each Session. */
  private readonly optimizationRuns = new Map<SessionId, AbortController>()

  /** Settlements that beat the start response and child-session observation. */
  private readonly pendingOutcomes = new Map<ExpertProposalId, ExpertOptimizationOutcome>()

  /** @param ctx - browser plugin context carrying the generated agentPresets Remote namespace. */
  constructor(private readonly ctx: ClientContext) {}

  private set(patch: Partial<ExpertUiState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  private setOptimization(sessionId: SessionId, value: ExpertOptimizationState | undefined): void {
    const optimizations = new Map(this.store.getSnapshot().optimizations)
    if (value === undefined) optimizations.delete(sessionId)
    else optimizations.set(sessionId, value)
    this.set({ optimizations })
  }

  private applyOptimizationOutcome(
    sessionId: SessionId,
    proposalId: ExpertProposalId,
    outcome: ExpertOptimizationOutcome,
  ): boolean {
    const current = this.store.getSnapshot().optimizations.get(sessionId)
    if (current?.status !== 'running' || current.proposalId !== proposalId) return false
    this.setOptimization(sessionId, outcome.status === 'ready'
      ? {
        status: 'ready',
        proposal: outcome.proposal,
        revisedPrompt: outcome.proposal.revisedPrompt,
        accepting: false,
        error: null,
      }
      : { status: 'failed', error: outcome.error, proposalId })
    return true
  }

  /**
   * Apply a Host-forwarded child settlement, retaining it when start is still crossing the wire.
   * @param sessionId - parent expert Session.
   * @param proposalId - optimization identity reserved before child creation.
   * @param outcome - validated proposal or failure.
   */
  settleOptimization(
    sessionId: SessionId,
    proposalId: ExpertProposalId,
    outcome: ExpertOptimizationOutcome,
  ): void {
    if (this.applyOptimizationOutcome(sessionId, proposalId, outcome)) return
    if (this.store.getSnapshot().optimizations.get(sessionId)?.status === 'starting') {
      this.pendingOutcomes.set(proposalId, outcome)
    }
  }

  /** Load the current expert roster. */
  async load(): Promise<void> {
    if (this.store.getSnapshot().status === 'loading') return
    this.set({ status: 'loading', error: null })
    const result = await this.ctx.remote.agentPresets.listExperts()
    if (!result.ok) {
      this.set({ status: 'error', error: result.error.message })
      return
    }
    this.set({
      status: 'ready',
      error: null,
      authorable: result.value.authorable,
      experts: result.value.experts,
    })
  }

  /**
   * Show the roster in the Sidebar.
   * @param sessionId - Session whose optimization view is being left.
   */
  openList(sessionId: SessionId): void {
    this.dismissOptimization(sessionId)
    this.set({ editor: { kind: 'list' } })
    void this.load()
  }

  /**
   * Start a new expert draft.
   * @param sessionId - Session whose optimization view is being left.
   */
  beginCreate(sessionId: SessionId): void {
    this.dismissOptimization(sessionId)
    this.set({
      editor: {
        kind: 'create',
        draft: { id: `expert-${globalThis.crypto.randomUUID()}`, name: '', welcome: '', prompt: '', icon: undefined },
        saving: false,
        saved: false,
        error: null,
      },
    })
  }

  /**
   * Load one expert into the editor.
   * @param sessionId - Session whose optimization view is being left.
   * @param id - expert preset id.
   */
  async beginEdit(sessionId: SessionId, id: string): Promise<void> {
    this.dismissOptimization(sessionId)
    this.set({ editor: { kind: 'loading', id } })
    const result = await this.ctx.remote.agentPresets.readExpert(id)
    if (!result.ok) {
      this.set({ status: 'error', error: result.error.message, editor: { kind: 'list' } })
      return
    }
    this.set({
      editor: {
        kind: 'edit',
        document: result.value,
        draft: draftOf(result.value),
        saving: false,
        saved: false,
        error: null,
        versionReview: null,
      },
    })
  }

  /**
   * Load one immutable prompt version and its predecessor for review.
   * @param version - selected version number.
   */
  async openVersion(version: number): Promise<void> {
    const editor = this.store.getSnapshot().editor
    if (editor.kind !== 'edit') return
    const pending = { status: 'loading' as const, version }
    this.set({ editor: { ...editor, versionReview: pending } })
    const result = await this.ctx.remote.agentPresets.readExpertVersion(editor.document.id, version)
    const current = this.store.getSnapshot().editor
    if (current.kind !== 'edit' || current.versionReview !== pending) return
    this.set({
      editor: {
        ...current,
        versionReview: result.ok
          ? { status: 'ready', comparison: result.value }
          : { status: 'failed', version, error: result.error.message },
      },
    })
  }

  /** Return from a historical comparison without discarding the editor draft. */
  closeVersion(): void {
    const editor = this.store.getSnapshot().editor
    if (editor.kind !== 'edit' || editor.versionReview === null) return
    this.set({ editor: { ...editor, versionReview: null } })
  }

  /**
   * Replace selected draft fields without changing editor identity.
   * @param patch - fields changed by the current control.
   */
  patchDraft(patch: Partial<ExpertDraft>): void {
    const editor = this.store.getSnapshot().editor
    if (editor.kind !== 'create' && editor.kind !== 'edit') return
    this.set({ editor: { ...editor, draft: { ...editor.draft, ...patch }, saved: false, error: null } })
  }

  /**
   * Persist the open create or edit draft for the currently displayed Session.
   * @param sessionId - Session that receives a changed prompt when it runs the edited expert.
   */
  async save(sessionId: SessionId): Promise<void> {
    const editor = this.store.getSnapshot().editor
    if (editor.kind !== 'create' && editor.kind !== 'edit') return
    if (editor.saving || (editor.kind === 'edit' && !expertDraftChanged(editor.document, editor.draft))) return
    this.set({ editor: { ...editor, saving: true, saved: false, error: null } })
    const { draft } = editor
    const result = editor.kind === 'create'
      ? await this.ctx.remote.agentPresets.createExpert(
        draft.id, draft.name, draft.welcome, draft.prompt, draft.icon,
      )
      : await this.ctx.remote.agentPresets.saveExpert(
        sessionId,
        editor.document.id,
        editor.document.currentVersion,
        draft.name,
        draft.welcome,
        draft.prompt,
        draft.icon,
      )
    if (result.ok) {
      const document = result.value
      this.set({
        editor: {
          kind: 'edit', document, draft: draftOf(document), saving: false, saved: true, error: null, versionReview: null,
        },
      })
      await this.load()
    } else {
      const current = this.store.getSnapshot().editor
      if (current.kind === editor.kind) {
        this.set({ editor: { ...current, saving: false, saved: false, error: result.error.message } })
      }
    }
  }

  /**
   * Select an expert for one blank Session through the existing preset switch.
   * @param sessionId - blank Session receiving the expert preset.
   * @param id - selected expert preset id.
   * @returns Host refusal text, or undefined after selection.
   */
  async select(sessionId: SessionId, id: string): Promise<string | undefined> {
    const result = await this.ctx.remote.agentPresets.select(sessionId, id)
    if (result.ok) return undefined
    this.set({ status: 'error', error: result.error.message })
    return result.error.message
  }

  /**
   * Start a refinement request and retain the candidate under its Session.
   * @param sessionId - expert Session requesting refinement.
   * @param messageId - finalized answer ending the evidence window.
   */
  async optimize(sessionId: SessionId, messageId: MessageId): Promise<void> {
    this.dismissOptimization(sessionId)
    const operation = new AbortController()
    this.optimizationRuns.set(sessionId, operation)
    this.setOptimization(sessionId, { status: 'starting' })
    let result
    try {
      result = await this.ctx.remote.agentPresets.optimizeExpert(sessionId, messageId, operation.signal)
    } catch (error) {
      if (this.optimizationRuns.get(sessionId) !== operation) return
      this.optimizationRuns.delete(sessionId)
      this.setOptimization(sessionId, { status: 'failed', error: String(error) })
      return
    }
    if (this.optimizationRuns.get(sessionId) !== operation) {
      if (result.ok) {
        void this.ctx.remote.agentPresets.dismissExpertOptimization(sessionId, result.value.proposalId)
      }
      return
    }
    if (!result.ok) {
      this.optimizationRuns.delete(sessionId)
      this.setOptimization(sessionId, { status: 'failed', error: result.error.message })
      return
    }
    try {
      await this.ctx.sessions.observeSubagent({
        parentSessionId: sessionId,
        childSessionId: result.value.childSessionId,
        mode: 'one-shot',
      })
    } catch (error) {
      this.optimizationRuns.delete(sessionId)
      void this.ctx.remote.agentPresets.dismissExpertOptimization(sessionId, result.value.proposalId)
      this.setOptimization(sessionId, { status: 'failed', error: String(error) })
      return
    }
    if (this.optimizationRuns.get(sessionId) !== operation) {
      void this.ctx.remote.agentPresets.dismissExpertOptimization(sessionId, result.value.proposalId)
      return
    }
    this.optimizationRuns.delete(sessionId)
    this.setOptimization(sessionId, {
      status: 'running',
      proposalId: result.value.proposalId,
      childSessionId: result.value.childSessionId,
    })
    const outcome = this.pendingOutcomes.get(result.value.proposalId)
    if (outcome !== undefined) {
      this.pendingOutcomes.delete(result.value.proposalId)
      this.applyOptimizationOutcome(sessionId, result.value.proposalId, outcome)
    }
  }

  /**
   * Replace the user-editable proposed prompt without changing the Host proposal identity.
   * @param sessionId - Session that owns the review.
   * @param revisedPrompt - complete edited prompt shown in the comparison.
   */
  patchOptimization(sessionId: SessionId, revisedPrompt: string): void {
    const current = this.store.getSnapshot().optimizations.get(sessionId)
    if (current?.status !== 'ready') return
    this.setOptimization(sessionId, { ...current, revisedPrompt, error: null })
  }

  /**
   * Accept the exact candidate held by the Host and refresh the roster.
   * @param sessionId - Session that owns the candidate.
   */
  async accept(sessionId: SessionId): Promise<void> {
    const current = this.store.getSnapshot().optimizations.get(sessionId)
    if (current?.status !== 'ready' || current.proposal.status !== 'changed') return
    const accepting: ExpertOptimizationState = { ...current, accepting: true, error: null }
    this.setOptimization(sessionId, accepting)
    const result = await this.ctx.remote.agentPresets.acceptExpertOptimization(
      sessionId,
      current.proposal.proposalId,
      current.revisedPrompt,
    )
    if (this.store.getSnapshot().optimizations.get(sessionId) !== accepting) {
      if (result.ok) await this.load()
      return
    }
    if (!result.ok) {
      this.setOptimization(sessionId, { ...current, accepting: false, error: result.error.message })
      return
    }
    this.setOptimization(sessionId, undefined)
    await this.load()
    await this.beginEdit(sessionId, result.value.id)
  }

  /**
   * Dismiss one Session's settled refinement state.
   * @param sessionId - Session whose candidate or failure is cleared.
   */
  dismissOptimization(sessionId: SessionId): void {
    this.optimizationRuns.get(sessionId)?.abort()
    this.optimizationRuns.delete(sessionId)
    const current = this.store.getSnapshot().optimizations.get(sessionId)
    const proposalId = current?.status === 'running'
      ? current.proposalId
      : current?.status === 'ready'
        ? current.proposal.proposalId
        : current?.status === 'failed'
          ? current.proposalId
          : undefined
    if (proposalId !== undefined) {
      this.pendingOutcomes.delete(proposalId)
      void this.ctx.remote.agentPresets.dismissExpertOptimization(sessionId, proposalId)
    }
    this.setOptimization(sessionId, undefined)
  }
}
