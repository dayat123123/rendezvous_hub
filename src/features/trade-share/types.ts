export const tradePermissions = ['trade_share.review', 'trade_share.manage', 'trade_relay.operate'] as const
export type TradePermission = (typeof tradePermissions)[number]

export const tradeShareTabs = ['applications', 'traders', 'monitoring', 'lists', 'settings'] as const
export type TradeShareTab = (typeof tradeShareTabs)[number]

export const traderStatuses = [
  'pending',
  'active',
  'paused',
  'suspended',
  'rejected',
  'revoked',
  'withdrawn',
] as const
export type TraderStatus = (typeof traderStatuses)[number]

export const subscriptionStatuses = ['pending', 'active', 'declined', 'expired', 'ended'] as const
export type SubscriptionStatus = (typeof subscriptionStatuses)[number]

export const accountStates = ['active', 'unlinked', 'expired', 'shared_link', 'excluded'] as const
export type AccountState = (typeof accountStates)[number]

export const eligibilityCodes = [
  'feature_enabled',
  'pilot_invited',
  'regular_profile',
  'not_sanctioned',
  'account_age',
  'cooldown',
  'linked_account',
  'terms_available',
] as const
export type EligibilityCode = (typeof eligibilityCodes)[number]

export const flagKinds = ['review_threshold', 'subscriber_surge', 'quick_flip', 'shared_link'] as const
export type FlagKind = (typeof flagKinds)[number]

export const flagStatuses = ['open', 'reviewed'] as const
export type FlagStatus = (typeof flagStatuses)[number]

export const boards = ['RG', 'TN', 'NG', 'ADV'] as const
export type Board = (typeof boards)[number]

export const TRADE_PAGE_SIZE = 50
export const REASON_MIN = 3
export const REASON_MAX = 500
export const EXPORT_MAX_DAYS = 93

export type ProfileRef = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
  follower_count: number
  created_at: string | null
}

export type SubscriberCounts = { active: number; pending: number }

export type TradeSharer = {
  profile: ProfileRef
  status: TraderStatus
  pause_source: 'user' | 'system' | null
  show_price: boolean
  show_lot: boolean
  delay_minutes: number
  subscribe_mode: 'auto' | 'approval'
  applied_at: string
  proposed_by: string | null
  proposed_by_name?: string | null
  proposed_at: string | null
  decided_by: string | null
  decided_by_name?: string | null
  decided_at: string | null
  decision_reason: string | null
  suspended_until: string | null
  cooldown_until: string | null
  accounts: number
  warnings: number
  subscribers: SubscriberCounts
}

export type AccountReview = {
  cust_id: string
  state: AccountState
  current_state: AccountState
  excluded_reason: string | null
  other_profiles: number
}

export type EligibilityCheck = { code: string; ok: boolean }

export type Eligibility = {
  eligible: boolean
  checks: EligibilityCheck[]
  accounts: { cust_id: string; state: AccountState }[]
  cooldown_until: string | null
  terms_document: { id: string; version: number; title: string; effective_at: string } | null
}

export type TradeShareEvent = {
  id: number
  action: string
  actor_kind: 'user' | 'staff' | 'system'
  actor_id: string | null
  actor_name?: string | null
  from_status: string | null
  to_status: string | null
  reason: string | null
  details: Record<string, unknown>
  created_at: string
}

export type TradeSharerDetail = TradeSharer & {
  account_review: AccountReview[]
  eligibility: Eligibility
  sanctions: { active: boolean; last_365_days: number }
  events: TradeShareEvent[]
}

export type Subscriber = {
  subscriber: ProfileRef
  status: SubscriptionStatus
  muted: boolean
  requested_at: string
  decided_at: string | null
  expires_at: string | null
  ended_at: string | null
  end_reason: string | null
}

export type Decision = 'approve' | 'reject'

export type TraderAction = 'approve' | 'reject' | 'suspend' | 'reinstate' | 'revoke'

export type TradeFlag = {
  id: number
  profile: ProfileRef | null
  kind: string
  details: Record<string, unknown>
  created_at: string
  reviewed_by: string | null
  reviewed_by_name?: string | null
  reviewed_at: string | null
  note: string | null
}

export type HealthItem = {
  key: string
  severity: 'warning' | 'critical'
  title: string
  detail: string | null
}

export type TradeDashboard = {
  enabled: boolean
  pilot_only: boolean
  traders: Partial<Record<TraderStatus, number>>
  subscriptions: { active: number; pending: number; muted: number }
  activities_today: number
  activities_7d: number
  deliveries_today: { recipients: number; pushed: number; capped: number }
  pending_orders: number
  open_flags: number
  relay_today: Record<string, number>
  relay_health: HealthItem[]
  top_traders: { profile: ProfileRef | null; subscribers: number }[]
}

export type TradeExport = { filename: string; rows: number; csv: string }

export type ExcludedAccount = {
  cust_id: string
  reason: string
  created_by: string
  created_by_name?: string | null
  created_at: string
}

export type ExcludedStock = {
  stock: string
  reason: string
  until: string | null
  active: boolean
  created_by: string
  created_by_name?: string | null
  created_at: string
}

export type PilotInvite = {
  profile: ProfileRef | null
  created_by: string
  created_by_name?: string | null
  created_at: string
}

export type TradeSetting = {
  key: string
  value: unknown
  description: string | null
  version: number
  updated_at: string | null
  updated_by: string | null
}

export const tradeSettingNames = [
  'enabled',
  'pilot_only',
  'min_account_age_days',
  'reapply_cooldown_days',
  'min_delay_minutes',
  'max_delay_minutes',
  'force_hide_price',
  'force_hide_lot',
  'four_eyes',
  'max_subscriptions',
  'request_expiry_days',
  'review_subscriber_threshold',
  'lot_size',
  'boards',
  'eod_flush_time',
  'daily_push_cap',
  'retention_days',
  'fanout_batch',
] as const
export type TradeSettingName = (typeof tradeSettingNames)[number]

export type SettingUnit = 'days' | 'minutes' | 'count' | 'shares'

export type SettingKind =
  | { type: 'boolean' }
  | { type: 'integer'; min: number; max: number; unit: SettingUnit }
  | { type: 'time' }
  | { type: 'boards' }

export type ProfileMatch = {
  profile: ProfileRef
  trader_status: TraderStatus | null
  pilot_invited: boolean
  linked_accounts: number
}

export const PROFILE_QUERY_MIN = 2
export const PROFILE_QUERY_MAX = 60
