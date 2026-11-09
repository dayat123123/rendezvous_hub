import type { AgentStatus } from '@/features/presence/types'

export const staffRoles = [
  'cs_agent',
  'cs_super_admin',
  'compliance',
  'community',
  'product',
  'cs_content',
] as const
export type StaffRole = (typeof staffRoles)[number]

export type StaffAccount = {
  id: string
  agent_code: string
  display_name: string
  email: string | null
  roles: string[]
  team: string | null
  max_active_tickets: number
  disabled_at: string | null
  status: AgentStatus
  active_tickets: number
  nasabah_permissions: string[]
  community_permissions: string[]
  created_at: string | null
}

export type AccountDraft = {
  email?: string
  display_name: string
  roles: string[]
  team: string
  max_active_tickets: number
  disabled: boolean
}

export type CreatedAccount = { agent: StaffAccount; temporary_password: string }

export type Choice = { code: string; name: string }

export type AdminOptions = { teams: Choice[]; skills: Choice[] }

export const topicIcons = [
  'account',
  'wallet',
  'receipt',
  'chart',
  'tools',
  'shield',
  'help',
  'document',
  'phone',
  'card',
  'chat',
  'star',
  'bell',
  'lock',
  'globe',
  'gift',
] as const
export type TopicIcon = (typeof topicIcons)[number]

export const topicStyles = ['normal', 'danger'] as const
export type TopicStyle = (typeof topicStyles)[number]

export const topicFlags = ['complaint', 'fraud'] as const

export type TopicConfig = {
  code: string
  name_id: string
  name_en: string
  skill: string
  default_priority: string
  help_url: string | null
  sort_order: number
  active: boolean
  description_id: string | null
  description_en: string | null
  icon: TopicIcon | null
  style: TopicStyle
  flags: string[]
}

export type TopicPicker = {
  title?: { id?: string; en?: string }
  hint?: { id?: string; en?: string }
}

export type TopicPickerDraft = { title_id: string; title_en: string; hint_id: string; hint_en: string }

export type QuickReplyConfig = {
  id: string | null
  shortcut: string
  title: string
  body: string
  language: 'id' | 'en'
  active: boolean
  updated_at?: string | null
}

export type SettingEntry = {
  key: string
  value: unknown
  description: string | null
  version: number
  updated_at: string | null
  updated_by: string | null
}

export type SavedSetting = Pick<SettingEntry, 'key' | 'value' | 'version' | 'updated_at'>

export const holidayKinds = ['national', 'collective_leave', 'exchange'] as const
export type HolidayKind = (typeof holidayKinds)[number]

export type Holiday = { day: string; name: string; kind: HolidayKind }

export const settingsGroups = {
  service: ['accounts', 'quickReplies', 'ticketLabels', 'hours', 'messages', 'assignment'],
  community: ['community'],
  integration: ['integration', 'appIntegration', 'apiKeys', 'push'],
  system: ['backup', 'alerts'],
} as const
export type SettingsGroup = keyof typeof settingsGroups
export type SettingsSection = (typeof settingsGroups)[SettingsGroup][number]

export const settingsGroupOrder: readonly SettingsGroup[] = ['service', 'community', 'integration', 'system']

export const settingsSections: readonly SettingsSection[] = settingsGroupOrder.flatMap(
  (group) => settingsGroups[group],
)

export type IntegrationStatus = {
  url: string
  client_id: string
  configured: boolean
  connected_at: string | null
  connected_by: string | null
  public_key: string
  key_configured: boolean
}

export type IntegrationResult =
  | 'ok'
  | 'refused'
  | 'ip_not_allowed'
  | 'disabled'
  | 'unexpected'
  | 'unreachable'
  | 'not_configured'
  | 'no_key'

export type IntegrationCheck = { result: IntegrationResult; status?: number; duration_ms: number }

export type IntegrationSave = { saved: boolean; check: IntegrationCheck; status: IntegrationStatus }

export const isStaffRole = (role: string): role is StaffRole =>
  (staffRoles as readonly string[]).includes(role)
