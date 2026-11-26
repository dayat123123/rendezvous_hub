import type { AccountRef, CardDocument, CommunityPost, PostStatus, StaffRef } from '../types'

export const RESEARCH_BUCKET = 'financial-reports'
export const RESEARCH_MAX_BYTES = 8 * 1024 * 1024
export const RESEARCH_PAGE_SIZE = 50
export const RESEARCH_MAX_DOCUMENTS = 3
export const RESEARCH_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024

export const fileStatuses = ['queued', 'processing', 'done', 'duplicate', 'rejected'] as const
export type FileStatus = (typeof fileStatuses)[number]

export type ReportPeriod = 'Q1' | 'Q2' | 'Q3' | 'FY'
export type ReportAudit = 'audited' | 'unaudited' | 'unknown'
export type ReportTemplate = 'bank' | 'general' | 'basic'

export const warningCodes = [
  'restated',
  'revision',
  'template_basic',
  'missing_lines',
  'no_official_account',
  'post_rejected',
] as const
export type WarningCode = (typeof warningCodes)[number]

export const fileErrorCodes = [
  'not_zip',
  'zip_unsafe',
  'no_instance',
  'invalid_xbrl',
  'infected',
  'checksum_mismatch',
  'unknown_entity',
  'too_many_attempts',
  'object_missing',
  'invalid_report',
  'storage_unavailable',
  'scanner_unavailable',
  'store_unavailable',
] as const
export type FileErrorCode = (typeof fileErrorCodes)[number]

export const metricKeys = [
  'net_profit',
  'eps',
  'net_interest_income',
  'other_operating_income',
  'provision',
  'operating_expense',
  'profit_before_tax',
  'revenue',
  'gross_profit',
  'operating_cash_flow',
  'loans',
  'deposits',
  'casa',
  'loan_allowance',
  'assets',
  'liabilities',
  'equity_parent',
  'equity_total',
  'current_assets',
  'current_liabilities',
  'roe',
  'cost_to_income',
  'ldr',
  'casa_ratio',
  'loan_allowance_ratio',
  'cost_of_credit',
  'gross_margin',
  'net_margin',
  'der',
  'current_ratio',
] as const
export type MetricKey = (typeof metricKeys)[number]

export type PostRef = {
  id: string
  status: PostStatus
  post_id: string | null
  published_at: string | null
}

export const researchKinds = ['financial_report'] as const
export type ResearchKind = (typeof researchKinds)[number]

export type ReportRef = {
  id: string
  kind: string
  entity_code: string
  entity_name: string
  period: ReportPeriod
  period_start: string
  period_end: string
  audit: ReportAudit
  currency: string
  template: ReportTemplate
  superseded: boolean
  warnings: string[]
  post: PostRef | null
}

export type FileView = {
  id: string
  source: 'api' | 'hub'
  status: FileStatus
  sha256: string | null
  size_bytes: number | null
  key: { id: string; name: string; prefix: string } | null
  uploaded_by: StaffRef
  attempts: number
  retry_at: string | null
  error_code: string | null
  error_detail: string | null
  received_at: string
  finished_at: string | null
  retryable: boolean
  report: ReportRef | null
}

export const documentStatuses = ['queued', 'processing', 'ready', 'rejected'] as const
export type DocumentStatus = (typeof documentStatuses)[number]

export const documentErrorCodes = [
  'invalid_document',
  'active_content',
  'macro_not_allowed',
  'infected',
  'checksum_mismatch',
  'object_missing',
  'file_too_large',
  'too_many_attempts',
  'storage_unavailable',
  'scanner_unavailable',
  'store_unavailable',
] as const
export type DocumentErrorCode = (typeof documentErrorCodes)[number]

export type ResearchDocument = {
  id: string
  status: DocumentStatus
  source: 'api' | 'hub'
  name: string | null
  path: string
  mime: string
  size_bytes: number
  key: { id: string; name: string; prefix: string } | null
  uploaded_by: StaffRef
  error_code: string | null
  error_detail: string | null
  received_at: string
  finished_at: string | null
}

export type ResearchConfig = {
  official_account: AccountRef | null
  official_active: boolean
  auto_publish: boolean
  updated_by: StaffRef
  updated_at: string
  max_file_bytes: number
}

export type FilesPage = {
  items: FileView[]
  next_before: string | null
  config: ResearchConfig
  counts: Partial<Record<FileStatus, number>>
}

export type FilesFilter = { status: FileStatus | null; entity: string | null }

export type ReportWarning = {
  code: string
  lines?: string[]
  supersedes?: string
  received_at?: string
  reason?: string
}

export type FlowMetric = {
  key: string
  ytd?: number
  ytd_prior?: number
  quarter?: number
  quarter_prior?: number
  earlier_quarter_avg?: number
}

export type BalanceMetric = {
  key: string
  end?: number
  year_ago?: number
  year_end?: number
  previous?: number
}

export type RatioMetric = { key: string; value?: number; year_ago?: number; previous?: number }

export type BalanceBase = 'year_ago' | 'year_end'

export type ReportMetrics = {
  version: number
  template: ReportTemplate
  months: number
  quarter_months?: number
  earlier_quarters?: number
  balance_base: BalanceBase
  previous_report?: string
  prior_year_report?: string
  flows: FlowMetric[]
  balances: BalanceMetric[]
  ratios: RatioMetric[]
}

export type ReportDetail = Omit<ReportRef, 'warnings' | 'post'> & {
  sector: string | null
  subsector: string | null
  metrics: ReportMetrics
  document: CardDocument | Record<string, never>
  summary: string
  warnings: ReportWarning[]
  created_at: string
  superseded_at: string | null
  supersedes: ReportRef | null
  superseded_by: ReportRef | null
  post: CommunityPost | null
  can_create_post: boolean
  files: FileView[]
  documents: ResearchDocument[]
  history: ReportRef[]
}

export type UploadState = 'waiting' | 'uploading' | 'done' | 'failed'

export type UploadItem = {
  id: string
  name: string
  size: number
  state: UploadState
  error: string | null
  file: FileView | null
  documents: number
}
