import { describe, expect, it } from 'vitest'

import {
  configFromDraft,
  draftFromConfig,
  draftProblems,
  normalizeFingerprint,
  normalizeStatus,
  parseAndroid,
  parseIos,
  sameConfig,
  validBaseUrl,
  validScheme,
} from './logic'
import type { ShareLinksConfig } from './types'

const print = Array.from({ length: 32 }, () => 'AB').join(':')

const config: ShareLinksConfig = {
  enabled: true,
  base_url: 'https://share.olt.test',
  preview: true,
  app_name: 'OLT',
  app_scheme: 'olt',
  android: [{ package: 'co.olt.app', sha256: [print] }],
  ios_app_ids: ['ABCDE12345.co.olt.app'],
  android_store_url: 'https://play.google.com/store/apps/details?id=co.olt.app',
  ios_store_url: '',
  windows_download_url: '',
  macos_download_url: '',
}

describe('share links logic', () => {
  it('accepts a host with an optional port and rejects paths and other schemes', () => {
    expect(validBaseUrl('https://share.olt.test')).toBe(true)
    expect(validBaseUrl('http://192.168.0.235:8000')).toBe(true)
    expect(validBaseUrl('https://share.olt.test/p')).toBe(false)
    expect(validBaseUrl('ftp://share.olt.test')).toBe(false)
  })

  it('rejects web and system schemes as the app scheme', () => {
    expect(validScheme('olt')).toBe(true)
    expect(validScheme('olt-trade')).toBe(true)
    for (const bad of ['https', 'javascript', 'intent', 'OLT', 'o', '1olt'])
      expect(validScheme(bad)).toBe(false)
  })

  it('normalizes fingerprints with or without colons', () => {
    expect(normalizeFingerprint('ab'.repeat(32))).toBe(print)
    expect(normalizeFingerprint(print.toLowerCase())).toBe(print)
    expect(normalizeFingerprint('AB:CD')).toBeNull()
  })

  it('parses one Android app per line and reports the failing line', () => {
    expect(parseAndroid(`co.olt.app ${print} ${'ab'.repeat(32)}\n\nco.olt.beta ${print}`)).toEqual({
      ok: true,
      apps: [
        { package: 'co.olt.app', sha256: [print] },
        { package: 'co.olt.beta', sha256: [print] },
      ],
    })
    expect(parseAndroid(`co.olt.app ${print}\nolt ${print}`)).toEqual({
      ok: false,
      problem: 'package',
      line: 2,
    })
    expect(parseAndroid('co.olt.app')).toEqual({ ok: false, problem: 'fingerprintCount', line: 1 })
    expect(parseAndroid('co.olt.app AB:CD')).toEqual({ ok: false, problem: 'fingerprint', line: 1 })
    expect(
      parseAndroid(Array.from({ length: 6 }, (_, i) => `co.olt.a${i} ${print}`).join('\n')),
    ).toMatchObject({
      ok: false,
      problem: 'tooMany',
    })
  })

  it('parses iOS App IDs and drops duplicates', () => {
    expect(parseIos('ABCDE12345.co.olt.app\nABCDE12345.co.olt.app')).toEqual({
      ok: true,
      ids: ['ABCDE12345.co.olt.app'],
    })
    expect(parseIos('co.olt.app')).toEqual({ ok: false, problem: 'appId', line: 1 })
  })

  it('round-trips the saved config through the draft', () => {
    const draft = draftFromConfig(config)
    expect(draft.android).toBe(`co.olt.app ${print}`)
    expect(sameConfig(configFromDraft(draft), config)).toBe(true)
    expect(
      configFromDraft({ ...draft, baseUrl: 'https://share.olt.test/ ', appScheme: ' OLT ' }),
    ).toMatchObject({
      base_url: 'https://share.olt.test',
      app_scheme: 'olt',
    })
  })

  it('needs a domain before enabling and https download links', () => {
    const draft = { ...draftFromConfig(config), baseUrl: '', iosStore: 'http://apps.apple.com/x' }
    expect(draftProblems(draft)).toEqual({
      baseUrl: { code: 'baseUrlRequired' },
      iosStore: { code: 'httpsInvalid' },
    })
    expect(draftProblems({ ...draft, enabled: false, iosStore: '' })).toEqual({})
  })

  it('fills defaults for a partial status', () => {
    expect(normalizeStatus(null)).toMatchObject({
      ready: false,
      codes: 0,
      config: { enabled: false, preview: true, app_name: 'OLT', app_scheme: 'olt', android: [] },
    })
  })
})
