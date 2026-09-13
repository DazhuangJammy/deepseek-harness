// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type {
  DesktopPackagerRevealResult,
  DesktopPackagerStartResult,
  DesktopPackagerStatus,
} from '@deepseek-ai/dsh-experimental-desktop-packager/types'
import {
  DesktopPackagerTab,
  type DesktopPackagerTabInjected,
  type DesktopPackagerTabProps,
} from '../src/client/DesktopPackagerTab.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const IDLE: DesktopPackagerStatus = {
  phase: 'idle',
  stage: 'idle',
  target: 'mac-arm64',
  repositoryRoot: '/checkout',
  command: 'pnpm run package:desktop:mac:arm64:unsigned',
  log: '',
}

const RUNNING: DesktopPackagerStatus = {
  ...IDLE,
  phase: 'running',
  stage: 'installer',
  startedAt: 1,
  log: 'building\n',
}

const SUCCEEDED: DesktopPackagerStatus = {
  ...IDLE,
  phase: 'succeeded',
  stage: 'finished',
  artifactPath: '/checkout/apps/desktop/.desktop-build/targets/mac-arm64/unsigned-artifacts/app.dmg',
  artifactBytes: 12,
}

/** Reject with one caller-supplied value, including a non-Error the tab must still render. */
function rejectWith<T>(value: unknown): Promise<T> {
  // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- proves the tab renders a non-Error rejection reason.
  return Promise.reject(value)
}

const ACCEPTED: DesktopPackagerStartResult = { ok: true, status: RUNNING }

/** Render the tab with the bound dictionary and one stubbed Host action face. */
function renderTab(actions: DesktopPackagerTabInjected): void {
  const props = { t: makeTranslate(zh), ...actions } as unknown as DesktopPackagerTabProps
  render(<DesktopPackagerTab {...props} />)
}

/** Render the tab over stubbed Host actions. */
function bench(options: {
  status: DesktopPackagerStatus
  start?: DesktopPackagerTabInjected['start']
  reveal?: DesktopPackagerTabInjected['reveal']
}) {
  const actions: DesktopPackagerTabInjected = {
    status: vi.fn((): Promise<DesktopPackagerStatus> => Promise.resolve(options.status)),
    start: options.start ?? vi.fn((): Promise<DesktopPackagerStartResult> => Promise.resolve(ACCEPTED)),
    cancel: vi.fn((): Promise<DesktopPackagerStatus> => Promise.resolve({ ...IDLE, phase: 'cancelled' })),
    reveal: options.reveal ?? vi.fn((): Promise<DesktopPackagerRevealResult> => Promise.resolve({ ok: true })),
  }
  renderTab(actions)
  return actions
}

