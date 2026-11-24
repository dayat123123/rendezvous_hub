import i18n from '@/i18n'
import { errorText } from '@/lib/error-text'
import { toApiError } from '@/lib/errors'

import type { ChangeDirection, RetentionChange, RetentionRule, RetentionRun } from './types'

type RuleShape = Pick<RetentionRule, 'unit' | 'allow_off' | 'min' | 'max' | 'value'>

export function keepScore(rule: Pick<RetentionRule, 'unit' | 'allow_off'>, value: number) {
  if (rule.unit === 'switch' || rule.unit === 'rows') return -value
  if (value === 0 && rule.allow_off) return Number.POSITIVE_INFINITY
  return value
}

export function changeDirection(
  rule: Pick<RetentionRule, 'unit' | 'allow_off'>,
  from: number,
  to: number,
): ChangeDirection {
  return keepScore(rule, to) < keepScore(rule, from) ? 'delete_sooner' : 'keep_longer'
}

export type ValueProblem = 'invalid' | 'range' | 'same'

export function valueProblem(draft: string, rule: RuleShape): ValueProblem | null {
  const text = draft.trim()
  if (!/^\d{1,9}$/.test(text)) return 'invalid'
  const value = Number(text)
  if (value === rule.value) return 'same'
  if (value === 0 && rule.allow_off) return null
  if (value < rule.min || value > rule.max) return 'range'
  return null
}

export function expiryInstant(day: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T23:59:59+07:00` : null
}

export function totalDeleted(run: Pick<RetentionRun, 'deleted'>) {
  return Object.values(run.deleted).reduce<number>((sum, count) => sum + (count ?? 0), 0)
}

const openStatuses: readonly string[] = ['pending', 'approved']

export function sortChanges(changes: RetentionChange[]) {
  return [...changes].sort((a, b) => {
    const open = Number(openStatuses.includes(b.status)) - Number(openStatuses.includes(a.status))
    return open !== 0 ? open : b.id - a.id
  })
}

export function countOpen(changes: RetentionChange[]) {
  return changes.filter((change) => openStatuses.includes(change.status)).length
}

export const retentionErrorCodes = [
  'retention_locked',
  'invalid_retention',
  'invalid_reason',
  'invalid_note',
  'retention_no_change',
  'retention_change_open',
  'retention_change_closed',
  'retention_change_expired',
  'retention_change_not_found',
  'retention_stale',
  'four_eyes_required',
  'retention_mfa_required',
  'retention_run_recent',
  'hold_target_not_found',
  'hold_exists',
  'hold_released',
  'invalid_expiry',
  'invalid_reference',
] as const
type RetentionErrorCode = (typeof retentionErrorCodes)[number]

const isRetentionCode = (code: string): code is RetentionErrorCode =>
  (retentionErrorCodes as readonly string[]).includes(code)

export function retentionErrorText(error: unknown) {
  const { code } = toApiError(error)
  return isRetentionCode(code) ? i18n.t(`retention.errors.${code}`) : errorText(error)
}
