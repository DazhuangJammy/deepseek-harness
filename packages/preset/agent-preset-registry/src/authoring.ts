/**
 * Where locally authored experts may be written.
 *
 * Authoring is confined to a `user` root: the shipped set is part of the
 * deployment, and letting a browser rewrite it would turn "reset to a known
 * preset" into something the same caller could have broken first.
 *
 * The only authoring write the registry performs is creating one expert
 * directory and appending prompt versions to it. No caller supplies
 * composition text — an expert's composition is the same managed Chat
 * template for every expert, so authoring grants no capability beyond
 * choosing the prompt the owner already controls.
 * @module @deepseek-ai/dsh-agent-preset-registry/authoring
 */

import { resolve } from 'node:path'
import { expandHomePath } from '@deepseek-ai/dsh-home-paths'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { PresetRoot } from './preset.ts'

/**
 * Refuse one authoring request the deployment does not allow.
 * @param presetId - what the caller tried to change, for the diagnostic.
 * @param reason - why authoring is refused.
 * @returns the failure to throw.
 */
function notWritable(presetId: string, reason: string): RemoteError<'agent-preset/read-only'> {
  return new RemoteError(
    'agent-preset/read-only',
    `agent-preset-registry: preset "${presetId}" cannot be written: ${reason}`,
    { agentPreset: presetId, reason },
  )
}

/**
 * The root locally authored experts are written to.
 * @param roots - the configured roots in precedence order.
 * @param presetId - the preset the caller is authoring, named by the refusal.
 * @returns the absolute path of the first `user` root.
 * @throws when the deployment configured no writable root.
 */
export function writableRoot(roots: readonly PresetRoot[], presetId: string): string {
  const root = roots.find(candidate => candidate.trust === 'user')
  if (root === undefined) {
    throw notWritable(presetId, 'this deployment configures no user-writable preset root')
  }
  return resolve(expandHomePath(root.path))
}
