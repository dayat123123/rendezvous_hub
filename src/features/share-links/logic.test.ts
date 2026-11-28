import { describe, expect, it } from 'vitest'

import {
  draftFromConfig,
  draftProblems,
  downloadTotal,
  hasStats,
  normalizeStats,
  normalizeStatus,
  sameSettings,
  settingsFromDraft,
  validBaseUrl,
} from './logic'

describe('share links logic', () => {
  it('accepts a host with an optional port and rejects paths and other schemes', () => {
    expect(validBaseUrl('https://share.olt.test')).toBe(true)
    expect(validBaseUrl('http://192.168.0.235:8000')).toBe(true)
    expect(validBaseUrl('https://share.olt.test/p')).toBe(false)
    expect(validBaseUrl('ftp://share.olt.test')).toBe(false)
  })

  it('needs a domain before enabling and trims the trailing slash', () => {
    expect(draftProblems({ enabled: true, baseUrl: ' ', preview: true })).toEqual({
      baseUrl: { code: 'baseUrlRequired' },
    })
    expect(draftProblems({ enabled: false, baseUrl: 'https://x.test/p', preview: true })).toEqual({
      baseUrl: { code: 'baseUrlInvalid' },
    })
    expect(settingsFromDraft({ enabled: true, baseUrl: 'https://share.olt.test/ ', preview: false })).toEqual(
      {
        enabled: true,
        base_url: 'https://share.olt.test',
        preview: false,
      },
    )
  })

  it('reads the merged server view and compares only the share settings', () => {
    const status = normalizeStatus({
      config: {
        enabled: true,
        base_url: 'http://192.168.0.235:8000',
        preview: true,
        app_scheme: 'olt',
      } as never,
    })
    expect(status.config.app_name).toBe('OLT')
    expect(status.config.android).toEqual([])
    expect(sameSettings(settingsFromDraft(draftFromConfig(status.config)), status.config)).toBe(true)
    expect(normalizeStatus(null).config.app_scheme).toBe('')
  })

  it('reads statistics defensively and adds up downloads', () => {
    const empty = normalizeStats(null)
    expect(empty.totals.views).toBe(0)
    expect(hasStats(empty)).toBe(false)
    const stats = normalizeStats({
      totals: { views: 3, android: 1, ios: -2, windows: 2, mac: 'x' } as never,
      top: [{ post_id: 'p1', author_username: 'ani' } as never],
    })
    expect(downloadTotal(stats.totals)).toBe(3)
    expect(stats.top[0]).toMatchObject({ author_name: 'ani', available: false, views: 0, code: null })
    expect(hasStats(stats)).toBe(true)
  })
})