describe('Desktop packager tab', () => {
  it('renders the configured target, repository, and idle phase', async () => {
    bench({ status: IDLE })
    expect(await screen.findByText('/checkout')).toBeDefined()
    expect(screen.getByText('mac-arm64')).toBeDefined()
    expect(screen.getByText(zh.phaseIdle)).toBeDefined()
    expect(screen.getByText(zh.mirrorUnset)).toBeDefined()
    expect(screen.getByText(zh.logEmpty)).toBeDefined()
  })

  it('gates the build behind an acknowledgement and starts only after confirming', async () => {
    const actions = bench({ status: IDLE })
    await screen.findByText('/checkout')
    fireEvent.click(screen.getByRole('button', { name: zh.start }))
    const confirm = screen.getByRole('button', { name: zh.confirmConfirm })
    fireEvent.click(confirm)
    expect(actions.start).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(zh.confirmAcknowledge))
    fireEvent.click(confirm)
    await waitFor(() => { expect(actions.start).toHaveBeenCalledOnce() })
  })

  it('cancels a running build and reports the cancelled phase', async () => {
    const actions = bench({ status: RUNNING })
    await screen.findByText('/checkout')
    const cancel = await screen.findByRole('button', { name: zh.cancel })
    expect(screen.getByRole('button', { name: zh.start }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(cancel)
    await waitFor(() => { expect(actions.cancel).toHaveBeenCalledOnce() })
    expect(await screen.findByText(zh.phaseCancelled)).toBeDefined()
  })

  it('shows a finished installer with a copy action', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    bench({ status: SUCCEEDED })
    const path = await screen.findByText(SUCCEEDED.artifactPath!)
    expect(screen.getByText(zh.stageFinished)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh.copyPath }))
    await waitFor(() => { expect(writeText).toHaveBeenCalledWith(SUCCEEDED.artifactPath) })
    expect(path).toBeDefined()
  })

  it('reports a refused start', async () => {
    const refused = vi.fn(() => Promise.resolve({
      ok: false as const,
      error: { code: 'repository-missing' as const, message: 'no apps/desktop here' },
    }))
    bench({ status: IDLE, start: refused })
    await screen.findByText('/checkout')
    fireEvent.click(screen.getByRole('button', { name: zh.start }))
    fireEvent.click(screen.getByLabelText(zh.confirmAcknowledge))
    fireEvent.click(screen.getByRole('button', { name: zh.confirmConfirm }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'no apps/desktop here')
  })

  it('reports a failing status read', async () => {
    const actions: DesktopPackagerTabInjected = {
      status: () => Promise.reject(new Error('gateway/internal: offline')),
      start: vi.fn((): Promise<DesktopPackagerStartResult> => Promise.resolve(ACCEPTED)),
      cancel: vi.fn((): Promise<DesktopPackagerStatus> => Promise.resolve(IDLE)),
      reveal: vi.fn((): Promise<DesktopPackagerRevealResult> => Promise.resolve({ ok: true })),
    }
    renderTab(actions)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'gateway/internal: offline')
  })

  it('polls while a build runs and stops polling after unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const actions = bench({ status: RUNNING })
      await screen.findByText('/checkout')
      const reads = (): number => (actions.status as ReturnType<typeof vi.fn>).mock.calls.length
      const before = reads()
      await vi.advanceTimersByTimeAsync(1_000)
      expect(reads()).toBeGreaterThan(before)
      cleanup()
      const settled = reads()
      await vi.advanceTimersByTimeAsync(5_000)
      expect(reads()).toBe(settled)
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders the build failure the status reports', async () => {
    bench({ status: { ...IDLE, phase: 'failed', error: 'the packaging command exited with 1' } })
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'the packaging command exited with 1',
    )
  })

  it('closes the confirmation without starting', async () => {
    const actions = bench({ status: IDLE })
    await screen.findByText('/checkout')
    fireEvent.click(screen.getByRole('button', { name: zh.start }))
    fireEvent.click(screen.getByLabelText(zh.confirmAcknowledge))
    fireEvent.click(screen.getByRole('button', { name: zh.confirmCancel }))
    expect(screen.queryByRole('button', { name: zh.confirmConfirm })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: zh.start }))
    fireEvent.click(screen.getByRole('button', { name: zh.confirmConfirm }))
    expect(actions.start).not.toHaveBeenCalled()
  })

  it('reports non-Error failures from every action', async () => {
    const cancelling: DesktopPackagerTabInjected = {
      status: vi.fn((): Promise<DesktopPackagerStatus> => Promise.resolve(RUNNING)),
      start: vi.fn((): Promise<DesktopPackagerStartResult> => Promise.resolve(ACCEPTED)),
      cancel: () => rejectWith<DesktopPackagerStatus>('plain failure'),
      reveal: vi.fn((): Promise<DesktopPackagerRevealResult> => Promise.resolve({ ok: true })),
    }
    renderTab(cancelling)
    await screen.findByText('/checkout')
    fireEvent.click(await screen.findByRole('button', { name: zh.cancel }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'plain failure')

    cleanup()
    bench({
      status: IDLE,
      start: () => rejectWith<DesktopPackagerStartResult>('plain failure'),
    })
    await screen.findByText('/checkout')
    fireEvent.click(screen.getByRole('button', { name: zh.start }))
    fireEvent.click(screen.getByLabelText(zh.confirmAcknowledge))
    fireEvent.click(screen.getByRole('button', { name: zh.confirmConfirm }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'plain failure')

    cleanup()
    Object.assign(navigator, { clipboard: { writeText: () => rejectWith<undefined>('plain failure') } })
    bench({ status: SUCCEEDED })
    await screen.findByText(SUCCEEDED.artifactPath!)
    fireEvent.click(screen.getByRole('button', { name: zh.copyPath }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'plain failure')
  })

  it('reports Error failures from every action', async () => {
    const cancelling: DesktopPackagerTabInjected = {
      status: vi.fn((): Promise<DesktopPackagerStatus> => Promise.resolve(RUNNING)),
      start: vi.fn((): Promise<DesktopPackagerStartResult> => Promise.resolve(ACCEPTED)),
      cancel: () => Promise.reject(new Error('action failed')),
      reveal: vi.fn((): Promise<DesktopPackagerRevealResult> => Promise.resolve({ ok: true })),
    }
    renderTab(cancelling)
    await screen.findByText('/checkout')
    fireEvent.click(await screen.findByRole('button', { name: zh.cancel }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'action failed')

    cleanup()
    bench({ status: IDLE, start: () => Promise.reject(new Error('action failed')) })
    await screen.findByText('/checkout')
    fireEvent.click(screen.getByRole('button', { name: zh.start }))
    fireEvent.click(screen.getByLabelText(zh.confirmAcknowledge))
    fireEvent.click(screen.getByRole('button', { name: zh.confirmConfirm }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'action failed')

    cleanup()
    Object.assign(navigator, { clipboard: { writeText: () => Promise.reject(new Error('action failed')) } })
    bench({ status: SUCCEEDED })
    await screen.findByText(SUCCEEDED.artifactPath!)
    fireEvent.click(screen.getByRole('button', { name: zh.copyPath }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'action failed')
  })

  it('keeps a non-Error status read failure readable', async () => {
    const actions: DesktopPackagerTabInjected = {
      status: () => rejectWith<DesktopPackagerStatus>('offline'),
      start: vi.fn((): Promise<DesktopPackagerStartResult> => Promise.resolve(ACCEPTED)),
      cancel: vi.fn((): Promise<DesktopPackagerStatus> => Promise.resolve(IDLE)),
      reveal: vi.fn((): Promise<DesktopPackagerRevealResult> => Promise.resolve({ ok: true })),
    }
    renderTab(actions)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'offline')
  })


  it('reveals the installer in the file manager', async () => {
    const reveal = vi.fn((): Promise<DesktopPackagerRevealResult> => Promise.resolve({ ok: true }))
    bench({ status: SUCCEEDED, reveal })
    await screen.findByText(SUCCEEDED.artifactPath!)
    fireEvent.click(screen.getByRole('button', { name: zh.reveal }))
    await waitFor(() => { expect(reveal).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reports a refused reveal and a non-Error reveal failure', async () => {
    bench({
      status: SUCCEEDED,
      reveal: () => Promise.resolve({ ok: false, error: 'revealing an installer is unsupported on plan9' }),
    })
    await screen.findByText(SUCCEEDED.artifactPath!)
    fireEvent.click(screen.getByRole('button', { name: zh.reveal }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'revealing an installer is unsupported on plan9',
    )

    cleanup()
    bench({ status: SUCCEEDED, reveal: () => rejectWith<DesktopPackagerRevealResult>('opener vanished') })
    await screen.findByText(SUCCEEDED.artifactPath!)
    fireEvent.click(screen.getByRole('button', { name: zh.reveal }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'opener vanished')

    cleanup()
    bench({ status: SUCCEEDED, reveal: () => Promise.reject(new Error('opener failed')) })
    await screen.findByText(SUCCEEDED.artifactPath!)
    fireEvent.click(screen.getByRole('button', { name: zh.reveal }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'opener failed')
  })

  it('keeps the artifacts-folder button available before any build', async () => {
    const reveal = vi.fn((): Promise<DesktopPackagerRevealResult> => Promise.resolve({ ok: true }))
    bench({ status: IDLE, reveal })
    await screen.findByText('/checkout')
    const button = screen.getByRole('button', { name: zh.reveal })
    expect(button.hasAttribute('disabled')).toBe(false)
    fireEvent.click(button)
    await waitFor(() => { expect(reveal).toHaveBeenCalledOnce() })
  })
})
