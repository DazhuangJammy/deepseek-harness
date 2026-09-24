import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, Config } from '../src/index.ts'
import { BRAND_SETTINGS_NAMESPACE } from '../src/brand-settings.ts'

describe('ui-brand-official host half', () => {
  it('claims the entry page policy so the shipped card owns the surface', async () => {
    const ctx = new Context()
    const configure = vi.fn(() => () => {})
    ctx.provide('settings', { configure } as never)

    const fiber = ctx.plugin({ apply })
    await fiber.await()

    expect(configure).toHaveBeenCalledWith({ auto: false }, expect.anything())
    await fiber.dispose()
  })

  it('declares the volatile brand fields as its own entry config', () => {
    // `volatile()` is the contract that makes these fields preferences: the
    // describe mirror projects exactly the volatile subset, so a non-volatile
    // field would never reach the browser card.
    const dict = Config.dict as Record<string, { meta: { volatile?: boolean } }>
    expect(Object.keys(dict).sort()).toEqual(['enabled', 'icon', 'name'])
    for (const field of ['enabled', 'name', 'icon']) {
      expect(dict[field]?.meta.volatile).toBe(true)
    }
  })

  it('names the entry after the browser-visible namespace', () => {
    expect(BRAND_SETTINGS_NAMESPACE).toBe('ui-brand-official')
  })

  it('is inert without a context', () => {
    expect(() => { apply() }).not.toThrow()
  })
})
