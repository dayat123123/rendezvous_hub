import { describe, expect, it } from 'vitest'

import {
  downloadCount,
  draftFromIdentity,
  identityFromDraft,
  identityProblems,
  normalizeFingerprint,
  normalizeIdentityStatus,
  parseAndroid,
  parseIos,
  sameIdentity,
} from './logic'
import type { AppIdentity } from './types'

const print = Array.from({ length: 32 }, () => 'AB').join(':')

const identity: AppIdentity = {
  app_name: 'OLT',
  android: [{ package: 'co.olt.app', sha256: [print] }],
  ios_app_ids: ['ABCDE12345.co.olt.app'],
  android_store_url: 'https://play.google.com/store/apps/details?id=co.olt.app',
  ios_store_url: '',
  windows_download_url: '',
  macos_download_url: 'https://unduh.olt.test/OLT.dmg',
}

describe('app identity logic', () => {
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
    ).toMatchObject({ ok: false, problem: 'tooMany' })
  })

  it('parses iOS and Mac App IDs and drops duplicates', () => {
    expect(parseIos('ABCDE12345.co.olt.app\nABCDE12345.co.olt.mac\nABCDE12345.co.olt.app')).toEqual({
      ok: true,
      ids: ['ABCDE12345.co.olt.app', 'ABCDE12345.co.olt.mac'],
    })
    expect(parseIos('co.olt.app')).toEqual({ ok: false, problem: 'appId', line: 1 })
  })

  it('round-trips the saved identity through the draft and counts downloads', () => {
    const draft = draftFromIdentity(identity)
    expect(draft.android).toBe(`co.olt.app ${print}`)
    expect(sameIdentity(identityFromDraft(draft), identity)).toBe(true)
    expect(downloadCount(identity)).toBe(2)
  })

  it('requires a name and https download links', () => {
    const draft = {
      ...draftFromIdentity(identity),
      appName: ' ',
      macDownload: 'http://unduh.olt.test/OLT.dmg',
    }
    expect(identityProblems(draft)).toEqual({
      appName: { code: 'appNameInvalid' },
      macDownload: { code: 'httpsInvalid' },
    })
  })

  it('fills defaults for a partial status', () => {
    expect(normalizeIdentityStatus(null)).toMatchObject({
      app_scheme: '',
      identity: { app_name: 'OLT', android: [], macos_download_url: '' },
    })
  })
})
