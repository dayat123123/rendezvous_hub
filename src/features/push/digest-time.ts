import { findSetting } from '@/features/settings/hooks'
import type { SettingEntry } from '@/features/settings/types'

export const DIGEST_TIME_KEY = 'notifications.watchlist_digest_time'
const DEFAULT_TIME = '17:05'
const timePattern = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

export const validDigestTime = (value: string) => timePattern.test(value)

export function digestTimeSetting(items: SettingEntry[]) {
  const value = findSetting(items, DIGEST_TIME_KEY)?.value
  return typeof value === 'string' && validDigestTime(value) ? value : DEFAULT_TIME
}
