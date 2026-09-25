/** Declarative Agent capability sets, activation and session binding. */
import { randomUUID } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { bindScopeParent, createScope, scopeOf, type Scope, type ScopeKey, type ScopeParentBinding } from '@deepseek-ai/dsh-scope'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { dump } from 'js-yaml'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { brandString } from '@deepseek-ai/dsh-brand'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type { ContentBlock, UserMessage } from '@deepseek-ai/dsh-llm'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { PERSONA_PREFIX_SECTION } from '@deepseek-ai/dsh-system-prompt'
// Type-only: the optional `settings` service this registry keeps off the generated pages.
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-tools'
// Type-only: resolves the `skills` service the expert refiner registers against.
import type {} from '@deepseek-ai/dsh-skill'
import type {
  AgentPresetDocument, AgentPresetRoster, ExpertDocument, ExpertIcon,
  ExpertOptimizationOutcome, ExpertOptimizationProposal, ExpertOptimizationRun,
  ExpertProposalId, ExpertRoster, ExpertVersionComparison,
} from './types.ts'
import { entryListProblem, type PresetDefinition } from './definition.ts'
import type { AgentPreset, Config, ExpertConfig, ExpertPreset, PresetRoot } from './preset.ts'
import { DEFAULT_EXPERT_CONFIG, PRESET_ID } from './preset.ts'
import { agentPresetProjectionDefinition } from './session.ts'
import { auditRows, mountPreset, standingMountFor, serviceForAgent, type PresetMount } from './mount.ts'
import { definitionComposition, mountedCompositionRows, type AgentPresetComposition } from './composition-inventory.ts'
import { findExpertVersion, readExpertDocument, readExpertSummary,
  readExpertVersionComparison, synchronizeExpertComposition, updateExpert, createExpert, validateExpertInput } from './expert.ts'
import { USER_PRESET_DIR, discoverExpertPresets, expertDefinition, scanRoot } from './expert-install.ts'
import { buildExpertOptimizationTask, EXPERT_OPTIMIZATION_OUTPUT_SCHEMA,
  expertPromptRefinerRegistration, expertProposalFromOutput } from './expert-optimizer.ts'
import { expertRefinementProjectionDefinition, type ExpertPromptApplicationSource } from './expert-session.ts'

export { agentPresetProjectionDefinition } from './session.ts'
export { entryListProblem, type PresetDefinition } from './definition.ts'
export { auditRows, livePresetMounts, leakedServices, serviceForAgent, standingMountFor, type PresetMount, type RowAudit } from './mount.ts'
export type { AgentPreset, Config, ExpertConfig, ExpertPreset, PresetRoot, PresetTrust } from './preset.ts'
export { DEFAULT_EXPERT_CONFIG, PRESET_ID } from './preset.ts'
export {
  COMPOSITION_FILE, USER_PRESET_DIR, discoverExpertPresets, expertDefinition, scanRoot,
} from './expert-install.ts'
export {
  METADATA_FILE, readPresetMetadata, renderPresetMetadata, type PresetMetadata,
} from './metadata.ts'
export { readExpertSummary, readExpertDocument, readExpertVersionComparison, expertComposition } from './expert.ts'
export { writableRoot } from './authoring.ts'
export type * from './types.ts'

/** Refuse an empty preset id before invoking a domain operation. */
function validatePresetId(value: string, field: 'agentPreset' | 'from'): void {
  if (value.length === 0) {
    throw new RemoteError('gateway/bad-request', `${field} must be a non-empty string`, {})
  }
}

/** Minimal subagent result consumed without introducing a preset↔subagent package cycle. */
interface ExpertSubagentRun {
  readonly id: SessionId
  readonly result: Promise<{
    readonly output: ContentBlock[]
    readonly structured?: unknown
    readonly diagnostic?: string
    readonly stopReason: string
  }>
  dispose(): Promise<void>
}

/** One server-held optimization operation and its idempotent cleanup. */
interface HeldExpertOptimization {
  readonly sessionId: SessionId
  readonly run: ExpertSubagentRun
  proposal?: ExpertOptimizationProposal
  disposal?: Promise<void>
}

/** Runtime subagent face used only by the expert optimization coordinator. */
interface ExpertSubagentRuntime {
  start(name: string, request: {
    readonly parent: Agent
    readonly label: string
    readonly prompt: ContentBlock[]
    readonly promptContext: UserMessage
    readonly outputSchema: object
    readonly signal: AbortSignal
    readonly agentPreset: string
  }): Promise<ExpertSubagentRun>
}


declare module '@deepseek-ai/cordis' {
  interface Context {
    agentPresets: AgentPresetRegistry
  }
}

interface Generation {
  scope: Scope
  key: ScopeKey
  mount: PresetMount
  users: number
  retired: boolean
}
interface Definition {
  config: PresetDefinition
  context: Context
  ready: Promise<void>
  generation?: Generation
  /** Mount failure; unset while a tree is mounted, whose rows {@link AgentPresetRegistry.diagnostic} re-audits on read. */
  broken?: string
}
interface Binding {
  parent: ScopeParentBinding
  generation: Generation
}

