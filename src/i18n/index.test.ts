import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n, { switchLanguage } from '@/i18n'
import { usePreferences } from '@/lib/preferences'

afterEach(async () => {
  vi.doUnmock('@/i18n/en')
  vi.resetModules()
  await i18n.changeLanguage('id')
})

describe('lazy English translations', () => {
  it('keeps English out of the startup bundle until it is chosen', async () => {
    expect(i18n.language).toBe('id')
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(false)
    expect(i18n.t('app.cancel')).toBe('Batal')

    await switchLanguage('en')

    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true)
    expect(i18n.t('app.cancel')).toBe('Cancel')
    expect(document.documentElement.lang).toBe('en')
  })

  it('switches through the language preference and remembers it', async () => {
    usePreferences.getState().setLanguage('en')

    await waitFor(() => expect(i18n.language).toBe('en'))
    expect(i18n.t('app.save')).toBe('Save')
    expect(window.localStorage.getItem('cs-console.language')).toBe('en')

    usePreferences.getState().setLanguage('id')
    await waitFor(() => expect(i18n.t('app.save')).toBe('Simpan'))
    expect(usePreferences.getState().language).toBe('id')
  })

  it('loads a saved English choice before the first render', async () => {
    vi.resetModules()
    window.localStorage.setItem('cs-console.language', 'en')
    const fresh = await import('@/i18n')

    expect(fresh.default.language).toBe('en')
    expect(fresh.default.hasResourceBundle('en', 'translation')).toBe(false)

    await fresh.prepareLanguage()

    expect(fresh.default.t('app.cancel')).toBe('Cancel')
  })

  it('switches lazily loaded feature strings together with the base language', async () => {
    vi.resetModules()
    const fresh = await import('@/i18n')
    await fresh.loadStrings('platform', 'moderation', 'policy')
    expect(fresh.default.t('platform.keys.title')).toBe('API Integrasi')
    expect(fresh.default.hasResourceBundle('en', 'translation')).toBe(false)

    await fresh.switchLanguage('en')

    expect(fresh.default.t('platform.keys.title')).toBe('Integration API')
    expect(fresh.default.t('moderation.queues.held')).toBe('Held content')
    expect(fresh.default.t('policy.actions.hold')).toBe('Hold')
    expect(fresh.default.t('app.cancel')).toBe('Cancel')
  })

  it('loads a feature bundle in English without hiding the English base strings', async () => {
    vi.resetModules()
    window.localStorage.setItem('cs-console.language', 'en')
    const fresh = await import('@/i18n')

    await fresh.loadStrings('policy')

    expect(fresh.default.t('policy.title')).toBe('Content policy')
    expect(fresh.default.t('app.cancel')).toBe('Cancel')
    expect(fresh.default.hasResourceBundle('id', 'translation')).toBe(true)
  })

  it('loads a feature bundle by itself when a screen asks for its strings first', async () => {
    vi.resetModules()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fresh = await import('@/i18n')

    expect(fresh.default.t('system.map.healthyShare')).toBe('system.map.healthyShare')

    await waitFor(() => expect(fresh.default.t('system.map.healthyShare')).toBe('sehat'))
    expect(fresh.default.t('system.title')).toBe('Kesehatan sistem')
    expect(fresh.default.options.react?.bindI18nStore).toBe('added')
  })

  it('ignores missing keys outside the feature bundles', async () => {
    vi.resetModules()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fresh = await import('@/i18n')
    const translate = fresh.default.t as unknown as (key: string) => string

    expect(translate('app.notAKey')).toBe('app.notAKey')
    await fresh.loadStrings('help')
    expect(translate('help.notAKey')).toBe('help.notAKey')

    expect(warn).not.toHaveBeenCalled()
  })

  it('falls back to Indonesian when the English file cannot be loaded', async () => {
    vi.resetModules()
    vi.doMock('@/i18n/en', () => {
      throw new Error('chunk failed to load')
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    window.localStorage.setItem('cs-console.language', 'en')
    const fresh = await import('@/i18n')

    await fresh.prepareLanguage()

    expect(fresh.default.language).toBe('id')
    expect(fresh.default.t('app.cancel')).toBe('Batal')
  })
})
