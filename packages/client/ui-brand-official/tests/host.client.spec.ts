import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'
import { BRAND_SETTINGS_NAMESPACE, BrandSettingsSchema } from '../src/brand-settings.ts'

describe('ui-brand-official host half', () => {
  it('registers the durable brand section through the settings service', async () => {
    const ctx = new Context()
    const register = vi.fn(() => () => {})
    ctx.provide('settings', { register } as never)

    const fiber = ctx.plugin({ apply })
    await fiber.await()

    expect(register).toHaveBeenCalledWith(BRAND_SETTINGS_NAMESPACE, BrandSettingsSchema)
    await fiber.dispose()
  })

  it('is inert without a context', () => {
    expect(() => { apply() }).not.toThrow()
  })
})
