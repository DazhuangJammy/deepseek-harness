// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import {
  BrandSettingsCard, OfficialBrandMark, OfficialBrandName, OfficialHeroBrandMark,
} from '../src/client/Brand.tsx'
import type { BrandEditorState } from '../src/client/Brand.tsx'
import { DEFAULT_BRAND_SETTINGS } from '../src/brand-settings.ts'
import type { BrandSettings } from '../src/brand-settings.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Translate through the package's own English dictionary, as the locale seat does. */
const t: TranslateNS<'ui-brand-official'> = key => (en as Readonly<Record<string, string>>)[key] ?? key

/** Editor fields a spec may seed; `draft` stays partial and merges over the defaults. */
type EditorSeed = Partial<Omit<BrandEditorState, 'draft'>> & { draft?: Partial<BrandSettings> }

const brandStoreOf = (value: Partial<BrandSettings> = {}): ReturnType<typeof createSnapshotStore<BrandSettings>> =>
  createSnapshotStore<BrandSettings>({ ...DEFAULT_BRAND_SETTINGS, ...value })

function editorStoreOf(value: EditorSeed = {}): ReturnType<typeof createSnapshotStore<BrandEditorState>> {
  const { draft, ...rest } = value
  return createSnapshotStore<BrandEditorState>({
    draft: { ...DEFAULT_BRAND_SETTINGS, ...draft }, dirty: false, saving: false, failed: false, ...rest,
  })
}

/** Render the settings card over live stores, mirroring the controller's edit fold. */
function renderCard(brand: Partial<BrandSettings> = {}, editor: EditorSeed = {}) {
  const brandStore = brandStoreOf(brand)
  const editorStore = editorStoreOf(editor)
  const edit = vi.fn((patch: Partial<BrandSettings>) => {
    editorStore.update((draft) => {
      draft.draft = { ...draft.draft, ...patch }
      draft.dirty = true
    })
  })
  const save = vi.fn()
  const reset = vi.fn()
  const view = render(
    <BrandSettingsCard
      t={t}
      useBrand={bindSnapshotSelector(brandStore)}
      useEditor={bindSnapshotSelector(editorStore)}
      edit={edit}
      save={save}
      reset={reset}
    />,
  )
  return { ...view, brandStore, editorStore, edit, save, reset }
}

function openCard(): void {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(en.title) }))
}

function fileInputOf(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('the card rendered no file input')
  return input
}

/** FileReader double whose read never settles until the test says so. */
class DeferredReader {
  static current: DeferredReader | undefined
  result: string | ArrayBuffer | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    DeferredReader.current = this
  }

  readAsDataURL(): void {
    // Settles through `onload`/`onerror`, driven by the test.
  }
}

describe('official brand mark and name', () => {
  it('prefers a configured mark image and otherwise keeps the shipped mark', () => {
    const custom = render(
      <OfficialBrandMark size={20} useBrand={bindSnapshotSelector(brandStoreOf({ enabled: true, icon: 'https://x/logo.png' }))} />,
    )
    expect(custom.container.querySelector('img')?.getAttribute('src')).toBe('https://x/logo.png')
    expect(custom.container.querySelector('img')?.getAttribute('width')).toBe('20')
    custom.unmount()

    const blankIcon = render(
      <OfficialBrandMark size={20} useBrand={bindSnapshotSelector(brandStoreOf({ enabled: true }))} />,
    )
    expect(blankIcon.container.querySelector('img')).toBeNull()
    expect(blankIcon.container.querySelector('svg')).not.toBeNull()
    blankIcon.unmount()

    const disabled = render(<OfficialBrandMark size={20} useBrand={bindSnapshotSelector(brandStoreOf({ icon: 'https://x/logo.png' }))} />)
    expect(disabled.container.querySelector('img')).toBeNull()
  })

  it('prefers a configured name and otherwise keeps the shipped wordmark', () => {
    const custom = render(
      <OfficialBrandName useBrand={bindSnapshotSelector(brandStoreOf({ enabled: true, name: 'Acme' }))} />,
    )
    expect(custom.container.textContent).toBe('Acme')
    custom.unmount()

    const blankName = render(
      <OfficialBrandName useBrand={bindSnapshotSelector(brandStoreOf({ enabled: true }))} />,
    )
    expect(blankName.container.querySelector('svg')).not.toBeNull()
    expect(blankName.container.textContent).toBe('')
    blankName.unmount()

    const disabled = render(<OfficialBrandName useBrand={bindSnapshotSelector(brandStoreOf({ name: 'Acme' }))} />)
    expect(disabled.container.querySelector('svg')).not.toBeNull()
  })

  it('renders the hero mark only while it has an image to show', () => {
    const bare = render(<OfficialHeroBrandMark size={28} />)
    expect(bare.container.firstChild).toBeNull()
    bare.unmount()

    const sized = render(
      <OfficialHeroBrandMark size={28} useBrand={bindSnapshotSelector(brandStoreOf({ enabled: true, icon: 'https://x/logo.png' }))} />,
    )
    expect(sized.container.querySelector('img')?.getAttribute('height')).toBe('28')
    sized.unmount()

    const classed = render(
      <OfficialHeroBrandMark
        size={28}
        className="hero-mark"
        useBrand={bindSnapshotSelector(brandStoreOf({ enabled: true, icon: 'https://x/logo.png' }))}
      />,
    )
    expect(classed.container.querySelector('img')?.className).toContain('hero-mark')
    classed.unmount()

    const blankIcon = render(
      <OfficialHeroBrandMark size={28} useBrand={bindSnapshotSelector(brandStoreOf({ enabled: true }))} />,
    )
    expect(blankIcon.container.firstChild).toBeNull()
    blankIcon.unmount()

    const disabled = render(
      <OfficialHeroBrandMark size={28} useBrand={bindSnapshotSelector(brandStoreOf({ icon: 'https://x/logo.png' }))} />,
    )
    expect(disabled.container.firstChild).toBeNull()
  })

})