/** Registry of YAML-declared presets and the revisions live Agents retain. */
export class AgentPresetRegistry extends TypertRemoteService {
  static inject = ['loader', 'sessionProjections']
  static Config = z.object({
    default: z.string().required(),
    selectedDefault: z.string().volatile(),
    // Absent means "the harness-home user root alone"; see `Config.roots`.
    roots: z.array(z.object({
      path: z.string().required(),
      trust: z.union(['system', 'user']).default('user'),
    })),
    experts: z.object({
      maxNameCharacters: z.number(),
      maxWelcomeCharacters: z.number(),
      maxPromptBytes: z.number(),
      maxEvidenceMessages: z.number(),
    }),
  })
  private readonly owner: Context
  private readonly definitions = new Map<string, Definition>()
  private readonly generations = new Map<ScopeKey, Generation>()
  private readonly bindings = new WeakMap<ScopeKey, Binding>()
  private readonly switches = new Map<string, Promise<unknown>>()

  /**
   * The service's own untraced context.
   *
   * Methods invoked through the traceable proxy see `this.ctx` rebound to the
   * CALLER's context, which carries a shadow; a subtree minted from it resolves
   * every service through that shadow's fiber instead of each entry's own
   * inject store, so an expert's composition would fail on the very services
   * it declares. Standing mounts must hang off the untraced original.
   */
  private readonly selfCtx: Context

  /** Where locally authored experts live, in precedence order. */
  private readonly expertRoots: readonly PresetRoot[]

  /** Fully resolved expert policy; direct constructors and Loader calls read the same defaults. */
  private readonly expertConfig: ExpertConfig

  /** Discovered experts by id, held beside the definitions they registered as. */
  private readonly expertPresets = new Map<string, ExpertPreset>()

  /** Unregister handle per expert registration, so a changed prompt replaces its definition. */
  private readonly expertRegistrations = new Map<string, () => Promise<void>>()

  /** One reviewable candidate per Session; a newer request replaces the older candidate. */
  private readonly expertProposals = new Map<ExpertProposalId, HeldExpertOptimization>()

  /** Reverse index used to retire one Session's previous candidate in constant time. */
  private readonly expertProposalBySession = new Map<SessionId, ExpertProposalId>()

  /** Expert Sessions whose refinement child is being published inside the current start. */
  private readonly startingRefinements = new Set<SessionId>()

  /** Live agent-local prompt override installed after a version is applied. */
  private readonly expertPromptOverrides = new WeakMap<Agent, () => void | Promise<void>>()

  /**
   * First scan and registration of the expert roots.
   *
   * Every read of the roster awaits it, because an expert reaches the registry
   * asynchronously — its directory is read from disk and registered as an
   * ordinary definition — and a roster that answered before that scan finished
   * would omit every expert the deployment has.
   */
  private readonly expertsReady: Promise<void>

