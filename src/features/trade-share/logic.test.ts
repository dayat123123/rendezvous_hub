import { describe, expect, it } from 'vitest'

import {
  accountAgeDays,
  accountWarnings,
  approvalStep,
  csvFileContent,
  custIdValid,
  decisionOutcome,
  defaultExportRange,
  exportRangeProblem,
  nextBefore,
  normalizeCustId,
  normalizeStock,
  parseSetting,
  parseUntil,
  profileLabel,
  profileQuery,
  profileQueryValid,
  reasonValid,
  safeFileName,
  sameSettingValue,
  settingDraft,
  settingKind,
  settingName,
  staffName,
  stockValid,
  traderActions,
  tradeShareTab,
} from './logic'
import type { SettingKind } from './types'

const me = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'

describe('settings', () => {
  it('knows every trade_share setting and its editor', () => {
    expect(settingKind('trade_share.enabled')).toEqual({ type: 'boolean' })
    expect(settingKind('trade_share.eod_flush_time')).toEqual({ type: 'time' })
    expect(settingKind('trade_share.boards')).toEqual({ type: 'boards' })
    expect(settingKind('trade_share.daily_push_cap')).toEqual({
      type: 'integer',
      min: 0,
      max: 1000,
      unit: 'count',
    })
    expect(settingKind('trade_share.unknown')).toBeNull()
    expect(settingKind('trade_notify.enabled')).toBeNull()
    expect(settingName('trade_share.min_delay_minutes')).toBe('min_delay_minutes')
    expect(settingName('other.min_delay_minutes')).toBeNull()
  })

  it('parses integers within the server bounds', () => {
    const kind: SettingKind = { type: 'integer', min: 1, max: 1440, unit: 'minutes' }
    expect(parseSetting(kind, ' 30 ')).toEqual({ value: 30, problem: null })
    expect(parseSetting(kind, '0')).toEqual({ value: null, problem: 'range' })
    expect(parseSetting(kind, '1441')).toEqual({ value: null, problem: 'range' })
    expect(parseSetting(kind, '1.5')).toEqual({ value: null, problem: 'integer' })
    expect(parseSetting(kind, '')).toEqual({ value: null, problem: 'integer' })
  })

  it('parses HH:MM times and non-empty board lists in a stable order', () => {
    expect(parseSetting({ type: 'time' }, '16:30')).toEqual({ value: '16:30', problem: null })
    expect(parseSetting({ type: 'time' }, '24:00')).toEqual({ value: null, problem: 'time' })
    expect(parseSetting({ type: 'time' }, '9:30')).toEqual({ value: null, problem: 'time' })
    expect(parseSetting({ type: 'boards' }, ['NG', 'RG'])).toEqual({ value: ['RG', 'NG'], problem: null })
    expect(parseSetting({ type: 'boards' }, [])).toEqual({ value: null, problem: 'boards' })
    expect(parseSetting({ type: 'boolean' }, false)).toEqual({ value: false, problem: null })
  })

  it('turns stored values into editor drafts and compares them', () => {
    expect(settingDraft({ type: 'integer', min: 0, max: 10, unit: 'days' }, 7)).toBe('7')
    expect(settingDraft({ type: 'boards' }, ['TN', 'RG', 'XX'])).toEqual(['RG', 'TN'])
    expect(settingDraft({ type: 'boolean' }, 'true')).toBe(false)
    expect(settingDraft({ type: 'time' }, '16:30')).toBe('16:30')
    expect(sameSettingValue(['RG'], ['RG'])).toBe(true)
    expect(sameSettingValue(15, 30)).toBe(false)
  })

  it('requires reasons of 3 to 500 characters', () => {
    expect(reasonValid('ok')).toBe(false)
    expect(reasonValid('  oke  ')).toBe(true)
    expect(reasonValid('x'.repeat(501))).toBe(false)
  })
})

describe('trader decisions', () => {
  it('tells first, second, and own four-eyes approvals apart', () => {
    expect(approvalStep({ proposed_by: null }, me)).toBe('first')
    expect(approvalStep({ proposed_by: other }, me)).toBe('second')
    expect(approvalStep({ proposed_by: me }, me)).toBe('own_proposal')
  })

  it('offers actions by status and only to reviewers', () => {
    const review = { review: true }
    expect(traderActions({ status: 'pending', proposed_by: null }, review, me)).toEqual([
      'approve',
      'reject',
      'revoke',
    ])
    expect(traderActions({ status: 'pending', proposed_by: me }, review, me)).toEqual(['reject', 'revoke'])
    expect(traderActions({ status: 'active', proposed_by: null }, review, me)).toEqual(['suspend', 'revoke'])
    expect(traderActions({ status: 'paused', proposed_by: null }, review, me)).toEqual(['suspend', 'revoke'])
    expect(traderActions({ status: 'suspended', proposed_by: null }, review, me)).toEqual([
      'reinstate',
      'revoke',
    ])
    expect(traderActions({ status: 'revoked', proposed_by: null }, review, me)).toEqual([])
    expect(traderActions({ status: 'pending', proposed_by: null }, { review: false }, me)).toEqual([])
  })

  it('reads a still-pending approval result as a four-eyes proposal', () => {
    expect(decisionOutcome({ status: 'pending', proposed_by: me })).toBe('proposed')
    expect(decisionOutcome({ status: 'active', proposed_by: other })).toBe('approved')
    expect(decisionOutcome({ status: 'rejected', proposed_by: null })).toBe('rejected')
  })

  it('collects account warnings from the stored and current state', () => {
    expect(
      accountWarnings({
        cust_id: 'A1',
        state: 'active',
        current_state: 'active',
        excluded_reason: null,
        other_profiles: 0,
      }),
    ).toEqual([])
    expect(
      accountWarnings({
        cust_id: 'A1',
        state: 'active',
        current_state: 'shared_link',
        excluded_reason: null,
        other_profiles: 2,
      }),
    ).toEqual(['shared_link', 'other_profiles'])
    expect(
      accountWarnings({
        cust_id: 'A1',
        state: 'excluded',
        current_state: 'excluded',
        excluded_reason: 'Karyawan',
        other_profiles: 0,
      }),
    ).toEqual(['excluded'])
  })

  it('computes the account age in whole days', () => {
    const now = new Date('2026-11-15T00:00:00.000Z')
    expect(accountAgeDays('2026-10-15T12:00:00.000Z', now)).toBe(30)
    expect(accountAgeDays(null, now)).toBeNull()
    expect(accountAgeDays('nope', now)).toBeNull()
  })
})

