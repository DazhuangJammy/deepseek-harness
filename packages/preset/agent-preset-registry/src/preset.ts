import type { Volatile } from '@deepseek-ai/cordis'
/** Public preset roster and selection configuration. */
/** One declared preset and its current activation failure, if any. */
export interface AgentPreset {
  readonly id: string
  readonly name?: string
  readonly description?: string
  readonly order?: number
  readonly broken?: string
}

/** Registry selection policy. */
export interface Config {
  /** Deployment default when the caller omits a preset. */
  default: string
  /** User-selected default; edited through Settings. */
  selectedDefault: Volatile<string | undefined>
  /**
   * Directories scanned for locally authored experts, in precedence order.
   *
   * Omitted, the harness-home user root is scanned alone. Declaring any root
   * REPLACES that list — a deployment that keeps its experts elsewhere and
   * still wants the harness-home ones must name both — because a scan of a
   * root the caller did not name is exactly the surprise this field removes.
   */
  readonly roots?: readonly PresetRoot[]
  /** Deployment-varying limits for the expert-prompt workflow; each defaults independently. */
  readonly experts?: Partial<ExpertConfig>
}

/*
 * Local expert-store vocabulary.
 *
 * Declarative presets know nothing about directories: the registry mounts them
 * from the entry list a declaring plugin supplies. Locally authored experts are
 * the exception — their prompt is versioned in files the Host reads and writes,
 * so the Expert layer carries a directory beside the read model. Keeping that
 * vocabulary here, additive to the declarative one above, is what lets the two
 * coexist without either widening the other.
 */

/**
 * Where a preset's composition came from. A `system` preset ships with the
 * deployment; a `user` preset was authored locally, by a person or by an
 * agent, and therefore carries the same trust as shell access.
 */
export type PresetTrust = 'system' | 'user'

/**
 * Ids a preset directory may use.
 *
 * The id becomes a path segment, so this is a containment boundary rather than
 * a style rule: `..`, a separator, or an absolute-looking name would place the
 * composition outside the root the deployment authorised.
 */
export const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/

/** One directory scanned for preset subdirectories. */
export interface PresetRoot {
  /** Directory holding one subdirectory per preset; a leading `~` expands. */
  path: string
  /** Trust recorded on every preset discovered under this root. */
  trust: PresetTrust
}

/** Deployment-varying limits for the expert-prompt workflow. */
export interface ExpertConfig {
  /** Maximum Unicode characters in an expert's display name. */
  maxNameCharacters: number
  /** Maximum Unicode characters in an expert's welcome message. */
  maxWelcomeCharacters: number
  /** Maximum UTF-8 bytes in one prompt version. */
  maxPromptBytes: number
  /** Maximum recent human inputs and assistant final-text answers supplied as refinement evidence. */
  maxEvidenceMessages: number
}

/** Defaults applied explicitly by the registry when callers omit expert policy. */
export const DEFAULT_EXPERT_CONFIG: Readonly<ExpertConfig> = {
  maxNameCharacters: 80,
  maxWelcomeCharacters: 500,
  maxPromptBytes: 100_000,
  maxEvidenceMessages: 12,
}

/**
 * One expert-store preset: the registry read model plus the directory its
 * prompt versions live in.
 *
 * Expert operations take this rather than the declarative {@link AgentPreset}
 * because they read and write files — the one thing a declaration has no
 * directory for.
 */
export interface ExpertPreset {
  /** Stable identifier; also the directory name. */
  readonly id: string
  /** Absolute path of the preset's composition file. */
  readonly path: string
  /** Root this preset was discovered under; only `user` experts are writable. */
  readonly trust: PresetTrust
}
