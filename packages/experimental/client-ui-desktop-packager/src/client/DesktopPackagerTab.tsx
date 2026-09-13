import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { Button, RiskConfirmation } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  DesktopPackagerRevealResult,
  DesktopPackagerStage,
  DesktopPackagerStartResult,
  DesktopPackagerStatus,
} from '@deepseek-ai/dsh-experimental-desktop-packager/types'
import type { DesktopPackagerLocaleKey } from './locales.ts'
import css from './DesktopPackagerTab.module.css'

/** Registration-side Remote face used by the Settings tab and the `/desktop` command. */
export interface DesktopPackagerTabInjected {
  /** Read the current build status. */
  status: () => Promise<DesktopPackagerStatus>
  /** Start one build; a refusal is a business result, not a read failure. */
  start: () => Promise<DesktopPackagerStartResult>
  /** Terminate the running build. */
  cancel: () => Promise<DesktopPackagerStatus>
  /** Reveal the last produced installer in this machine's file manager. */
  reveal: () => Promise<DesktopPackagerRevealResult>
}

/** Full component props assembled by the Settings slot renderer. */
export type DesktopPackagerTabProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'settings.desktopPackager'>
  & InjectFace<DesktopPackagerTabInjected>

/** Re-read cadence while a build runs. */
const POLL_INTERVAL_MS = 1_000

const PHASE_KEYS = {
  idle: 'phaseIdle',
  running: 'phaseRunning',
  succeeded: 'phaseSucceeded',
  failed: 'phaseFailed',
  cancelled: 'phaseCancelled',
} as const satisfies Record<DesktopPackagerStatus['phase'], DesktopPackagerLocaleKey>

const STAGE_KEYS = {
  idle: 'stageIdle',
  build: 'stageBuild',
  packages: 'stagePackages',
  runtime: 'stageRuntime',
  dependencies: 'stageDependencies',
  installer: 'stageInstaller',
  finished: 'stageFinished',
} as const satisfies Record<DesktopPackagerStage, DesktopPackagerLocaleKey>

/** Translate seat this plugin's dictionaries are bound to. */
type Translate = DesktopPackagerTabProps['t']

/**
 * Localized phase label, naming the idle phase before the first status read.
 * @param status - last read status, absent before the first read.
 * @param t - bound dictionary.
 * @returns the localized phase name.
 */
export function phaseText(status: DesktopPackagerStatus | undefined, t: Translate): string {
  return t(status === undefined ? 'phaseIdle' : PHASE_KEYS[status.phase])
}

/**
 * Localized stage label, naming the idle stage before the first status read.
 * @param status - last read status, absent before the first read.
 * @param t - bound dictionary.
 * @returns the localized stage name.
 */
export function stageText(status: DesktopPackagerStatus | undefined, t: Translate): string {
  return t(status === undefined ? 'stageIdle' : STAGE_KEYS[status.stage])
}

/** Render the Desktop packager controls: current state, one confirmed build, and its output. */
export function DesktopPackagerTab({ status, start, cancel, reveal, t }: DesktopPackagerTabProps): ReactNode {
  const logId = useId()
  const [current, setCurrent] = useState<DesktopPackagerStatus | undefined>(undefined)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [confirming, setConfirming] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setCurrent(await status())
      setFailure(undefined)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    }
  }, [status])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const running = current?.phase === 'running'
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => { void refresh() }, POLL_INTERVAL_MS)
    return () => { clearInterval(timer) }
  }, [running, refresh])

  /** Run one injected operation, surfacing its failure without losing the last status. */
  const run = async (operation: () => Promise<DesktopPackagerStatus>): Promise<void> => {
    setBusy(true)
    try {
      setCurrent(await operation())
      setFailure(undefined)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const confirmBuild = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await start()
      setFailure(result.ok ? undefined : result.error.message)
      if (result.ok) setCurrent(result.status)
      setConfirming(false)
      setAcknowledged(false)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const showInFolder = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await reveal()
      setFailure(result.ok ? undefined : result.error)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const copyPath = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path)
      setFailure(undefined)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    }
  }

  const artifactPath = current?.artifactPath

  return (
    <div className={css.section}>
      <p className={css.intro}>{t('intro')}</p>
      <dl className={css.facts}>
        <div>
          <dt>{t('targetLabel')}</dt>
          <dd><code>{current?.target}</code></dd>
        </div>
        <div>
          <dt>{t('repositoryLabel')}</dt>
          <dd><code data-desktop-repository>{current?.repositoryRoot}</code></dd>
        </div>
        <div>
          <dt>{t('mirrorLabel')}</dt>
          <dd data-desktop-mirror={current?.electronMirror ?? ''}>
            {current?.electronMirror ?? t('mirrorUnset')}
          </dd>
        </div>
        <div>
          <dt>{t('phaseLabel')}</dt>
          <dd data-desktop-phase={current?.phase ?? 'unknown'}>{phaseText(current, t)}</dd>
        </div>
        <div>
          <dt>{t('stageLabel')}</dt>
          <dd data-desktop-stage={current?.stage ?? 'unknown'}>{stageText(current, t)}</dd>
        </div>
      </dl>

      <div className={css.actions}>
        <Button
          variant="primary"
          disabled={busy || running}
          onClick={() => { setConfirming(true) }}
        >
          {t('start')}
        </Button>
        <Button
          variant="outline"
          disabled={busy || !running}
          onClick={() => { void run(async () => await cancel()) }}
        >
          {t('cancel')}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          data-desktop-reveal
          onClick={() => { void showInFolder() }}
        >
          {t('reveal')}
        </Button>
      </div>

      {failure === undefined ? null : <p className={css.failure} role="alert">{failure}</p>}
      {current?.error === undefined ? null : <p className={css.failure} role="alert">{current.error}</p>}

      {artifactPath === undefined ? null : (
        <p className={css.artifact}>
          <span>{t('artifactLabel')}</span>
          <code data-desktop-artifact>{artifactPath}</code>
          <Button size="sm" disabled={busy} onClick={() => { void copyPath(artifactPath) }}>{t('copyPath')}</Button>
        </p>
      )}

      <section className={css.logSection}>
        <h3 className={css.logTitle} id={logId}>{t('logLabel')}</h3>
        <pre className={css.log} aria-labelledby={logId} data-desktop-log>
          {current === undefined || current.log === '' ? t('logEmpty') : current.log}
        </pre>
      </section>

      <RiskConfirmation
        open={confirming}
        title={t('confirmTitle')}
        description={t('confirmDescription')}
        acknowledgeLabel={t('confirmAcknowledge')}
        cancelLabel={t('confirmCancel')}
        closeLabel={t('confirmClose')}
        confirmLabel={t('confirmConfirm')}
        acknowledged={acknowledged}
        disabled={busy}
        onAcknowledgedChange={setAcknowledged}
        onCancel={() => {
          setConfirming(false)
          setAcknowledged(false)
        }}
        onConfirm={() => { void confirmBuild() }}
      />
    </div>
  )
}
