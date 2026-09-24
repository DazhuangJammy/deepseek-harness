import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AgentHandle } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-agent-preset-registry'
import type {} from '@deepseek-ai/dsh-system-prompt'
import {
  assertFixtureInventory,
  launchWebScaffold,
  type WebScaffold,
} from './scaffold.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('../../../snapshots/web/chat-preset', import.meta.url))
const FIXTURE = join(SNAPSHOT_DIR, 'session.v3.jsonl')
const PROMPT = 'Reply exactly CHAT_PRESET_REQUEST_OK and stop.'
const CHAT_PROMPT = 'You are a helpful conversational assistant.'

function systemPromptText(session: Session): string | undefined {
  const message = session.deriveMessages().find(candidate => candidate.role === 'system')
  return message?.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
}

describe('chat agent preset', () => {
  let scaffold: WebScaffold
  let agentHandle: AgentHandle

  beforeAll(async () => {
    scaffold = await launchWebScaffold({ replayFixture: FIXTURE, compareReplaySession: true, paceMs: 10 })
    agentHandle = await scaffold.ctx.agents.create({
      sessionId: SessionId('chat-preset-smoke'),
      meta: { cwd: scaffold.workspaceCwd, agentPreset: 'chat' },
      agentOptions: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
      setup: agentCtx => scaffold.ctx.agentPresets.mount(agentCtx, 'chat').then(() => undefined),
    })
    agentHandle.agent.followup(createUserMessage({
      content: [{ type: 'text', text: PROMPT }],
      source: { kind: 'user' },
    }))
    await agentHandle.agent.whenIdle()
  })

  afterAll(async () => {
    const failures: unknown[] = []
    await agentHandle?.dispose().catch((error: unknown) => failures.push(error))
    await scaffold?.close().catch((error: unknown) => failures.push(error))
    if (failures.length === 1) throw failures[0]
    if (failures.length > 1) throw new AggregateError(failures, 'chat preset smoke teardown failed')
  })

  it('sends the chat persona, transcript, and Standard file tools to the model', () => {
    const requestHeader = agentHandle.agent.session.requestHeader()
    if (requestHeader === undefined) throw new Error('the chat agent issued no model request')
    expect({
      prompt: systemPromptText(agentHandle.agent.session),
      tools: requestHeader.tools?.map(tool => tool.name),
      compaction: scaffold.ctx.agentPresets.serviceFor(agentHandle.agent, 'compaction'),
      runtimeContextMessages: agentHandle.agent.session.snapshotEvents().filter(event => event.type === 'user/message'
        && event.data.source.kind === 'runtime-context').length,
    }).toEqual({
      prompt: CHAT_PROMPT,
      tools: ['bash', 'edit', 'glob', 'grep', 'read', 'read_image', 'write'],
      compaction: undefined,
      runtimeContextMessages: 0,
    })
  })

  it('keeps its snapshot inventory closed', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, [
      'session.v3.jsonl',
      'system-prompt.expected.md',
      'tool-schemas.expected.json',
    ])
  })
})
