export const retentionCategories = ['guard', 'content', 'chat', 'archive', 'log'] as const
export type RetentionCategory = (typeof retentionCategories)[number]

export type RetentionUnit = 'switch' | 'rows' | 'years' | 'days'

export const retentionKeys = [
  'retention.purge_enabled',
  'retention.max_rows_per_run',
  'retention.posts_years',
  'retention.comments_years',
  'retention.direct_chat_years',
  'retention.stock_chat_years',
  'retention.chat_years',
  'retention.archive_days',
  'retention.evidence_days',
  'retention.deleted_messages_days',
  'retention.notifications_days',
  'retention.audit_log_days',
  'retention.access_log_days',
  'retention.rate_limit_events_days',
] as const
export type RetentionKey = (typeof retentionKeys)[number]

export type StaffRef = { id: string; name: string | null } | null

export const changeStatuses = [
  'pending',
  'approved',
  'applied',
  'rejected',
  'withdrawn',
  'expired',
  'superseded',
] as const
export type ChangeStatus = (typeof changeStatuses)[number]

export type ChangeDirection = 'keep_longer' | 'delete_sooner'

export type RetentionChange = {
  id: number
  key: RetentionKey
  old_value: number
  new_value: number
  direction: ChangeDirection
  reason: string
  status: ChangeStatus
  requested_by: StaffRef
  requested_at: string
  decided_by: StaffRef
  decided_at: string | null
  decision_note: string | null
  effective_at: string | null
  applied_at: string | null
  cancelled_by: StaffRef
  cancelled_at: string | null
  cancel_note: string | null
  expires_at: string | null
  mine: boolean
  can_decide: boolean
  can_cancel: boolean
}

export type RetentionRule = {
  key: RetentionKey
  unit: RetentionUnit
  category: RetentionCategory
  value: number
  default: number
  min: number
  max: number
  allow_off: boolean
  pending: RetentionChange | null
}

export const holdTargets = ['user', 'room', 'post', 'comment', 'message'] as const
export type HoldTarget = (typeof holdTargets)[number]

export type RetentionHold = {
  id: string
  target_type: HoldTarget
  target_id: string
  target_label: string | null
  reason: string
  reference: string | null
  created_by: StaffRef
  created_at: string
  expires_at: string | null
  released_by: StaffRef
  released_at: string | null
  release_note: string | null
  active: boolean
  can_release: boolean
}

export const purgeCategories = ['posts', 'comments', 'direct_chat', 'stock_chat', 'support_chat'] as const
export type PurgeCategory = (typeof purgeCategories)[number]

export type RetentionRun = {
  id: number
  source: 'cron' | 'manual'
  actor: StaffRef
  started_at: string
  finished_at: string
  enabled: boolean
  deleted: Partial<Record<PurgeCategory, number>>
  capped: PurgeCategory[]
  files_queued: number
  applied: number
  errors: Partial<Record<PurgeCategory, string>>
}

export type RetentionOverview = {
  enabled: boolean
  schedule: { cron: string; time_wib: string }
  delay_days: number
  request_days: number
  can_run: boolean
  rules: RetentionRule[]
  changes: RetentionChange[]
  holds: RetentionHold[]
  runs: RetentionRun[]
}

export type PreviewCategory = { years: number; before: string | null; count: number | null; more: boolean }

export type RetentionPreview = {
  enabled: boolean
  limit: number
  categories: Record<PurgeCategory, PreviewCategory>
  computed_at: string
}

export type RunResult = {
  run_id?: number
  enabled?: boolean
  deleted?: Partial<Record<PurgeCategory, number>>
  capped?: PurgeCategory[]
  files_queued?: number
  applied?: number
  errors?: Partial<Record<PurgeCategory, string>>
  skipped?: string
}

export type HoldInput = {
  targetType: HoldTarget
  target: string
  reason: string
  reference: string
  expiresOn: string
}

export const retentionTabs = ['rules', 'changes', 'holds', 'runs'] as const
export type RetentionTab = (typeof retentionTabs)[number]
