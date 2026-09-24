/**
 * Discovery of locally authored expert presets.
 *
 * Declarative presets reach the registry through the Loader: a bundle patch
 * inserts a `@deepseek-ai/dsh-agent-preset` row and the registry is handed the
 * definition. An expert is the other kind — its prompt is versioned in files
 * under a user root, so the directory is the source of truth and reading it is
 * this module's job. Registration is shared: an expert becomes an ordinary
 * definition, mounted and bound exactly like a shipped one.
 *
 * Discovery reports slots, not problems: a directory without a composition
 * file is simply not a preset, so an unfinished or unrelated directory never
 * becomes a roster row that fails to mount.
 * @module @deepseek-ai/dsh-agent-preset-registry/expert-install
 */

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { PresetDefinition } from './definition.ts'
import type { ExpertPreset, PresetRoot } from './preset.ts'
import type { ExpertDocument } from './types.ts'
import { expertComposition } from './expert.ts'

/** File whose presence makes a directory an expert preset. */
export const COMPOSITION_FILE = 'agent.cordis.yml'

/** Directory under the harness home the locally authored experts live in. */
export const USER_PRESET_DIR = '.agent-presets'

/** Whether anything exists at this path. */
async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * List the expert presets one root holds, in id order.
 * @param root - one configured root.
 * @returns the presets under it, in id order; empty when the root is absent.
 */
export async function scanRoot(root: PresetRoot): Promise<ExpertPreset[]> {
  let entries
  try {
    entries = await readdir(root.path, { withFileTypes: true })
  } catch {
    // A missing root is the ordinary first-run case, not a failure.
    return []
  }
  const found: ExpertPreset[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const path = join(root.path, entry.name, COMPOSITION_FILE)
    if (!await exists(path)) continue
    found.push({ id: entry.name, path, trust: root.trust })
  }
  return found.sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * List every expert preset the configured roots hold.
 *
 * Roots are scanned in precedence order and the first root to claim an id
 * keeps it, matching the precedence a deployment states by listing order.
 * @param roots - configured roots in precedence order.
 * @returns the presets to register, in id order.
 */
export async function discoverExpertPresets(roots: readonly PresetRoot[]): Promise<ExpertPreset[]> {
  const claimed = new Map<string, ExpertPreset>()
  for (const root of roots) {
    for (const preset of await scanRoot(root)) {
      if (!claimed.has(preset.id)) claimed.set(preset.id, preset)
    }
  }
  return [...claimed.values()].sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Build the definition one expert registers as.
 *
 * The roster copy comes from the expert's own name so the picker shows what
 * its owner called it; `order` stays undeclared, which sorts experts after
 * every shipped preset that declares one and then alphabetically.
 * @param preset - the discovered expert preset.
 * @param document - its current expert metadata, including the active prompt.
 * @returns the definition to register.
 */
export function expertDefinition(preset: ExpertPreset, document: ExpertDocument): PresetDefinition {
  return {
    id: preset.id,
    name: document.name,
    description: document.welcome,
    plugins: expertComposition(document.prompt),
  }
}
