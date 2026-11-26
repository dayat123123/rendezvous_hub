import i18n from '@/i18n'
import { errorText } from '@/lib/error-text'
import { toApiError } from '@/lib/errors'

import type { BalanceBase, BalanceMetric, FileView, ReportPeriod } from './types'

export const ACTIVE_REFRESH_MS = 10_000
export const IDLE_REFRESH_MS = 60_000

export function objectPath(agentId: string, id: string) {
  return `hub/${agentId}/${id}/report.zip`
}

const romans = { Q1: 'I', Q2: 'II', Q3: 'III' } as const

export type PeriodParts =
  | { kind: 'quarter'; quarter: 1 | 2 | 3; roman: 'I' | 'II' | 'III'; year: string }
  | { kind: 'annual'; year: string }

export function periodParts(period: ReportPeriod, periodEnd: string): PeriodParts {
  const year = periodEnd.slice(0, 4)
  if (period === 'FY') return { kind: 'annual', year }
  return { kind: 'quarter', quarter: Number(period.slice(1)) as 1 | 2 | 3, roman: romans[period], year }
}

export function percentChange(current: number | null | undefined, base: number | null | undefined) {
  if (current === null || current === undefined || base === null || base === undefined) return null
  if (!Number.isFinite(current) || !Number.isFinite(base) || base <= 0) return null
  return (current - base) / base
}

export type MoneyUnit = 'trillion' | 'billion' | 'million' | 'thousand' | null

const idrUnits: [number, Exclude<MoneyUnit, null>, number][] = [
  [1e12, 'trillion', 2],
  [1e9, 'billion', 2],
  [1e6, 'million', 1],
]

const otherUnits: [number, Exclude<MoneyUnit, null>, number][] = [
  [1e9, 'billion', 2],
  [1e6, 'million', 2],
  [1e3, 'thousand', 1],
]

export function scaleMoney(value: number, currency: string) {
  const size = Math.abs(value)
  for (const [divisor, unit, decimals] of currency === 'IDR' ? idrUnits : otherUnits) {
    if (size >= divisor) return { amount: value / divisor, unit, decimals }
  }
  return { amount: value, unit: null as MoneyUnit, decimals: 0 }
}

export function currencySymbol(currency: string) {
  if (currency === 'IDR') return 'Rp'
  if (currency === 'USD') return 'US$'
  if (currency === 'XXX') return ''
  return `${currency} `
}

const multipleRatios: readonly string[] = ['der', 'current_ratio']

export const ratioKind = (key: string): 'multiple' | 'percent' =>
  multipleRatios.includes(key) ? 'multiple' : 'percent'

export const isPerShare = (key: string) => key === 'eps'

export function balanceComparison(balance: BalanceMetric, base: BalanceBase) {
  return base === 'year_end' ? balance.year_end : balance.year_ago
}

export const isActiveFile = (file: Pick<FileView, 'status'>) =>
  file.status === 'queued' || file.status === 'processing'

export const hasActiveFiles = (files: Pick<FileView, 'status'>[]) => files.some(isActiveFile)

export const isWaitingRetry = (file: Pick<FileView, 'status' | 'retry_at'>) =>
  file.status === 'queued' && file.retry_at !== null

export function sourceName(file: Pick<FileView, 'source' | 'key' | 'uploaded_by'>) {
  return file.source === 'api' ? (file.key?.name ?? null) : (file.uploaded_by?.name ?? null)
}

const entityPattern = /^[A-Z][A-Z0-9]{1,11}$/

export function entityFilter(text: string) {
  const code = text.trim().replace(/^\$/, '').toUpperCase()
  return entityPattern.test(code) ? code : null
}

export type UploadProblem = 'type' | 'size' | 'empty'

export function uploadProblem(file: Pick<File, 'name' | 'size'>, maxBytes: number): UploadProblem | null {
  if (!/\.zip$/i.test(file.name.trim())) return 'type'
  if (file.size <= 0) return 'empty'
  if (file.size > maxBytes) return 'size'
  return null
}

export const finreportErrorCodes = [
  'invalid_object',
  'object_not_found',
  'already_submitted',
  'file_not_found',
  'not_retryable',
  'object_gone',
  'report_not_found',
  'superseded',
  'post_exists',
  'official_inactive',
  'file_too_large',
  'upload_forbidden',
] as const
type FinreportErrorCode = (typeof finreportErrorCodes)[number]

const isFinreportCode = (code: string): code is FinreportErrorCode =>
  (finreportErrorCodes as readonly string[]).includes(code)

export function finreportErrorText(error: unknown) {
  const { code } = toApiError(error)
  return isFinreportCode(code) ? i18n.t(`moderation.finreport.errors.${code}`) : errorText(error)
}
