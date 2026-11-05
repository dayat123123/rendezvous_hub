import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nModule from '@/i18n'

const i18nMock = vi.hoisted(() => ({ switchLanguage: vi.fn() }))

vi.mock('@/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof I18nModule>()
  return { ...actual, switchLanguage: i18nMock.switchLanguage }
})

const reload = vi.fn()

beforeEach(() => {
  window.sessionStorage.clear()
  window.localStorage.clear()
  reload.mockClear()
  vi.stubGlobal('location', { ...window.location, reload })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('language change after a new deployment', () => {
  it('keeps the chosen language and reloads when the old English chunk is gone', async () => {
    i18nMock.switchLanguage.mockRejectedValueOnce(
      new TypeError('Failed to fetch dynamically imported module: /assets/en-old.js'),
    )
    const { usePreferences } = await import('./preferences')

    usePreferences.getState().setLanguage('en')

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(window.localStorage.getItem('cs-console.language')).toBe('en')
  })

  it('reverts to the current language for any other failure', async () => {
    i18nMock.switchLanguage.mockRejectedValueOnce(new Error('boom'))
    const { usePreferences } = await import('./preferences')

    usePreferences.getState().setLanguage('en')

    await vi.waitFor(() => expect(usePreferences.getState().language).toBe('id'))
    expect(window.localStorage.getItem('cs-console.language')).toBe('id')
    expect(reload).not.toHaveBeenCalled()
  })
})