  constructor(ctx: Context, public config: Config) {
    super(ctx, 'agentPresets')
    this.owner = ctx
    this.selfCtx = ctx
    this.expertConfig = { ...DEFAULT_EXPERT_CONFIG, ...config.experts }
    this.expertRoots = config.roots ?? [{ path: dshHomePath(USER_PRESET_DIR), trust: 'user' }]
    ctx.sessionProjections.register(agentPresetProjectionDefinition)
    ctx.sessionProjections.register(expertRefinementProjectionDefinition(this.expertConfig.maxEvidenceMessages))
    ctx.inject(['settings'], (child) => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })
    ctx.on('session/event', (session, event) => {
      if (event.type === 'agent-preset/selected') ctx.emit('agent-preset/selected', session.id, event.data.agentPreset)
    })
    // Advisory, not fatal: a synchronous `agent/created` listener that throws
    // VETOES publication, and composing an agent outside the roster is legal.
    ctx.on('agent/created', ({ agent }) => {
      this.restoreExpertPromptOverride(agent)
      this.admitRefinementChild(agent)
    })
    ctx.on('agent/disposed', ({ agent }) => {
      const proposalId = this.expertProposalBySession.get(agent.id)
      if (proposalId !== undefined) void this.retireExpertOptimization(proposalId)
    })
    ctx.effect(() => async () => {
      await Promise.allSettled([...this.expertProposals.keys()].map(id => this.retireExpertOptimization(id)))
    }, 'agent-presets: expert optimization runs')
    this.expertsReady = this.installExperts()
  }

  /**
   * Give a refinement child the internal skill its opening request invokes.
   *
   * The skill registers on the child's own scope rather than the deployment
   * layer: it drives one optimization run, and the catalog every other agent
   * reads must not advertise a workflow no user starts by hand. Publication is
   * the last moment before the child's opening request, so the registration
   * lands before the invocation is resolved.
   * @param agent - the Agent being published.
   */
  private admitRefinementChild(agent: Agent): void {
    const { origin, parentSession } = agent.session.header
    if (origin !== 'subagent' || parentSession === undefined) return
    if (!this.startingRefinements.has(parentSession)) return
    agent.ctx.get('skills')?.register(expertPromptRefinerRegistration())
  }

  /** Default preset for a subsequently created session. */
  get defaultId(): string { return this.config.selectedDefault.get() ?? this.config.default }

  /** Register and eagerly load a definition; activation failure remains visible in the roster.
   * @param definition Parsed configuration supplied by the declaring plugin.
   * @returns Definition disposer after activation or its diagnostic settles; the declaring plugin owns it.
   */
  async register(definition: PresetDefinition): Promise<() => Promise<void>> {
    const context = this.ctx
    if (!definition.id.trim()) throw new Error('Preset id must not be empty')
    if (this.definitions.has(definition.id)) throw new Error(`Duplicate agent preset: ${definition.id}`)
    const record: Definition = { config: definition, context, ready: Promise.resolve() }
    this.definitions.set(definition.id, record)
    let disposed = false
    const unregister = async (): Promise<void> => {
      if (disposed) return
      disposed = true
      this.definitions.delete(definition.id)
      await record.ready
      if (record.generation !== undefined) {
        record.generation.retired = true
        await this.collect(record.generation)
      }
    }
    record.ready = this.activate(record)
    await record.ready
    return unregister
  }

  private async activate(record: Definition): Promise<void> {
    const key = {}
    const scope = createScope(this.owner, key)
    try {
      const problem = entryListProblem(record.config.plugins)
      if (problem !== undefined) throw new Error(problem)
      const context = scope.ctx.extend({ baseUrl: record.context.baseUrl })
      const mount = await mountPreset(context, record.config.id, record.config.plugins)
      const generation: Generation = { scope, key, mount, users: 0, retired: false }
      this.generations.set(key, generation)
      record.generation = generation
    } catch (error) {
      record.broken = (error as Error).message
      this.owner.logger.warn(`agent preset ${record.config.id}: ${record.broken}`)
      await scope.dispose()
    }
  }

  /**
   * Current activation diagnostic of a definition.
   *
   * A mount failure is final. A mounted tree is re-audited on every read: a
   * row waiting for a Host service activates by itself once that provider
   * finishes, so the audit waits for the Host Loader tree to settle before
   * reporting the row as unusable. Callers therefore must not run inside a
   * Host row's own activation, which the settlement would wait on.
   * @param record - the definition to audit.
   * @returns one line per unusable row, or undefined when the definition is usable.
   */
  private async diagnostic(record: Definition): Promise<string | undefined> {
    await record.ready
    if (record.generation === undefined) return record.broken
    const tree = record.generation.mount.tree
    let audit = await auditRows(tree)
    if (audit.pending.length > 0) {
      await this.owner.loader.await()
      audit = await auditRows(tree)
    }
    const lines = [...audit.failed, ...audit.pending]
    return lines.length === 0 ? undefined : lines.join('\n')
  }

  private async collect(generation: Generation): Promise<void> {
    if (!generation.retired || generation.users !== 0) return
    this.generations.delete(generation.key)
    await generation.scope.dispose()
  }

  /** Read every declared preset, including activation failures.
   * @returns Display metadata and loading diagnostics.
   */
  async list(): Promise<AgentPreset[]> {
    await this.expertsReady
    const rows = await Promise.all([...this.definitions.values()].map(async (record) => {
      const broken = await this.diagnostic(record)
      return {
        id: record.config.id,
        ...(record.config.name === undefined ? {} : { name: record.config.name }),
        ...(record.config.description === undefined ? {} : { description: record.config.description }),
        ...(record.config.order === undefined ? {} : { order: record.config.order }),
        ...(broken === undefined ? {} : { broken }),
      }
    }))
    return rows.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id))
  }

  /** Read the selection roster.
   * @returns Current presets, each marked when it is the default.
   */
  @Remote('list')
  async remoteExportList(): Promise<AgentPresetRoster> {
    const defaultId = this.defaultId
    return { presets: (await this.list()).map(row => ({ ...row, isDefault: row.id === defaultId })) }
  }

  /** Resolve an identity without starting an Agent.
   * @param id Explicit preset or the current default.
   * @returns Current metadata, including failure when activation failed.
   */
  async resolve(id?: string): Promise<AgentPreset> {
    await this.expertsReady
    const wanted = id ?? this.defaultId
    const record = this.definitions.get(wanted)
    if (record === undefined) throw new RemoteError('agent-preset/not-found', `Unknown agent preset: ${wanted}`,
      { agentPreset: wanted, available: [...this.definitions.keys()] })
    const broken = await this.diagnostic(record)
    return { id: wanted, ...(broken === undefined ? {} : { broken }) }
  }

  /** Read one declaration's child plugin list as YAML, for viewing only.
   * @param agentPreset Preset identity.
   * @returns The declared composition beside its published metadata.
   */
  @Remote('read')
  readDocument(agentPreset: string): Promise<AgentPresetDocument> {
    return this.expertsReady.then(() => this.declaredDocument(agentPreset))
  }

  private declaredDocument(agentPreset: string): Promise<AgentPresetDocument> {
    const record = this.definitions.get(agentPreset)
    if (record === undefined) {
      return Promise.reject(new RemoteError('agent-preset/not-found', `Unknown agent preset: ${agentPreset}`,
        { agentPreset, available: [...this.definitions.keys()] }))
    }
    const { id, name, description, plugins } = record.config
    // The Loader's own dialect, so `!!js` conditions read as declared rather than as expression objects.
    const content = dump(plugins, { schema: entryListSchema, noRefs: true, lineWidth: -1 })
    return Promise.resolve({
      agentPreset: id, content, ...(name === undefined ? {} : { name }), ...(description === undefined ? {} : { description }),
    })
  }

  private async retain(id?: string): Promise<Generation> {
    await this.expertsReady
    const wanted = id ?? this.defaultId
    while (true) {
      const record = this.definitions.get(wanted)
      if (record === undefined) throw new RemoteError('agent-preset/not-found', `Unknown agent preset: ${wanted}`,
        { agentPreset: wanted, available: [...this.definitions.keys()] })
      const broken = await this.diagnostic(record)
      if (this.definitions.get(wanted) !== record) continue
      const generation = record.generation
      if (broken !== undefined || generation === undefined) {
        const reason = broken as string
        throw new RemoteError('agent-preset/invalid', reason, { agentPreset: wanted, reason })
      }
      generation.users++
      return generation
    }
  }

  private async bind(ctx: Context, generation: Generation): Promise<void> {
    const key = scopeOf(ctx)
    if (key === undefined) throw new Error('Agent preset binding requires a scoped context')
    const binding = this.bindings.get(key)
    if (binding?.generation === generation) return
    if (binding !== undefined) {
      binding.parent.rebind(generation.key)
      const old = binding.generation
      generation.users++
      binding.generation = generation
      old.users--
      await this.collect(old)
    } else this.join(ctx, key, generation)
  }

  private join(ctx: Context, key: ScopeKey, generation: Generation): void {
    const binding = { parent: bindScopeParent(key, generation.key), generation }
    generation.users++
    this.bindings.set(key, binding)
    ctx.effect(() => async () => {
      this.bindings.delete(key)
      binding.generation.users--
      await this.collect(binding.generation)
    }, 'agent-preset.binding')
  }

  /** Bind an unpublished Agent to the current preset revision.
   * @param ctx Agent context from its setup callback.
   * @param id Requested preset, or the default.
   * @returns Bound preset identity.
   */
  async mount(ctx: Context, id?: string): Promise<AgentPreset> {
    const generation = await this.retain(id)
    try {
      await this.bind(ctx, generation)
      return { id: generation.mount.presetId }
    } finally {
      generation.users--
      await this.collect(generation)
    }
  }

  /** Join a child to the exact revision retained by its parent.
   * @param ctx Child Agent context.
   * @param parent Parent Agent context.
   * @returns Inherited preset id, or undefined in a preset-free composition.
   */
  composeFrom(ctx: Context, parent: Context): string | undefined {
    const mounted = standingMountFor(parent)
    if (mounted === undefined) return undefined
    const generation = this.generations.get(mounted.key)
    if (generation === undefined) throw new Error('Parent preset revision is unavailable')
    // A child has no existing binding, so this path has no asynchronous cleanup.
    const key = scopeOf(ctx)
    if (key === undefined) throw new Error('Child preset binding requires a scope')
    if (this.bindings.has(key)) throw new Error('Child already joined a preset')
    this.join(ctx, key, generation)
    return mounted.presetId
  }

  /** Read the preset a live Agent uses.
   * @param ctx Agent context.
   * @returns Its preset id, if bound.
   */
  composedPreset(ctx: Context): string | undefined { return standingMountFor(ctx)?.presetId }

  /** Read a service supplied inside an Agent's isolated preset group.
   * @param agent Agent whose composition is queried.
   * @param name Cordis service name.
   * @returns The service, or undefined.
   */
  serviceFor<K extends string & keyof Context>(agent: { ctx: Context }, name: K): Context[K] | undefined {
    return serviceForAgent(this.owner, agent, name)
  }

  /** Rebind a blank Agent; the caller owns the blank-session check.
   * @param ctx Agent context.
   * @param id Requested preset.
   * @returns The bound identity.
   */
  async recompose(ctx: Context, id: string): Promise<AgentPreset> {
    const preset = await this.mount(ctx, id)
    try { this.owner.emit('tools/change') }
    catch (error) { this.owner.logger.warn(`Preset tools observer: ${String(error)}`) }
    return preset
  }

  /** Select a preset before a session starts its first turn.
   * @param agent Target Agent.
   * @param agentPreset Requested identity.
   * @returns Committed preset identity.
   */
  @Remote('select')
  async select(agent: Agent, agentPreset: string): Promise<string> {
    const turn = (this.switches.get(agent.id) ?? Promise.resolve()).then(async () => {
      const boundary = this.owner.sessionProjections.stateOf(agent.session, 'turnBoundary')
      if (boundary !== undefined && (boundary.openTurnStartSeq !== null || boundary.lastTurn > 0)) {
        throw new RemoteError('agent-preset/locked', 'This session has already started', { sessionId: agent.id, agentPreset })
      }
      const preset = await this.recompose(agent.ctx, agentPreset)
      agent.session.append('agent-preset/selected', { agentPreset: preset.id })
      return preset.id
    })
    const guard = turn.catch(() => undefined)
    this.switches.set(agent.id, guard)
    try { return await turn } finally {
      if (this.switches.get(agent.id) === guard) this.switches.delete(agent.id)
    }
  }

  /** Read current registrations for cold transcript presentation.
   * @param id Preset identity or the default.
   * @returns A revision lease; dispose it after the scoped read completes.
   */
  async acquireScope(id?: string): Promise<{ key: ScopeKey } & AsyncDisposable> {
    const generation = await this.retain(id)
    let disposed = false
    return { key: generation.key, [Symbol.asyncDispose]: async () => {
      if (disposed) return
      disposed = true
      generation.users--
      await this.collect(generation)
    } }
  }

  /** Read plugin rows without creating an Agent.
   * @returns Current declaration metadata and activation states.
   */
  async compositionInventory(): Promise<AgentPresetComposition[]> {
    await this.expertsReady
    return Promise.all([...this.definitions.values()].map(async (record) => {
      const { id, name, description } = record.config
      const broken = await this.diagnostic(record)
      const read = definitionComposition(record.config.plugins, () => { throw new Error('Inactive definition') })
      return { id, ...(name === undefined ? {} : { name }), ...(description === undefined ? {} : { description }),
        isDefault: id === this.defaultId,
        ...(broken === undefined ? {} : { broken }),
        rows: record.generation === undefined ? ('rows' in read ? read.rows : []) : mountedCompositionRows(record.generation.mount.tree) }
    }))
  }

  /*
   * Local expert store.
   *
   * A declarative preset is data a bundle patch supplies; an expert is a
   * DIRECTORY the owner keeps — its prompt is versioned in files, so the
   * filesystem is the source of truth. The two meet at one point only:
   * discovery reads each expert directory and registers it through the same
   * public {@link register} a declaring plugin uses, so an expert is mounted,
   * bound, retained, and inspected by exactly the machinery above. Nothing
   * else here is special-cased, which is what lets the declarative model stay
   * unaware of directories.
   */

  /** Whether this deployment has a root locally authored experts go to. */
  get authorable(): boolean {
    return this.expertRoots.some(root => root.trust === 'user')
  }

  /** The roots this service scans for experts, which is not `config.roots`: absent means the harness-home user root. */
  get roots(): readonly PresetRoot[] {
    return this.expertRoots
  }

  /**
   * Read the roots once at load and register every expert they hold.
   *
   * A root that is missing, unreadable, or holds a half-written expert is the
   * ordinary case rather than a boot failure: one unusable directory is
   * reported and skipped so the rest of the roster still reaches the user.
   */
  private async installExperts(): Promise<void> {
    const presets = await discoverExpertPresets(this.expertRoots)
    for (const preset of presets) {
      try {
        // Repair a directory written by a release that knew fewer Chat
        // capabilities before it is read as this one's composition.
        await synchronizeExpertComposition(preset)
        await this.registerExpert(preset, await readExpertDocument(preset))
      } catch (error) {
        this.selfCtx.logger.warn(`expert preset "${preset.id}" could not be registered: ${String(error)}`)
      }
    }
  }

  /**
   * Publish one expert directory as a preset definition, replacing any earlier one.
   *
   * Re-registration rather than mutation is the whole reason experts compose
   * the way they do: a definition carries the prompt text, so a changed prompt
   * is a different composition. Retiring the old definition and activating the
   * new one leaves every running Session on the revision it started under,
   * exactly as editing a shipped composition would.
   * @param preset - the expert directory being published.
   * @param document - its current metadata and prompt.
   */
  private async registerExpert(preset: ExpertPreset, document: ExpertDocument): Promise<void> {
    await this.expertRegistrations.get(preset.id)?.()
    this.expertRegistrations.delete(preset.id)
    this.expertPresets.set(preset.id, preset)
    this.expertRegistrations.set(preset.id, await this.register(expertDefinition(preset, document)))
  }

  /** Resolve one expert directory and require its marker. */
  private async resolveExpert(id: string): Promise<{ preset: ExpertPreset; document: ExpertDocument }> {
    await this.expertsReady
    const preset = this.expertPresets.get(id)
    if (preset === undefined) {
      throw new RemoteError('expert/not-found', `expert "${id}" was not found`, { expertId: id })
    }
    return { preset, document: await readExpertDocument(preset) }
  }

  /**
   * List locally authored experts independently from the Agent-mode roster.
   * @returns current expert rows and whether a writable root is available.
   */
  @Remote('listExperts')
  async remoteExportListExperts(): Promise<ExpertRoster> {
    await this.expertsReady
    const entries = await Promise.all([...this.expertPresets.values()].map(preset => readExpertSummary(preset)))
    return {
      experts: entries
        .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
        .sort((left, right) => right.updatedAt - left.updatedAt),
      authorable: this.authorable,
    }
  }

  /**
   * Read one expert prompt, metadata, and version history.
   * @param id - expert preset id.
   * @returns the complete current expert document.
   */
  @Remote('readExpert')
  async remoteExportReadExpert(id: string): Promise<ExpertDocument> {
    validatePresetId(id, 'agentPreset')
    return (await this.resolveExpert(id)).document
  }

  /**
   * Read one immutable prompt version beside its immediate predecessor.
   * @param id - expert preset id.
   * @param version - selected stored version.
   * @returns both prompt texts and the selected version record.
   */
  @Remote('readExpertVersion')
  async remoteExportReadExpertVersion(id: string, version: number): Promise<ExpertVersionComparison> {
    validatePresetId(id, 'agentPreset')
    return await readExpertVersionComparison((await this.resolveExpert(id)).preset, version)
  }

  /**
   * Create a self-contained Chat-mode expert in the user preset root.
   * @param id - new preset directory id.
   * @param name - display name.
   * @param welcome - browser-only first-message cue.
   * @param prompt - complete expert system prompt.
   * @param icon - optional picker icon.
   * @returns the created version-one document.
   */
  @Remote('createExpert')
  async remoteExportCreateExpert(
    id: string,
    name: string,
    welcome: string,
    prompt: string,
    icon?: ExpertIcon,
  ): Promise<ExpertDocument> {
    validatePresetId(id, 'agentPreset')
    if (!PRESET_ID.test(id)) {
      throw new RemoteError('expert/invalid', `expert "${id}" has an invalid identifier`, {
        expertId: id,
        reason: 'use lowercase letters, digits, and hyphens, starting with a letter or digit',
      })
    }
    const input = { name, welcome, prompt, ...icon === undefined ? {} : { icon } }
    validateExpertInput(id, input, this.expertConfig)
    if ((await this.list()).some(preset => preset.id === id)) {
      throw new RemoteError('expert/invalid', `expert "${id}" already exists`, {
        expertId: id,
        reason: 'the identifier is already in use',
      })
    }
    await createExpert(this.expertRoots, id, input)
    const root = this.expertRoots.find(candidate => candidate.trust === 'user') as PresetRoot
    const preset = (await scanRoot(root)).find(candidate => candidate.id === id)
    if (preset === undefined) {
      throw new RemoteError('expert/invalid', `expert "${id}" was not created`, {
        expertId: id,
        reason: 'the new directory has no composition file',
      })
    }
    const document = await readExpertDocument(preset)
    await this.registerExpert(preset, document)
    return document
  }

  /**
   * Save editor fields, appending a version when the prompt text changed.
   * @param sessionId - currently displayed Session, updated only when it runs this expert.
   * @param id - expert preset id.
   * @param expectedVersion - version the editor loaded.
   * @param name - display name.
   * @param welcome - browser-only first-message cue.
   * @param prompt - complete expert system prompt.
   * @param icon - optional picker icon.
   * @returns the committed expert document.
   */
  @Remote('saveExpert')
  async remoteExportSaveExpert(
    sessionId: SessionId,
    id: string,
    expectedVersion: number,
    name: string,
    welcome: string,
    prompt: string,
    icon?: ExpertIcon,
  ): Promise<ExpertDocument> {
    validatePresetId(id, 'agentPreset')
    const input = { name, welcome, prompt, ...icon === undefined ? {} : { icon } }
    validateExpertInput(id, input, this.expertConfig)
    const { preset } = await this.resolveExpert(id)
    const saved = await updateExpert(preset, expectedVersion, input, 'Manual edit', [])
    await this.registerExpert(preset, saved)
    const agent = this.selfCtx.get('agents')?.get(sessionId)
    if (saved.currentVersion !== expectedVersion
      && agent !== undefined
      && this.composedPreset(agent.ctx) === id) {
      this.applyExpertPrompt(agent, saved, 'manual-save')
    }
    return saved
  }

  /**
   * Generate one server-held local prompt revision from a selected assistant message.
   * @param sessionId - live expert Session.
   * @param targetMessageId - finalized answer ending the evidence window.
   * @param signal - caller cancellation, combined with the parent Agent maintenance signal.
   * @returns the child Session identity and server-held proposal identity; no expert file is changed.
   */
  @Remote('optimizeExpert')
  async remoteExportOptimizeExpert(
    sessionId: SessionId,
    targetMessageId: MessageId,
    signal: AbortSignal,
  ): Promise<ExpertOptimizationRun> {
    const agents = this.selfCtx.get('agents')
    const subagents = this.selfCtx.get('subagents') as unknown as ExpertSubagentRuntime | undefined
    if (agents === undefined || subagents === undefined || this.selfCtx.get('skills') === undefined) {
      throw new RemoteError('expert/optimization-unavailable', 'expert optimization services are not mounted', {
        sessionId,
        reason: 'the deployment must provide Agent, subagent, and skill services',
      })
    }
    const agent = agents.get(sessionId)
    if (agent === undefined) {
      throw new RemoteError('expert/optimization-unavailable', `session "${sessionId}" has no live Agent`, {
        sessionId,
        reason: 'the Session must be open before its expert can be optimized',
      })
    }
    const presetId = this.composedPreset(agent.ctx)
    if (presetId === undefined) {
      throw new RemoteError('expert/optimization-unavailable', `session "${sessionId}" uses no Agent preset`, {
        sessionId,
        reason: 'the Session is not using an expert',
      })
    }
    const resolvedExpert = await this.resolveExpert(presetId)
    const refinement = this.selfCtx.sessionProjections.stateOf(agent.session, 'expertRefinement')
    const answer = refinement?.recent.find(message => message.messageId === targetMessageId)
    const loggedPrompt = answer?.prompt
    if (loggedPrompt === undefined || refinement === undefined) {
      throw new RemoteError('expert/optimization-unavailable', 'the selected answer has no logged expert prompt', {
        sessionId,
        reason: 'the answer must come from this expert Session',
      })
    }
    const sessionVersion = await findExpertVersion(resolvedExpert.preset, loggedPrompt)
    if (sessionVersion === undefined) {
      throw new RemoteError('expert/optimization-unavailable', 'the logged expert prompt has no stored version', {
        sessionId,
        reason: 'the expert files changed outside version management',
      })
    }
    const expert: ExpertDocument = {
      ...resolvedExpert.document,
      currentVersion: sessionVersion,
      prompt: loggedPrompt,
    }
    const task = buildExpertOptimizationTask(
      agent,
      expert,
      refinement.recent,
      targetMessageId,
    )
    const previous = this.expertProposalBySession.get(sessionId)
    if (previous !== undefined) await this.retireExpertOptimization(previous)
    const proposalId = brandString<ExpertProposalId>(randomUUID())
    let run: ExpertSubagentRun
    this.startingRefinements.add(sessionId)
    try {
      run = await agent.runMaintenance(maintenanceSignal => subagents.start('spawn', {
        parent: agent,
        label: '专家提示词优化',
        prompt: task.prompt,
        promptContext: task.promptContext,
        outputSchema: EXPERT_OPTIMIZATION_OUTPUT_SCHEMA,
        signal: AbortSignal.any([signal, maintenanceSignal]),
        agentPreset: 'standard',
      }))
    } catch (error) {
      if (error instanceof RemoteError) throw error
      throw new RemoteError('expert/optimization-unavailable', `专家提示词优化失败：${String(error)}`, {
        sessionId,
        reason: String(error),
      })
    } finally {
      this.startingRefinements.delete(sessionId)
    }
    const held = { sessionId, run }
    this.expertProposalBySession.set(sessionId, proposalId)
    this.expertProposals.set(proposalId, held)
    void this.settleExpertOptimization(held, proposalId, expert, targetMessageId)
    return { proposalId, childSessionId: run.id }
  }

  /**
   * Accept the exact server-held proposal reviewed in the right Sidebar.
   * @param sessionId - Session that requested the proposal.
   * @param proposalId - opaque server-held proposal identity.
   * @param revisedPrompt - complete user-reviewed prompt to commit.
   * @returns the newly committed expert document.
   */
  @Remote('acceptExpertOptimization')
  async remoteExportAcceptExpertOptimization(
    sessionId: SessionId,
    proposalId: ExpertProposalId,
    revisedPrompt: string,
  ): Promise<ExpertDocument> {
    const held = this.expertProposals.get(proposalId)
    if (held === undefined || held.sessionId !== sessionId) {
      throw new RemoteError('expert/optimization-unavailable', 'the refinement proposal is no longer available', {
        sessionId,
        reason: 'run prompt optimization again',
      })
    }
    const { proposal } = held
    if (proposal === undefined) {
      throw new RemoteError('expert/optimization-unavailable', 'the refinement proposal is still running', {
        sessionId,
        reason: 'wait for the optimization Agent to finish',
      })
    }
    if (proposal.status !== 'changed') {
      throw new RemoteError('expert/optimization-unavailable', 'a no-change proposal cannot be accepted', {
        sessionId,
        reason: proposal.summary,
      })
    }
    const { preset, document } = await this.resolveExpert(proposal.expertId)
    const input = {
      name: document.name,
      welcome: document.welcome,
      prompt: revisedPrompt,
      ...document.icon === undefined ? {} : { icon: document.icon },
    }
    validateExpertInput(document.id, input, this.expertConfig)
    if (revisedPrompt === proposal.originalPrompt) {
      throw new RemoteError('expert/optimization-unavailable', 'the reviewed prompt has no change to save', {
        sessionId,
        reason: 'edit the proposed prompt before accepting it',
      })
    }
    const changes = revisedPrompt === proposal.revisedPrompt
      ? proposal.changes
      : [{ before: proposal.originalPrompt, after: revisedPrompt, reason: proposal.summary }]
    const saved = await updateExpert(
      preset,
      proposal.baseVersion,
      input,
      proposal.summary,
      changes,
    )
    await this.registerExpert(preset, saved)
    this.expertProposals.delete(proposalId)
    this.expertProposalBySession.delete(sessionId)
    const agent = this.selfCtx.get('agents')?.get(sessionId)
    if (agent !== undefined) this.applyExpertPrompt(agent, saved, 'optimization-accepted')
    return saved
  }

  /**
   * Discard one browser review and cancel its child Agent when still running.
   * @param sessionId - parent expert Session.
   * @param proposalId - optimization identity returned at start.
   */
  @Remote('dismissExpertOptimization')
  async remoteExportDismissExpertOptimization(
    sessionId: SessionId,
    proposalId: ExpertProposalId,
  ): Promise<void> {
    const held = this.expertProposals.get(proposalId)
    if (held === undefined || held.sessionId !== sessionId) return
    await this.retireExpertOptimization(proposalId)
  }

  /** Cancel the child and await its cleanup at most once. */
  private disposeExpertOptimization(held: HeldExpertOptimization): Promise<void> {
    held.disposal ??= held.run.dispose().catch((error: unknown) => {
      this.selfCtx.logger.warn(`expert optimization child disposal failed: ${String(error)}`)
    })
    return held.disposal
  }

  /** Remove one held optimization and stop any child work still running. */
  private async retireExpertOptimization(proposalId: ExpertProposalId): Promise<void> {
    const held = this.expertProposals.get(proposalId)
    if (held === undefined) return
    this.expertProposals.delete(proposalId)
    if (this.expertProposalBySession.get(held.sessionId) === proposalId) {
      this.expertProposalBySession.delete(held.sessionId)
    }
    await this.disposeExpertOptimization(held)
  }

  /** Settle one standard-mode child into a candidate and notify browser clients. */
  private async settleExpertOptimization(
    held: HeldExpertOptimization,
    proposalId: ExpertProposalId,
    expert: ExpertDocument,
    targetMessageId: MessageId,
  ): Promise<void> {
    let outcome: ExpertOptimizationOutcome
    try {
      const result = await held.run.result
      if (result.stopReason !== 'completed') {
        throw new Error(result.diagnostic ?? `提示词优化 Agent 已停止：${result.stopReason}`)
      }
      if (result.structured === undefined) {
        throw new Error('提示词优化 Agent 未返回结构化结果')
      }
      const proposal = expertProposalFromOutput(
        result.structured,
        proposalId,
        expert,
        targetMessageId,
        this.expertConfig.maxPromptBytes,
      )
      held.proposal = proposal
      outcome = { status: 'ready', proposal }
    } catch (error) {
      outcome = { status: 'failed', error: String(error) }
    } finally {
      await this.disposeExpertOptimization(held)
    }
    if (this.expertProposals.get(proposalId) !== held) return
    this.selfCtx.emit('expert/optimization-settled', held.sessionId, proposalId, outcome)
  }

  /** Replace this live Agent's expert prompt without changing its plugin composition. */
  private installExpertPromptOverride(agent: Agent, prompt: string): void {
    void this.expertPromptOverrides.get(agent)?.()
    const dispose = agent.ctx.effect(() => agent.ctx.systemPrompt.section({
      name: PERSONA_PREFIX_SECTION,
      order: agent.ctx.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX'),
      text: prompt,
      complete: true,
    }), 'agent-presets: applied expert prompt')
    this.expertPromptOverrides.set(agent, dispose)
  }

  /** Record and install one expert prompt version for subsequent requests. */
  private applyExpertPrompt(
    agent: Agent,
    expert: Pick<ExpertDocument, 'id' | 'currentVersion' | 'prompt'>,
    source: ExpertPromptApplicationSource,
  ): void {
    agent.session.append('expert/prompt-applied', {
      expertId: expert.id,
      version: expert.currentVersion,
      prompt: expert.prompt,
      source,
    })
    this.installExpertPromptOverride(agent, expert.prompt)
  }

  /** Rebuild the last applied prompt override from durable Session events. */
  private restoreExpertPromptOverride(agent: Agent): void {
    const prompt = this.selfCtx.sessionProjections.stateOf(agent.session, 'expertRefinement')?.appliedPrompt
    if (prompt !== null && prompt !== undefined) this.installExpertPromptOverride(agent, prompt)
  }

  /**
   * Make a newly seeded ordinary branch use the expert's current version.
   * @param agent - unpublished branch Agent after its recorded preset is mounted.
   * @returns whether a newer prompt than the branch history was applied.
   */
  async applyLatestExpertPromptForBranch(agent: Agent): Promise<boolean> {
    const presetId = this.composedPreset(agent.ctx)
    if (presetId === undefined) return false
    await this.expertsReady
    const preset = this.expertPresets.get(presetId)
    if (preset === undefined) return false
    const expert = await readExpertDocument(preset)
    const refinement = this.selfCtx.sessionProjections.stateOf(agent.session, 'expertRefinement')
    const promptInForce = refinement?.appliedPrompt ?? refinement?.activePrompt
    if (promptInForce === expert.prompt) return false
    this.applyExpertPrompt(agent, expert, 'branch-latest')
    return true
  }
}
export default AgentPresetRegistry