describe('BrandSettingsCard', () => {
  it('withdraws itself while any injected member is missing', () => {
    const useBrand = bindSnapshotSelector(brandStoreOf())
    const useEditor = bindSnapshotSelector(editorStoreOf())
    const base = { t, useBrand, useEditor, edit: vi.fn(), save: vi.fn(), reset: vi.fn() }
    const partials = [
      { ...base, useBrand: undefined },
      { ...base, useEditor: undefined },
      { ...base, edit: undefined },
      { ...base, save: undefined },
      { ...base, reset: undefined },
    ]
    for (const partial of partials) {
      const view = render(<BrandSettingsCard {...(partial as unknown as Parameters<typeof BrandSettingsCard>[0])} />)
      expect(view.container.firstChild).toBeNull()
      view.unmount()
    }
    const full = render(<BrandSettingsCard {...base} />)
    expect(full.container.firstChild).not.toBeNull()
  })

  it('reveals the editor on demand and stages each field', () => {
    const view = renderCard({}, { draft: { enabled: true, name: '', icon: '' } })
    expect(view.container.querySelector('input[type="checkbox"]')).toBeNull()

    openCard()
    expect(screen.getByRole('checkbox', { name: en.enabled })).toHaveProperty('checked', true)

    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Acme' } })
    expect(view.edit).toHaveBeenCalledWith({ name: 'Acme' })

    fireEvent.change(screen.getByRole('textbox', { name: /^Icon URL/ }), { target: { value: 'https://x/logo.png' } })
    expect(view.edit).toHaveBeenCalledWith({ icon: 'https://x/logo.png' })

    fireEvent.click(screen.getByRole('checkbox', { name: en.enabled }))
    expect(view.edit).toHaveBeenCalledWith({ enabled: false })

    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.title) }))
    expect(view.container.querySelector('input[type="checkbox"]')).toBeNull()
  })

  it('clears the icon field while the stored value is an embedded data URL', () => {
    renderCard({}, { draft: { enabled: true, name: 'Acme', icon: 'data:image/png;base64,AAAA' } })
    openCard()
    expect(screen.getByRole('textbox', { name: /^Icon URL/ })).toHaveProperty('value', '')
  })

  it('previews the default brand until a name is configured', () => {
    const plain = renderCard()
    openCard()
    expect(screen.getByText(en.preview)).toBeTruthy()
    expect(plain.container.querySelector('img')).toBeNull()
    plain.unmount()

    const custom = renderCard({}, { draft: { enabled: true, name: 'Acme', icon: 'https://x/logo.png' } })
    openCard()
    expect(screen.getByText('Acme')).toBeTruthy()
    expect(custom.container.querySelector('img')?.getAttribute('src')).toBe('https://x/logo.png')
  })

  it('reports unsaved, saved, and failed states', () => {
    const dirty = renderCard({ enabled: true }, { draft: { enabled: true, name: 'Acme' }, dirty: true })
    openCard()
    expect(screen.getByText(en.unsaved)).toBeTruthy()
    dirty.unmount()

    const saved = renderCard({ enabled: true }, { draft: { enabled: true, name: 'Acme' }, dirty: false })
    openCard()
    expect(screen.getByText(en.saved)).toBeTruthy()
    saved.unmount()

    const inactive = renderCard({ enabled: false }, { draft: { enabled: true, name: 'Acme' }, dirty: false })
    openCard()
    expect(screen.queryByText(en.saved)).toBeNull()
    inactive.unmount()

    renderCard({ enabled: true }, { draft: { enabled: true, name: 'Acme' }, dirty: true, failed: true })
    openCard()
    expect(screen.getByText(en.failed)).toBeTruthy()
  })

  it('locks the form while a write is in flight', () => {
    renderCard({ enabled: true }, { draft: { enabled: true, name: 'Acme' }, dirty: true, saving: true })
    openCard()
    expect(screen.getByRole('checkbox', { name: en.enabled })).toHaveProperty('disabled', true)
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('textbox', { name: /^Icon URL/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: en.upload })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: en.reset })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: en.saving })).toHaveProperty('disabled', true)
  })

  it('locks the form while custom branding is off', () => {
    renderCard({ enabled: false }, { draft: { enabled: false, name: 'Acme' }, dirty: true })
    openCard()
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('textbox', { name: /^Icon URL/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: en.upload })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: en.save })).toHaveProperty('disabled', false)
  })

  it('saves and resets from the footer', () => {
    const view = renderCard({ enabled: true }, { draft: { enabled: true, name: 'Acme' }, dirty: true })
    openCard()
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    fireEvent.click(screen.getByRole('button', { name: en.reset }))
    expect(view.save).toHaveBeenCalledOnce()
    expect(view.reset).toHaveBeenCalledOnce()
  })

  it('uploads a picked image as a data URL through the file control', async () => {
    const view = renderCard({}, { draft: { enabled: true, name: '', icon: '' } })
    openCard()
    const click = vi.spyOn(HTMLInputElement.prototype, 'click')
    fireEvent.click(screen.getByRole('button', { name: en.upload }))
    expect(click).toHaveBeenCalled()

    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    fireEvent.change(fileInputOf(view.container), { target: { files: [file] } })

    await waitFor(() => { expect(view.edit).toHaveBeenCalled() })
    const staged = view.edit.mock.calls.at(-1)?.[0]
    expect(staged?.icon).toMatch(/^data:image\/png;base64,/)
    await waitFor(() => { expect(screen.getByRole('button', { name: en.upload })).toBeTruthy() })
  })

  it('ignores a picked file that is not an image and an empty picker result', async () => {
    const view = renderCard({}, { draft: { enabled: true, name: '', icon: '' } })
    openCard()
    const input = fileInputOf(view.container)

    fireEvent.change(input, { target: { files: [new File(['notes'], 'notes.txt', { type: 'text/plain' })] } })
    fireEvent.change(input, { target: { files: [] } })
    await Promise.resolve()

    expect(view.edit).not.toHaveBeenCalled()
  })

  it('shows progress while a read is pending and applies a text result', () => {
    vi.stubGlobal('FileReader', DeferredReader)
    const view = renderCard({}, { draft: { enabled: true, name: '', icon: '' } })
    openCard()

    fireEvent.change(fileInputOf(view.container), {
      target: { files: [new File(['logo'], 'logo.png', { type: 'image/png' })] },
    })
    expect(screen.getByRole('button', { name: en.uploading })).toHaveProperty('disabled', true)

    expect(DeferredReader.current).toBeDefined()
    act(() => {
      DeferredReader.current!.result = 'data:image/png;base64,QQ=='
      DeferredReader.current!.onload?.()
    })

    expect(view.edit).toHaveBeenCalledWith({ icon: 'data:image/png;base64,QQ==' })
    expect(screen.getByRole('button', { name: en.upload })).toBeTruthy()
  })

  it('clears progress when the read fails or yields no text', () => {
    vi.stubGlobal('FileReader', DeferredReader)
    const view = renderCard({}, { draft: { enabled: true, name: '', icon: '' } })
    openCard()
    const input = fileInputOf(view.container)
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [file] } })
    act(() => { DeferredReader.current!.onerror?.() })
    expect(view.edit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: en.upload })).toBeTruthy()

    fireEvent.change(input, { target: { files: [file] } })
    act(() => {
      DeferredReader.current!.result = new ArrayBuffer(4)
      DeferredReader.current!.onload?.()
    })
    expect(view.edit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: en.upload })).toBeTruthy()
  })
})
