import { wibInputToIso } from '@/features/legal/logic'
import { jakartaDay } from '@/lib/time'
import { lengthValid } from '@/lib/utils'
import type { Json } from '@/types/database'

import {
  boards,
  EXPORT_MAX_DAYS,
  PROFILE_QUERY_MAX,
  PROFILE_QUERY_MIN,
  REASON_MAX,
  REASON_MIN,
  tradeSettingNames,
  tradeShareTabs,
  type AccountReview,
  type Board,
  type SettingKind,
  type TradeSettingName,
  type TradeShareTab,
  type TradeSharer,
  type TraderAction,
} from './types'

export const KILL_SWITCH_KEY = 'trade_share.enabled'

const settingKinds: Record<TradeSettingName, SettingKind> = {
  enabled: { type: 'boolean' },
  pilot_only: { type: 'boolean' },
  force_hide_price: { type: 'boolean' },
  force_hide_lot: { type: 'boolean' },
  four_eyes: { type: 'boolean' },
  min_account_age_days: { type: 'integer', min: 0, max: 3650, unit: 'days' },
  reapply_cooldown_days: { type: 'integer', min: 0, max: 3650, unit: 'days' },
  min_delay_minutes: { type: 'integer', min: 1, max: 1440, unit: 'minutes' },
  max_delay_minutes: { type: 'integer', min: 1, max: 1440, unit: 'minutes' },
  max_subscriptions: { type: 'integer', min: 1, max: 500, unit: 'count' },
  request_expiry_days: { type: 'integer', min: 1, max: 90, unit: 'days' },
  review_subscriber_threshold: { type: 'integer', min: 1, max: 10_000_000, unit: 'count' },
  lot_size: { type: 'integer', min: 1, max: 100_000, unit: 'shares' },
  daily_push_cap: { type: 'integer', min: 0, max: 1000, unit: 'count' },
  retention_days: { type: 'integer', min: 1, max: 400, unit: 'days' },
  fanout_batch: { type: 'integer', min: 100, max: 20_000, unit: 'count' },
  eod_flush_time: { type: 'time' },
  boards: { type: 'boards' },
}

export function settingName(key: string): TradeSettingName | null {
  const name = key.replace(/^trade_share\./, '')
  return key.startsWith('trade_share.') && (tradeSettingNames as readonly string[]).includes(name)
    ? (name as TradeSettingName)
    : null
}

export function settingKind(key: string): SettingKind | null {
  const name = settingName(key)
  return name ? settingKinds[name] : null
}

export type SettingProblem = 'integer' | 'range' | 'time' | 'boards' | 'unknown'

export type SettingDraft = string | boolean | Board[]

