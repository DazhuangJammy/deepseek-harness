/** Local expert-prompt files, immutable versions, and guarded authoring. */

import { chmod, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { writeFileAtomic, withFileLock } from '@deepseek-ai/dsh-atomic-write'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { z } from 'zod'
import { renderPresetMetadata } from './metadata.ts'
import type { ExpertConfig, ExpertPreset, PresetRoot } from './preset.ts'
import type { PresetDefinition } from './definition.ts'
import type {
  ExpertDocument, ExpertIcon, ExpertPromptChange, ExpertSummary, ExpertVersion, ExpertVersionComparison,
} from './types.ts'
import { writableRoot } from './authoring.ts'

/** Marker and current-version pointer inside one expert preset directory. */
export const EXPERT_FILE = 'expert.json'

const EXPERT_SCHEMA_VERSION = 1

const iconSchema = z.enum(['sparkles', 'briefcase', 'graduation-cap', 'code', 'chart'])
const changeSchema = z.object({
  before: z.string(),
  after: z.string(),
  reason: z.string().min(1),
}).strict()
const versionSchema = z.object({
  version: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  summary: z.string().min(1),
  changes: z.array(changeSchema),
}).strict()
const metadataSchema = z.object({
  schemaVersion: z.literal(EXPERT_SCHEMA_VERSION),
  name: z.string().min(1),
  welcome: z.string(),
  currentVersion: z.number().int().positive(),
  updatedAt: z.number().int().nonnegative(),
  icon: iconSchema.optional(),
}).strict()

type ExpertMetadata = z.infer<typeof metadataSchema>

const composition = `# Managed Chat-mode expert. The prompt version is selected by expert.json.
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    prefix: !!js "(() => { const fs = process.getBuiltinModule('node:fs'); const meta = JSON.parse(fs.readFileSync(new URL('expert.json', baseUrl), 'utf8')); return fs.readFileSync(new URL('versions/' + meta.currentVersion + '.md', baseUrl), 'utf8') })()"
    complete: true
    includeRuntimeContext: false

- id: tool-bash
  name: '@deepseek-ai/dsh-tool-bash'
  disabled: !!js process.platform === 'win32'

- id: tool-pwsh
  name: '@deepseek-ai/dsh-tool-pwsh'
  disabled: !!js process.platform !== 'win32'

- id: tool-fs
  name: '@deepseek-ai/dsh-tool-fs'

- id: tool-fs-search
  name: '@deepseek-ai/dsh-tool-fs-search'
  config:
    sampleOverCapGlobResults: false
`

/**
 * The managed Chat composition an expert mounts, with one prompt inlined.
 *
 * Every expert composes the same capability set — what distinguishes one is
 * its prompt, not its plugins — so this is the code form of the {@link
 * composition} template the directory marker carries. The prompt is inlined
 * rather than left to the template's `!!js` lookup because a registered
 * definition reaches the registry as data, and a definition has no preset
 * directory for a `baseUrl`-relative read to resolve against.
 * @param prompt - the expert's current prompt version.
 * @returns the entry list registered for this expert.
 */
export function expertComposition(prompt: string): PresetDefinition['plugins'] {
  return [
    {
      id: 'persona',
      name: '@deepseek-ai/dsh-persona',
      config: { prefix: prompt, complete: true, includeRuntimeContext: false },
    },
    { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash', disabled: process.platform === 'win32' },
    { id: 'tool-pwsh', name: '@deepseek-ai/dsh-tool-pwsh', disabled: process.platform !== 'win32' },
    { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs' },
    {
      id: 'tool-fs-search',
      name: '@deepseek-ai/dsh-tool-fs-search',
      config: { sampleOverCapGlobResults: false },
    },
  ]
}

function expertInvalid(id: string, reason: string): RemoteError<'expert/invalid'> {
  return new RemoteError('expert/invalid', `expert "${id}" is invalid: ${reason}`, { expertId: id, reason })
}

function expertMissing(id: string): RemoteError<'expert/not-found'> {
  return new RemoteError('expert/not-found', `expert "${id}" was not found`, { expertId: id })
}

function versionConflict(id: string, expected: number, actual: number): RemoteError<'expert/version-conflict'> {
  return new RemoteError(
    'expert/version-conflict',
    `expert "${id}" advanced from version ${String(expected)} to ${String(actual)}`,
    { expertId: id, expected, actual },
  )
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, undefined, 2)}\n`
}

function expertPresetMetadata(name: string): string {
  return renderPresetMetadata({ name, description: 'Chat-mode expert prompt' }) as string
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

function directoryOf(preset: ExpertPreset): string {
  return join(preset.path, '..')
}

function versionPromptPath(dir: string, version: number): string {
  return join(dir, 'versions', `${String(version)}.md`)
}

function versionRecordPath(dir: string, version: number): string {
  return join(dir, 'versions', `${String(version)}.json`)
}

async function readMetadata(id: string, dir: string): Promise<ExpertMetadata | undefined> {
  const path = join(dir, EXPERT_FILE)
  if (!await exists(path)) return undefined
  try {
    return metadataSchema.parse(await readJson(path))
  } catch (error) {
    throw expertInvalid(id, `cannot read ${EXPERT_FILE}: ${String(error)}`)
  }
}

async function readVersion(id: string, dir: string, version: number): Promise<ExpertVersion> {
  try {
    const parsed = versionSchema.parse(await readJson(versionRecordPath(dir, version)))
    if (parsed.version !== version) throw new Error(`record names version ${String(parsed.version)}`)
    return parsed
  } catch (error) {
    throw expertInvalid(id, `cannot read version ${String(version)}: ${String(error)}`)
  }
}

async function promptOf(id: string, dir: string, version: number): Promise<string> {
  try {
    return await readFile(versionPromptPath(dir, version), 'utf8')
  } catch (error) {
    throw expertInvalid(id, `cannot read prompt version ${String(version)}: ${String(error)}`)
  }
}

function summaryOf(id: string, metadata: ExpertMetadata): ExpertSummary {
  return {
    id,
    name: metadata.name,
    welcome: metadata.welcome,
    currentVersion: metadata.currentVersion,
    updatedAt: metadata.updatedAt,
    ...metadata.icon === undefined ? {} : { icon: metadata.icon },
  }
}

/**
 * Read an expert marker as a picker row.
 * @param preset - discovered preset whose directory may contain an expert marker.
 * @returns the expert row, or undefined for an ordinary preset.
 */
export async function readExpertSummary(preset: ExpertPreset): Promise<ExpertSummary | undefined> {
  const metadata = await readMetadata(preset.id, directoryOf(preset))
  return metadata === undefined ? undefined : summaryOf(preset.id, metadata)
}

/**
 * Read one expert's current prompt and complete version ledger.
 * @param preset - discovered expert preset.
 * @returns its current document with newest version first.
 */
export async function readExpertDocument(preset: ExpertPreset): Promise<ExpertDocument> {
  const dir = directoryOf(preset)
  const metadata = await readMetadata(preset.id, dir)
  if (metadata === undefined) throw expertMissing(preset.id)
  const versions = await Promise.all(
    Array.from({ length: metadata.currentVersion }, (_, index) => readVersion(preset.id, dir, index + 1)),
  )
  return {
    ...summaryOf(preset.id, metadata),
    prompt: await promptOf(preset.id, dir, metadata.currentVersion),
    versions: versions.reverse(),
  }
}

/**
 * Read one version and its immediate predecessor for a read-only prompt comparison.
 * @param preset - discovered expert preset.
 * @param version - selected stored version.
 * @returns the selected version record and both prompt texts.
 */
export async function readExpertVersionComparison(
  preset: ExpertPreset,
  version: number,
): Promise<ExpertVersionComparison> {
  const dir = directoryOf(preset)
  const metadata = await readMetadata(preset.id, dir)
  if (metadata === undefined) throw expertMissing(preset.id)
  if (!Number.isInteger(version) || version < 1 || version > metadata.currentVersion) {
    throw expertInvalid(preset.id, `version ${String(version)} does not exist`)
  }
  const previousVersion = version === 1 ? null : version - 1
  return {
    version: await readVersion(preset.id, dir, version),
    previousVersion,
    previousPrompt: previousVersion === null ? '' : await promptOf(preset.id, dir, previousVersion),
    prompt: await promptOf(preset.id, dir, version),
  }
}

/**
 * Restore the managed expert composition when an earlier release wrote fewer Chat capabilities.
 * @param preset - discovered preset that may carry an expert marker.
 * @returns whether the composition file changed.
 */
export async function synchronizeExpertComposition(preset: ExpertPreset): Promise<boolean> {
  if (await readMetadata(preset.id, directoryOf(preset)) === undefined) return false
  const current = await exists(preset.path) ? await readFile(preset.path, 'utf8') : undefined
  if (current === composition) return false
  await writeFileAtomic(preset.path, composition, { mode: 0o600, dirMode: 0o700 })
  return true
}

/**
 * Find the immutable version whose stored prompt exactly matches one logged Session prompt.
 * @param preset - discovered expert preset.
 * @param prompt - exact logged system prompt.
 * @returns the matching version, or undefined when files were changed outside version management.
 */
export async function findExpertVersion(preset: ExpertPreset, prompt: string): Promise<number | undefined> {
  const dir = directoryOf(preset)
  const metadata = await readMetadata(preset.id, dir)
  if (metadata === undefined) return undefined
  for (let version = metadata.currentVersion; version >= 1; version -= 1) {
    if (await promptOf(preset.id, dir, version) === prompt) return version
  }
  return undefined
}

/**
 * Validate browser-authored expert text against deployment limits.
 * @param id - expert id used in diagnostics.
 * @param input - fields being created or saved.
 * @param limits - resolved deployment policy.
 */
export function validateExpertInput(
  id: string,
  input: { name: string; welcome: string; prompt: string; icon?: ExpertIcon },
  limits: ExpertConfig,
): void {
  if (input.name.trim().length === 0) throw expertInvalid(id, 'name must not be empty')
  if (Array.from(input.name).length > limits.maxNameCharacters) {
    throw expertInvalid(id, `name exceeds ${String(limits.maxNameCharacters)} characters`)
  }
  if (Array.from(input.welcome).length > limits.maxWelcomeCharacters) {
    throw expertInvalid(id, `welcome exceeds ${String(limits.maxWelcomeCharacters)} characters`)
  }
  if (input.prompt.trim().length === 0) throw expertInvalid(id, 'prompt must not be empty')
  if (Buffer.byteLength(input.prompt, 'utf8') > limits.maxPromptBytes) {
    throw expertInvalid(id, `prompt exceeds ${String(limits.maxPromptBytes)} UTF-8 bytes`)
  }
  if (input.icon !== undefined && !iconSchema.safeParse(input.icon).success) {
    throw expertInvalid(id, `unknown icon "${input.icon}"`)
  }
}

async function writeVersion(
  dir: string,
  version: number,
  prompt: string,
  summary: string,
  changes: readonly ExpertPromptChange[],
  createdAt: number,
): Promise<void> {
  const versions = join(dir, 'versions')
  await mkdir(versions, { recursive: true, mode: 0o700 })
  await writeFile(versionPromptPath(dir, version), prompt, { mode: 0o600, flag: 'wx' })
  try {
    await writeFile(
      versionRecordPath(dir, version),
      serialize({ version, createdAt, summary, changes }),
      { mode: 0o600, flag: 'wx' },
    )
  } catch (error) {
    await rm(versionPromptPath(dir, version), { force: true })
    throw error
  }
}

/**
 * Create one self-contained Chat-mode expert under the first user root.
 * @param roots - configured preset roots in precedence order.
 * @param id - new expert preset id.
 * @param input - validated initial fields and prompt.
 */
export async function createExpert(
  roots: readonly PresetRoot[],
  id: string,
  input: { name: string; welcome: string; prompt: string; icon?: ExpertIcon },
): Promise<void> {
  const root = writableRoot(roots, id)
  await mkdir(root, { recursive: true, mode: 0o700 })
  const target = join(root, id)
  if (await exists(target)) throw expertInvalid(id, 'the preset directory already exists')
  const temp = await mkdtemp(join(root, '.expert-'))
  await chmod(temp, 0o700)
  const now = Date.now()
  const metadata: ExpertMetadata = {
    schemaVersion: EXPERT_SCHEMA_VERSION,
    name: input.name.trim(),
    welcome: input.welcome,
    currentVersion: 1,
    updatedAt: now,
    ...input.icon === undefined ? {} : { icon: input.icon },
  }
  try {
    await writeFile(join(temp, 'agent.cordis.yml'), composition, { mode: 0o600, flag: 'wx' })
    await writeFile(
      join(temp, 'preset.yml'),
      expertPresetMetadata(metadata.name),
      { mode: 0o600, flag: 'wx' },
    )
    await writeVersion(temp, 1, input.prompt, 'Initial version', [], now)
    await writeFile(join(temp, EXPERT_FILE), serialize(metadata), { mode: 0o600, flag: 'wx' })
    await rename(temp, target)
  } catch (error) {
    await rm(temp, { recursive: true, force: true })
    throw error
  }
}

/**
 * Save editor fields and append a prompt version only when the prompt changed.
 * @param preset - discovered user expert preset.
 * @param expectedVersion - version the writer read.
 * @param input - validated next fields and prompt.
 * @param summary - version account used when the prompt changed.
 * @param changes - exact replacements supporting that version.
 * @returns the committed document.
 */
export async function updateExpert(
  preset: ExpertPreset,
  expectedVersion: number,
  input: { name: string; welcome: string; prompt: string; icon?: ExpertIcon },
  summary: string,
  changes: readonly ExpertPromptChange[],
): Promise<ExpertDocument> {
  if (preset.trust !== 'user') throw expertInvalid(preset.id, 'shipped presets are read-only')
  const dir = directoryOf(preset)
  const metaPath = join(dir, EXPERT_FILE)
  return await withFileLock(metaPath, async () => {
    const metadata = await readMetadata(preset.id, dir)
    if (metadata === undefined) throw expertMissing(preset.id)
    if (metadata.currentVersion !== expectedVersion) {
      throw versionConflict(preset.id, expectedVersion, metadata.currentVersion)
    }
    const currentPrompt = await promptOf(preset.id, dir, metadata.currentVersion)
    const nextVersion = currentPrompt === input.prompt ? metadata.currentVersion : metadata.currentVersion + 1
    const now = Date.now()
    if (nextVersion !== metadata.currentVersion) {
      await writeVersion(dir, nextVersion, input.prompt, summary, changes, now)
    }
    const next: ExpertMetadata = {
      schemaVersion: EXPERT_SCHEMA_VERSION,
      name: input.name.trim(),
      welcome: input.welcome,
      currentVersion: nextVersion,
      updatedAt: now,
      ...input.icon === undefined ? {} : { icon: input.icon },
    }
    await writeFileAtomic(
      join(dir, 'preset.yml'),
      expertPresetMetadata(next.name),
      { mode: 0o600, dirMode: 0o700 },
    )
    await writeFileAtomic(metaPath, serialize(next), { mode: 0o600, dirMode: 0o700 })
    return await readExpertDocument(preset)
  })
}
