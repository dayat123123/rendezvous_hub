import { useTranslation } from 'react-i18next'

import { format, formatNumber } from '@/lib/time'

import type { RetentionKey, RetentionRule } from '../types'

export type NameKey =
  | 'purge_enabled'
  | 'max_rows_per_run'
  | 'posts_years'
  | 'comments_years'
  | 'direct_chat_years'
  | 'stock_chat_years'
  | 'chat_years'
  | 'archive_days'
  | 'evidence_days'
  | 'deleted_messages_days'
  | 'notifications_days'
  | 'audit_log_days'
  | 'access_log_days'
  | 'rate_limit_events_days'
  | 'cs_audit_days'
  | 'notification_events_days'
  | 'moderation_events_days'
  | 'cron_history_days'

export const nameKey = (key: RetentionKey) => key.replace('retention.', '') as NameKey

export const stamp = (value: string) => `${format(value, 'd MMM yyyy, HH.mm')} WIB`

export const day = (value: string) => format(value, 'd MMM yyyy')

export function useRetentionText() {
  const { t } = useTranslation()
  const name = (key: RetentionKey) => t(`retention.names.${nameKey(key)}`)
  const value = (rule: Pick<RetentionRule, 'unit' | 'allow_off'>, amount: number) => {
    if (rule.unit === 'switch') return amount === 1 ? t('retention.values.on') : t('retention.values.off')
    if (amount === 0 && rule.allow_off) return t('retention.values.never')
    return t(`retention.values.${rule.unit}`, { value: formatNumber(amount) })
  }
  const range = (rule: Pick<RetentionRule, 'min' | 'max' | 'allow_off'>) =>
    t(rule.allow_off ? 'retention.rangeOff' : 'retention.range', {
      min: formatNumber(rule.min),
      max: formatNumber(rule.max),
    })
  return { t, name, value, range }
}
