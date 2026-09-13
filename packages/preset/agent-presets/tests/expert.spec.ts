/** Expert authoring keeps each prompt version immutable and advances one guarded pointer. */

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AgentPreset, ExpertConfig, PresetRoot } from '@deepseek-ai/dsh-agent-presets'
import { DEFAULT_EXPERT_CONFIG } from '../src/preset.ts'
import {
  createExpert, findExpertVersion, readExpertDocument, readExpertSummary,
  readExpertVersionComparison, synchronizeExpertComposition, updateExpert, validateExpertInput,
} from '../src/expert.ts'

const roots: string[] = []
const fsFaults = vi.hoisted(() => ({ failRename: false }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    rename: async (...args: Parameters<typeof actual.rename>) => {
      if (fsFaults.failRename) throw new Error('rename failed')
      await actual.rename(...args)
    },
  }
})

afterEach(async () => {
  fsFaults.failRename = false
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-expert-'))
  roots.push(root)
  const presetRoots: PresetRoot[] = [{ path: root, trust: 'user' }]
  await createExpert(presetRoots, 'interview', {
    name: 'Interview coach',
    welcome: 'Tell me the role.',
    prompt: '1. Ask for the role.\n2. Ask one question.',
    icon: 'briefcase',
  })
  const preset: AgentPreset = {
    id: 'interview',
    trust: 'user',
    path: join(root, 'interview', 'agent.cordis.yml'),
  }
  return { root, preset }
}

describe('expert prompt files', () => {
  it('creates a self-contained Chat-mode preset with version one', async () => {
    const { root, preset } = await fixture()

    const summary = await readExpertSummary(preset)
    expect(typeof summary?.updatedAt).toBe('number')
    expect(summary).toMatchObject({
      id: 'interview',
      name: 'Interview coach',
      welcome: 'Tell me the role.',
      currentVersion: 1,
      icon: 'briefcase',
    })
    expect(await readFile(join(root, 'interview', 'agent.cordis.yml'), 'utf8'))
      .toContain("fs.readFileSync(new URL('versions/' + meta.currentVersion + '.md', baseUrl), 'utf8')")
    expect(await readFile(join(root, 'interview', 'agent.cordis.yml'), 'utf8'))
      .toContain("name: '@deepseek-ai/dsh-tool-bash'")
    expect(await readExpertDocument(preset)).toMatchObject({
      prompt: '1. Ask for the role.\n2. Ask one question.',
      versions: [{ version: 1, summary: 'Initial version', changes: [] }],
    })
  })

  it('restores the managed file-tool composition for an existing expert', async () => {
    const { preset } = await fixture()
    await writeFile(preset.path, '- id: persona\n  name: \'@deepseek-ai/dsh-persona\'\n')

    expect(await synchronizeExpertComposition(preset)).toBe(true)
    expect(await readFile(preset.path, 'utf8')).toContain("name: '@deepseek-ai/dsh-tool-fs'")
    expect(await synchronizeExpertComposition(preset)).toBe(false)
    await rm(preset.path)
    expect(await synchronizeExpertComposition(preset)).toBe(true)
    expect(await readFile(preset.path, 'utf8')).toContain("name: '@deepseek-ai/dsh-tool-bash'")
  })

  it('appends an immutable prompt version and keeps its exact change evidence', async () => {
    const { root, preset } = await fixture()
    const before = await readFile(join(root, 'interview', 'versions', '1.md'), 'utf8')

    const updated = await updateExpert(preset, 1, {
      name: 'Interview coach',
      welcome: 'Tell me the role.',
      prompt: '1. Ask for the role.\n2. Ask one question at a time.',
      icon: 'briefcase',
    }, 'Ask one question at a time', [{
      before: 'Ask one question.',
      after: 'Ask one question at a time.',
      reason: 'The corrected answer avoided batching questions.',
    }])

    expect(updated.currentVersion).toBe(2)
    expect(updated.versions[0]).toMatchObject({
      version: 2,
      summary: 'Ask one question at a time',
      changes: [{ before: 'Ask one question.', after: 'Ask one question at a time.' }],
    })
    expect(await readFile(join(root, 'interview', 'versions', '1.md'), 'utf8')).toBe(before)
    expect(await findExpertVersion(preset, before)).toBe(1)
    expect(await findExpertVersion(preset, updated.prompt)).toBe(2)
    await expect(readExpertVersionComparison(preset, 2)).resolves.toMatchObject({
      version: { version: 2, summary: 'Ask one question at a time' },
      previousVersion: 1,
      previousPrompt: before,
      prompt: updated.prompt,
    })
    await expect(readExpertVersionComparison(preset, 1)).resolves.toMatchObject({
      previousVersion: null,
      previousPrompt: '',
      prompt: before,
    })
  })

  it('rejects a stale editor instead of overwriting a newer version', async () => {
    const { preset } = await fixture()
    await updateExpert(preset, 1, {
      name: 'Interview coach', welcome: '', prompt: 'New prompt',
    }, 'New prompt', [])

    await expect(updateExpert(preset, 1, {
      name: 'Interview coach', welcome: '', prompt: 'Stale prompt',
    }, 'Stale prompt', [])).rejects.toMatchObject({
      code: 'expert/version-conflict',
      details: { expertId: 'interview', expected: 1, actual: 2 },
    })
  })

  it('enforces deployment limits before any authoring write', () => {
    const limits: ExpertConfig = { ...DEFAULT_EXPERT_CONFIG, maxPromptBytes: 4 }
    expect(() => {
      validateExpertInput('tiny', { name: 'Tiny', welcome: '', prompt: '12345' }, limits)
    }).toThrow(/exceeds 4 UTF-8 bytes/)
  })

  it('recognizes ordinary presets and rejects missing or malformed expert files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-expert-invalid-'))
    roots.push(root)
    const preset: AgentPreset = { id: 'ordinary', trust: 'user', path: join(root, 'ordinary', 'agent.cordis.yml') }
    await mkdir(join(root, 'ordinary'), { recursive: true })

    await expect(readExpertSummary(preset)).resolves.toBeUndefined()
    await expect(readExpertDocument(preset)).rejects.toMatchObject({ code: 'expert/not-found' })
    await expect(readExpertVersionComparison(preset, 1)).rejects.toMatchObject({ code: 'expert/not-found' })
    await expect(synchronizeExpertComposition(preset)).resolves.toBe(false)
    await expect(findExpertVersion(preset, 'none')).resolves.toBeUndefined()

    await writeFile(join(root, 'ordinary', 'expert.json'), '{broken')
    await expect(readExpertSummary(preset)).rejects.toMatchObject({ code: 'expert/invalid' })

    const invalidPath: AgentPreset = {
      id: 'invalid-path', trust: 'user', path: `${join(root, 'bad')}\0/agent.cordis.yml`,
    }
    await expect(readExpertSummary(invalidPath)).rejects.toThrow()
  })

  it('rejects missing and inconsistent version artifacts', async () => {
    const { root, preset } = await fixture()
    for (const version of [0, 1.5, 2]) {
      await expect(readExpertVersionComparison(preset, version)).rejects.toMatchObject({ code: 'expert/invalid' })
    }

    await writeFile(join(root, 'interview', 'versions', '1.json'), JSON.stringify({
      version: 2, createdAt: 1, summary: 'wrong', changes: [],
    }))
    await expect(readExpertDocument(preset)).rejects.toThrow(/record names version 2/)

    await rm(join(root, 'interview', 'versions', '1.json'))
    await expect(readExpertDocument(preset)).rejects.toThrow(/cannot read version 1/)
    await writeFile(join(root, 'interview', 'versions', '1.json'), JSON.stringify({
      version: 1, createdAt: 1, summary: 'restored', changes: [],
    }))
    await rm(join(root, 'interview', 'versions', '1.md'))
    await expect(readExpertDocument(preset)).rejects.toThrow(/cannot read prompt version 1/)
  })

  it('validates every user-authored field and accepts both optional-icon forms', () => {
    const tiny: ExpertConfig = {
      ...DEFAULT_EXPERT_CONFIG, maxNameCharacters: 3, maxWelcomeCharacters: 3, maxPromptBytes: 4,
    }
    const cases = [
      { input: { name: ' ', welcome: '', prompt: 'x' }, message: 'name must not be empty' },
      { input: { name: 'long', welcome: '', prompt: 'x' }, message: 'name exceeds 3 characters' },
      { input: { name: 'ok', welcome: 'long', prompt: 'x' }, message: 'welcome exceeds 3 characters' },
      { input: { name: 'ok', welcome: '', prompt: ' ' }, message: 'prompt must not be empty' },
      { input: { name: 'ok', welcome: '', prompt: '12345' }, message: 'prompt exceeds 4 UTF-8 bytes' },
      { input: { name: 'ok', welcome: '', prompt: 'x', icon: 'unknown' }, message: 'unknown icon' },
    ]
    for (const { input, message } of cases) {
      expect(() => { validateExpertInput('tiny', input as never, tiny) }).toThrow(message)
    }
    expect(() => { validateExpertInput('ok', { name: 'ok', welcome: '', prompt: 'x' }, tiny) }).not.toThrow()
    expect(() => {
      validateExpertInput('ok', { name: 'ok', welcome: '', prompt: 'x', icon: 'code' }, tiny)
    }).not.toThrow()
  })

  it('refuses duplicate creation and updates only metadata when the prompt is unchanged', async () => {
    const { preset } = await fixture()
    await expect(createExpert([{ path: join(preset.path, '..', '..'), trust: 'user' }], 'interview', {
      name: 'Duplicate', welcome: '', prompt: 'Prompt',
    })).rejects.toThrow(/preset directory already exists/)

    const before = await readExpertDocument(preset)
    const updated = await updateExpert(preset, 1, {
      name: 'Renamed coach', welcome: '', prompt: before.prompt,
    }, 'metadata only', [])
    expect(updated).toMatchObject({ name: 'Renamed coach', currentVersion: 1 })
    expect(updated.versions).toEqual(before.versions)
    expect(updated).not.toHaveProperty('icon')
  })

  it('creates an expert without optional icon metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-expert-no-icon-'))
    roots.push(root)
    await createExpert([{ path: root, trust: 'user' }], 'plain', {
      name: 'Plain expert', welcome: '', prompt: 'Prompt',
    })
    const preset: AgentPreset = { id: 'plain', trust: 'user', path: join(root, 'plain', 'agent.cordis.yml') }
    expect(await readExpertSummary(preset)).not.toHaveProperty('icon')
  })

  it('rejects read-only and missing experts during update', async () => {
    const { root, preset } = await fixture()
    await expect(updateExpert({ ...preset, trust: 'system' }, 1, {
      name: 'Expert', welcome: '', prompt: 'Prompt',
    }, 'read-only', [])).rejects.toThrow(/shipped presets are read-only/)

    await rm(join(root, 'interview', 'expert.json'))
    await expect(updateExpert(preset, 1, {
      name: 'Expert', welcome: '', prompt: 'Prompt',
    }, 'missing', [])).rejects.toMatchObject({ code: 'expert/not-found' })
  })

  it('removes a new prompt if writing its version record fails', async () => {
    const { root, preset } = await fixture()
    const record = join(root, 'interview', 'versions', '2.json')
    await writeFile(record, '{}')

    await expect(updateExpert(preset, 1, {
      name: 'Interview coach', welcome: '', prompt: 'Version two',
    }, 'version two', [])).rejects.toThrow()
    await expect(readFile(join(root, 'interview', 'versions', '2.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('removes its private temporary directory when publication fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-expert-publish-failure-'))
    roots.push(root)
    fsFaults.failRename = true

    await expect(createExpert([{ path: root, trust: 'user' }], 'failed', {
      name: 'Failed expert', welcome: '', prompt: 'Prompt',
    })).rejects.toThrow('rename failed')
    expect(await readdir(root)).toEqual([])
  })

  it('returns no matching version when every stored prompt differs', async () => {
    const { preset } = await fixture()
    await expect(findExpertVersion(preset, 'not stored')).resolves.toBeUndefined()
  })
})