export function settingDraft(kind: SettingKind, value: unknown): SettingDraft {
  switch (kind.type) {
    case 'boolean':
      return value === true
    case 'integer':
      return typeof value === 'number' ? String(value) : ''
    case 'time':
      return typeof value === 'string' ? value : ''
    case 'boards':
      return Array.isArray(value) ? boards.filter((board) => value.includes(board)) : []
  }
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

export function parseSetting(
  kind: SettingKind,
  draft: SettingDraft,
): { value: Json; problem: null } | { value: null; problem: SettingProblem } {
  switch (kind.type) {
    case 'boolean':
      return typeof draft === 'boolean'
        ? { value: draft, problem: null }
        : { value: null, problem: 'unknown' }
    case 'integer': {
      const text = typeof draft === 'string' ? draft.trim() : ''
      if (!/^\d{1,9}$/.test(text)) return { value: null, problem: 'integer' }
      const number = Number(text)
      if (number < kind.min || number > kind.max) return { value: null, problem: 'range' }
      return { value: number, problem: null }
    }
    case 'time': {
      const text = typeof draft === 'string' ? draft.trim() : ''
      return timePattern.test(text) ? { value: text, problem: null } : { value: null, problem: 'time' }
    }
    case 'boards': {
      const list = Array.isArray(draft) ? boards.filter((board) => draft.includes(board)) : []
      return list.length > 0 ? { value: list, problem: null } : { value: null, problem: 'boards' }
    }
  }
}

export function sameSettingValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function reasonValid(reason: string) {
  return lengthValid(reason, REASON_MIN, REASON_MAX)
}

export type TraderPermissions = { review: boolean }

export type ApprovalStep = 'first' | 'second' | 'own_proposal'

export function approvalStep(sharer: Pick<TradeSharer, 'proposed_by'>, me: string): ApprovalStep {
  if (!sharer.proposed_by) return 'first'
  return sharer.proposed_by === me ? 'own_proposal' : 'second'
}

export function traderActions(
  sharer: Pick<TradeSharer, 'status' | 'proposed_by'>,
  permissions: TraderPermissions,
  me: string,
): TraderAction[] {
  if (!permissions.review) return []
  switch (sharer.status) {
    case 'pending':
      return approvalStep(sharer, me) === 'own_proposal'
        ? ['reject', 'revoke']
        : ['approve', 'reject', 'revoke']
    case 'active':
    case 'paused':
      return ['suspend', 'revoke']
    case 'suspended':
      return ['reinstate', 'revoke']
    default:
      return []
  }
}

export type DecisionOutcome = 'approved' | 'proposed' | 'rejected'

export function decisionOutcome(result: Pick<TradeSharer, 'status' | 'proposed_by'>): DecisionOutcome {
  if (result.status === 'pending') return 'proposed'
  return result.status === 'rejected' ? 'rejected' : 'approved'
}

export type AccountWarning = 'shared_link' | 'excluded' | 'unlinked' | 'expired' | 'other_profiles'

export function accountWarnings(review: AccountReview): AccountWarning[] {
  const warnings = new Set<AccountWarning>()
  for (const state of [review.state, review.current_state]) {
    if (state !== 'active') warnings.add(state)
  }
  if (review.other_profiles > 0) warnings.add('other_profiles')
  return [...warnings]
}

export function accountAgeDays(createdAt: string | null, now: Date = new Date()) {
  if (!createdAt) return null
  const time = Date.parse(createdAt)
  if (Number.isNaN(time)) return null
  return Math.max(0, Math.floor((now.getTime() - time) / 86_400_000))
}

export type RangeProblem = 'missing' | 'order' | 'too_long'

export function exportRangeProblem(from: string, to: string): RangeProblem | null {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (!from || !to || Number.isNaN(start) || Number.isNaN(end)) return 'missing'
  if (end < start) return 'order'
  return (end - start) / 86_400_000 > EXPORT_MAX_DAYS - 1 ? 'too_long' : null
}

export function parseUntil(value: string, now: Date = new Date()): { iso: string | null; invalid: boolean } {
  if (!value.trim()) return { iso: null, invalid: false }
  const iso = wibInputToIso(value)
  return iso && Date.parse(iso) > now.getTime() ? { iso, invalid: false } : { iso: null, invalid: true }
}

export const csvFileContent = (csv: string) => String.fromCharCode(0xfeff) + csv

export function safeFileName(name: string, fallback: string) {
  const clean = name.replace(/[^A-Za-z0-9._-]/g, '')
  return clean.length > 0 && clean.length <= 120 ? clean : fallback
}

const custPattern = /^[A-Z0-9._-]{1,32}$/
const stockPattern = /^[A-Z0-9-]{1,12}$/

export const normalizeCustId = (value: string) => value.trim().toUpperCase()
export const custIdValid = (value: string) => custPattern.test(normalizeCustId(value))
export const normalizeStock = (value: string) => value.trim().replace(/^\$/, '').toUpperCase()
export const stockValid = (value: string) => stockPattern.test(normalizeStock(value))

export function nextBefore<T>(page: T[], size: number, stampOf: (item: T) => string) {
  const last = page.at(-1)
  return page.length >= size && last ? stampOf(last) : undefined
}

export function profileLabel(profile: { username: string | null; display_name: string | null } | null) {
  if (!profile) return '–'
  return profile.display_name || (profile.username ? `@${profile.username}` : '–')
}

export const profileQuery = (value: string) => value.trim().replace(/^@+/, '')

export function profileQueryValid(text: string) {
  return text.length >= PROFILE_QUERY_MIN && text.length <= PROFILE_QUERY_MAX
}

export type StaffRef = { id: string | null | undefined; name: string | null | undefined }

export function staffName(ref: StaffRef, me: string, labels: { you: string; staff: string }) {
  if (ref.id && ref.id === me) return labels.you
  return ref.name?.trim() || labels.staff
}

export function tradeShareTab(value: unknown): TradeShareTab {
  return tradeShareTabs.find((tab) => tab === value) ?? 'applications'
}

export function defaultExportRange(now: Date = new Date()) {
  const to = jakartaDay(now)
  const from = jakartaDay(new Date(now.getTime() - 6 * 86_400_000))
  return { from, to }
}
