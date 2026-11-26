import { beforeAll, describe, expect, it } from 'vitest'

import { loadStrings } from '@/i18n'
import { ApiError } from '@/lib/errors'

import {
  balanceComparison,
  currencySymbol,
  entityFilter,
  finreportErrorText,
  hasActiveFiles,
  isWaitingRetry,
  objectPath,
  percentChange,
  periodParts,
  ratioKind,
  scaleMoney,
  sourceName,
  uploadProblem,
} from './logic'

beforeAll(async () => {
  await loadStrings('moderation')
})

describe('periodParts', () => {
  it('names quarters with roman numerals and takes the year from the period end', () => {
    expect(periodParts('Q1', '2026-03-31')).toEqual({ kind: 'quarter', quarter: 1, roman: 'I', year: '2026' })
    expect(periodParts('Q3', '2026-09-30')).toEqual({
      kind: 'quarter',
      quarter: 3,
      roman: 'III',
      year: '2026',
    })
    expect(periodParts('FY', '2025-12-31')).toEqual({ kind: 'annual', year: '2025' })
  })
})

describe('percentChange', () => {
  it('compares only against a positive base', () => {
    expect(percentChange(120, 100)).toBeCloseTo(0.2)
    expect(percentChange(80, 100)).toBeCloseTo(-0.2)
    expect(percentChange(-50, 100)).toBeCloseTo(-1.5)
    expect(percentChange(100, 0)).toBeNull()
    expect(percentChange(100, -40)).toBeNull()
    expect(percentChange(undefined, 100)).toBeNull()
    expect(percentChange(100, undefined)).toBeNull()
    expect(percentChange(null, 100)).toBeNull()
    expect(percentChange(Number.NaN, 100)).toBeNull()
  })
})

describe('scaleMoney', () => {
  it('uses trillion, billion and million for rupiah', () => {
    expect(scaleMoney(1.6e15, 'IDR')).toEqual({ amount: 1600, unit: 'trillion', decimals: 2 })
    expect(scaleMoney(-2.5e9, 'IDR')).toEqual({ amount: -2.5, unit: 'billion', decimals: 2 })
    expect(scaleMoney(7.25e6, 'IDR')).toEqual({ amount: 7.25, unit: 'million', decimals: 1 })
    expect(scaleMoney(900_000, 'IDR')).toEqual({ amount: 900_000, unit: null, decimals: 0 })
  })

  it('uses billion, million and thousand for other currencies', () => {
    expect(scaleMoney(3.2e9, 'USD')).toEqual({ amount: 3.2, unit: 'billion', decimals: 2 })
    expect(scaleMoney(4_500, 'USD')).toEqual({ amount: 4.5, unit: 'thousand', decimals: 1 })
    expect(scaleMoney(12, 'USD')).toEqual({ amount: 12, unit: null, decimals: 0 })
  })
})

describe('currencySymbol', () => {
  it('maps known currencies and leaves unknown ones without a symbol', () => {
    expect(currencySymbol('IDR')).toBe('Rp')
    expect(currencySymbol('USD')).toBe('US$')
    expect(currencySymbol('XXX')).toBe('')
    expect(currencySymbol('SGD')).toBe('SGD ')
  })
})

describe('ratioKind', () => {
  it('shows leverage and liquidity as multiples and the rest as percentages', () => {
    expect(ratioKind('der')).toBe('multiple')
    expect(ratioKind('current_ratio')).toBe('multiple')
    expect(ratioKind('roe')).toBe('percent')
    expect(ratioKind('ldr')).toBe('percent')
  })
})

describe('balanceComparison', () => {
  it('compares with the year-end balance when there is no year-ago report yet', () => {
    const balance = { key: 'loans', end: 120, year_ago: 100, year_end: 110 }
    expect(balanceComparison(balance, 'year_ago')).toBe(100)
    expect(balanceComparison(balance, 'year_end')).toBe(110)
    expect(balanceComparison({ key: 'loans', end: 120 }, 'year_ago')).toBeUndefined()
  })
})

describe('file helpers', () => {
  it('detects files that are still being worked on and files waiting for a retry', () => {
    expect(hasActiveFiles([{ status: 'done' }, { status: 'processing' }])).toBe(true)
    expect(hasActiveFiles([{ status: 'queued' }])).toBe(true)
    expect(hasActiveFiles([{ status: 'done' }, { status: 'rejected' }, { status: 'duplicate' }])).toBe(false)
    expect(isWaitingRetry({ status: 'queued', retry_at: '2026-11-26T03:00:00Z' })).toBe(true)
    expect(isWaitingRetry({ status: 'queued', retry_at: null })).toBe(false)
  })

  it('names the key for API files and the staff member for Hub uploads', () => {
    expect(
      sourceName({ source: 'api', key: { id: 'k', name: 'Sistem riset', prefix: 'Ab' }, uploaded_by: null }),
    ).toBe('Sistem riset')
    expect(sourceName({ source: 'hub', key: null, uploaded_by: { id: 'm', name: 'Maya' } })).toBe('Maya')
    expect(sourceName({ source: 'hub', key: null, uploaded_by: null })).toBeNull()
  })

  it('builds the storage path the upload policy expects', () => {
    expect(objectPath('11111111-1111-4111-8111-111111111111', '0b6c1a52-3f4e-4c1d-9a7e-2f1b3c4d5e6f')).toBe(
      'hub/11111111-1111-4111-8111-111111111111/0b6c1a52-3f4e-4c1d-9a7e-2f1b3c4d5e6f/report.zip',
    )
  })
})

describe('entityFilter', () => {
  it('normalizes stock codes and ignores partial input', () => {
    expect(entityFilter(' bbca ')).toBe('BBCA')
    expect(entityFilter('$tlkm')).toBe('TLKM')
    expect(entityFilter('B')).toBeNull()
    expect(entityFilter('BB-CA')).toBeNull()
    expect(entityFilter('')).toBeNull()
  })
})

describe('uploadProblem', () => {
  const max = 8 * 1024 * 1024
  it('accepts zip files up to the limit', () => {
    expect(uploadProblem({ name: 'instance.zip', size: 120_000 }, max)).toBeNull()
    expect(uploadProblem({ name: 'BBCA Q3.ZIP', size: max }, max)).toBeNull()
  })

  it('rejects other types, empty files, and files over the limit', () => {
    expect(uploadProblem({ name: 'instance.xbrl', size: 100 }, max)).toBe('type')
    expect(uploadProblem({ name: 'instance.zip', size: 0 }, max)).toBe('empty')
    expect(uploadProblem({ name: 'instance.zip', size: max + 1 }, max)).toBe('size')
  })
})

describe('finreportErrorText', () => {
  it('explains report errors and falls back to the shared messages', () => {
    expect(finreportErrorText(new ApiError('object_gone'))).toBe(
      'File aslinya sudah dihapus dari storage. Unggah ulang file tersebut.',
    )
    expect(finreportErrorText(new ApiError('community_forbidden'))).not.toBe('community_forbidden')
  })
})