describe('inputs', () => {
  it('normalizes and validates account numbers and stock codes', () => {
    expect(normalizeCustId(' ab-12 ')).toBe('AB-12')
    expect(custIdValid('ab.12_x')).toBe(true)
    expect(custIdValid('ab 12')).toBe(false)
    expect(normalizeStock(' $bbca ')).toBe('BBCA')
    expect(stockValid('$bbca')).toBe(true)
    expect(stockValid('BB CA')).toBe(false)
  })

  it('accepts suspension or exclusion end times only in the future', () => {
    const now = new Date('2026-11-15T03:00:00.000Z')
    expect(parseUntil('', now)).toEqual({ iso: null, invalid: false })
    expect(parseUntil('2026-11-16T09:00', now)).toEqual({ iso: '2026-11-16T02:00:00.000Z', invalid: false })
    expect(parseUntil('2026-11-15T09:00', now)).toEqual({ iso: null, invalid: true })
    expect(parseUntil('besok', now)).toEqual({ iso: null, invalid: true })
  })

  it('limits the export to 93 days and defaults to the last 7 Jakarta days', () => {
    expect(exportRangeProblem('2026-11-01', '2026-11-15')).toBeNull()
    expect(exportRangeProblem('2026-11-15', '2026-11-01')).toBe('order')
    expect(exportRangeProblem('', '2026-11-01')).toBe('missing')
    expect(exportRangeProblem('2026-08-01', '2026-11-02')).toBe('too_long')
    expect(exportRangeProblem('2026-08-02', '2026-11-02')).toBeNull()
    expect(defaultExportRange(new Date('2026-11-14T18:00:00.000Z'))).toEqual({
      from: '2026-11-09',
      to: '2026-11-15',
    })
  })

  it('keeps server file names safe and adds a byte order mark for Excel', () => {
    expect(safeFileName('berbagi-trade-2026-11-01-2026-11-15.csv', 'x.csv')).toBe(
      'berbagi-trade-2026-11-01-2026-11-15.csv',
    )
    expect(safeFileName('../../etc', 'x.csv')).toBe('....etc')
    expect(safeFileName('', 'x.csv')).toBe('x.csv')
    expect(csvFileContent('a,b').charCodeAt(0)).toBe(0xfeff)
  })
})

describe('navigation helpers', () => {
  it('pages with the timestamp of the last row only when the page is full', () => {
    const rows = [{ at: 'a' }, { at: 'b' }]
    expect(nextBefore(rows, 2, (row) => row.at)).toBe('b')
    expect(nextBefore(rows, 3, (row) => row.at)).toBeUndefined()
  })

  it('falls back to the applications tab and labels profiles', () => {
    expect(tradeShareTab('settings')).toBe('settings')
    expect(tradeShareTab('nope')).toBe('applications')
    expect(profileLabel({ username: 'budi', display_name: null })).toBe('@budi')
    expect(profileLabel({ username: 'budi', display_name: 'Budi' })).toBe('Budi')
    expect(profileLabel(null)).toBe('–')
  })

  it('sends profile searches of 2 to 60 characters without a leading @', () => {
    expect(profileQuery('  @@hida ')).toBe('hida')
    expect(profileQueryValid(profileQuery('@h'))).toBe(false)
    expect(profileQueryValid('hi')).toBe(true)
    expect(profileQueryValid('x'.repeat(61))).toBe(false)
  })

  it('names staff, saying "you" for the current agent and falling back when the name is missing', () => {
    const labels = { you: 'Anda', staff: 'Staf' }
    expect(staffName({ id: me, name: 'Kirana' }, me, labels)).toBe('Anda')
    expect(staffName({ id: other, name: 'Dewi' }, me, labels)).toBe('Dewi')
    expect(staffName({ id: other, name: null }, me, labels)).toBe('Staf')
    expect(staffName({ id: null, name: undefined }, me, labels)).toBe('Staf')
  })
})
