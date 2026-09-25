/** Client-safe payloads and event declarations owned by the agent-preset domain. */
import type { Branded } from '@deepseek-ai/dsh-brand'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'


/**
 * One declared preset as a client reads it.
 */
export interface AgentPresetRow {
  /** Stable identifier; also the label's fallback. */
  readonly id: string
  /** Whether a session naming no preset composes this one. */
  readonly isDefault: boolean
  /** Display name the preset published. */
  readonly name?: string
  /** One sentence on what this preset is for. */
  readonly description?: string
  /** Why this preset cannot compose a session; absent when it can. */
  readonly broken?: string
}

/** The roster one deployment currently supplies. */
export interface AgentPresetRoster {
  /** Every current declaration, including activation failures. */
  readonly presets: readonly AgentPresetRow[]
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** No declaration supplies the requested identity. */
    'agent-preset/not-found': { readonly agentPreset: string; readonly available: readonly string[] }
    /** The id is unusable, already taken, or its composition cannot be installed. */
    'agent-preset/invalid': { readonly agentPreset: string; readonly reason: string }
    /** The preset ships with the deployment and is not the user's to change. */
    'agent-preset/read-only': { readonly agentPreset: string; readonly reason: string }
    /** The session's conversation has started, so its composition is fixed. */
    'agent-preset/locked': { readonly sessionId: SessionId; readonly agentPreset: string }
    /** No locally authored expert exists under the requested id. */
    'expert/not-found': { readonly expertId: string }
    /** Expert input or stored data violates the expert file format. */
    'expert/invalid': { readonly expertId: string; readonly reason: string }
    /** The expert advanced after an editor or proposal loaded its base version. */
    'expert/version-conflict': { readonly expertId: string; readonly expected: number; readonly actual: number }
    /** The selected Session cannot run an expert refinement request. */
    'expert/optimization-unavailable': { readonly sessionId: SessionId; readonly reason: string }
  }
}

/** One preset's declared composition, rendered for reading. */
export interface AgentPresetDocument {
  /** The preset the composition belongs to. */
  readonly agentPreset: string
  /** The declared child plugin list as entry-list YAML, `!!js` expressions included. */
  readonly content: string
  /** Display name the preset published. */
  readonly name?: string
  /** One sentence on what this preset is for. */
  readonly description?: string
}

/** Icons offered by the expert editor. */
export type ExpertIcon = 'sparkles' | 'briefcase' | 'graduation-cap' | 'code' | 'chart'

/** One exact replacement proposed by the refinement skill. */
export interface ExpertPromptChange {
  readonly before: string
  readonly after: string
  readonly reason: string
}

/** One immutable prompt version in an expert's local directory. */
export interface ExpertVersion {
  /** Monotonic version number, starting at one. */
  readonly version: number
  /** Unix epoch milliseconds when this version was accepted. */
  readonly createdAt: number
  /** Short account of the local change. */
  readonly summary: string
  /** Evidence-backed replacements recorded with this version. */
  readonly changes: readonly ExpertPromptChange[]
}

/** Prompt text before and after one immutable expert version. */
export interface ExpertVersionComparison {
  /** Version record selected from the expert history. */
  readonly version: ExpertVersion
  /** Previous version number, absent for the initial prompt. */
  readonly previousVersion: number | null
  /** Prompt before this version; empty for the initial prompt. */
  readonly previousPrompt: string
  /** Prompt stored by this version. */
  readonly prompt: string
}

/** Expert picker row. */
export interface ExpertSummary {
  readonly id: string
  readonly name: string
  readonly welcome: string
  readonly currentVersion: number
  readonly updatedAt: number
  readonly icon?: ExpertIcon
}

/** Complete expert editor document. */
export interface ExpertDocument extends ExpertSummary {
  readonly prompt: string
  readonly versions: readonly ExpertVersion[]
}

/** Expert roster plus whether this deployment can create local entries. */
export interface ExpertRoster {
  readonly experts: readonly ExpertSummary[]
  readonly authorable: boolean
}

/** Opaque identity of one server-held refinement proposal. */
export type ExpertProposalId = Branded<'ExpertProposalId'>

/** One server-held refinement candidate awaiting confirmation. */
export interface ExpertOptimizationProposal {
  readonly proposalId: ExpertProposalId
  readonly expertId: string
  readonly targetMessageId: MessageId
  readonly baseVersion: number
  readonly status: 'changed' | 'no-change'
  readonly summary: string
  readonly originalPrompt: string
  /** Agent-authored draft; acceptance may commit a user-edited replacement. */
  readonly revisedPrompt: string
  readonly changes: readonly ExpertPromptChange[]
}

/** Published child Session backing one in-progress expert optimization. */
export interface ExpertOptimizationRun {
  readonly proposalId: ExpertProposalId
  readonly childSessionId: SessionId
}

/** Terminal result forwarded after an optimization child settles. */
export type ExpertOptimizationOutcome =
  | { readonly status: 'ready'; readonly proposal: ExpertOptimizationProposal }
  | { readonly status: 'failed'; readonly error: string }

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    agentPreset: string | null
  }
  interface SessionProjectionMap {
    /** Preset the Session runs, or null when the deployment composes none. */
    agentPreset: string | null
  }
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * One session committed a different agent preset to its durable log.
     * Consumers invalidate only state derived from that session's composition.
     * @mode emit
     * @param sessionId - the session whose composition changed.
     * @param agentPreset - the preset recorded by the committed selection.
     */
    'agent-preset/selected'(sessionId: SessionId, agentPreset: string): void
    /**
     * One expert optimization child settled for browser review.
     * @mode emit
     * @param sessionId - parent expert Session.
     * @param proposalId - optimization identity reserved before child creation.
     * @param outcome - validated candidate or caller-safe failure.
     */
    'expert/optimization-settled'(
      sessionId: SessionId,
      proposalId: ExpertProposalId,
      outcome: ExpertOptimizationOutcome,
    ): void
  }
}

export {}
