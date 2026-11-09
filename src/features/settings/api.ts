import { ApiError, fromFunctionError } from '@/lib/errors'
import { gatewayRequest } from '@/lib/gateway'
import { rpc, supabase } from '@/lib/supabase'
import type { Json } from '@/types/database'

import type {
  AccountDraft,
  AdminAttachmentPolicy,
  AdminOptions,
  AttachmentKindRule,
  AttachmentPolicyKind,
  CreatedAccount,
  Holiday,
  IntegrationCheck,
  IntegrationSave,
  IntegrationStatus,
  QuickReplyConfig,
  SavedSetting,
  SettingEntry,
  StaffAccount,
  TopicConfig,
  TopicExtras,
  TopicPicker,
  TopicPickerDraft,
} from './types'

async function invoke<T>(path: string, method: 'POST' | 'PATCH', body: Record<string, unknown>): Promise<T> {
  const result = await supabase().functions.invoke<T>(path, { method, body })
  if (result.error !== null) throw await fromFunctionError(result.error)
  if (result.data === null) throw new ApiError('unavailable')
  return result.data
}

function account(raw: StaffAccount): StaffAccount {
  return {
    ...raw,
    roles: raw.roles ?? [],
    status: raw.status ?? 'offline',
    nasabah_permissions: raw.nasabah_permissions ?? [],
    community_permissions: raw.community_permissions ?? [],
  }
}

export const settingsApi = {
  accounts: async () => (await rpc<StaffAccount[]>('admin_agents')).map(account),
  options: async (): Promise<AdminOptions> => {
    const raw = await rpc<Partial<AdminOptions>>('admin_options')
    return { teams: raw.teams ?? [], skills: raw.skills ?? [] }
  },
  createAccount: async (draft: AccountDraft) => {
    const created = await invoke<CreatedAccount>('cs-admin/agents', 'POST', draft)
    return { ...created, agent: account(created.agent) }
  },
  updateAccount: async (id: string, draft: AccountDraft) => {
    const body: Record<string, unknown> = { ...draft }
    delete body.email
    const updated = await invoke<{ agent: StaffAccount }>(`cs-admin/agents/${id}`, 'PATCH', body)
    return account(updated.agent)
  },
  setNasabahPermissions: async (id: string, permissions: string[]) =>
    account(
      await rpc<StaffAccount>('admin_set_nasabah_permissions', {
        p_agent_id: id,
        p_permissions: permissions,
      }),
    ),
  setCommunityPermissions: async (id: string, permissions: string[]) =>
    account(
      await rpc<StaffAccount>('admin_set_community_permissions', {
        p_agent_id: id,
        p_permissions: permissions,
      }),
    ),
  resetPassword: async (id: string) => {
    const reset = await invoke<CreatedAccount>(`cs-admin/agents/${id}/reset-password`, 'POST', {})
    return { ...reset, agent: account(reset.agent) }
  },
  topics: () => rpc<TopicConfig[]>('admin_topics'),
  saveTopic: (topic: TopicConfig) =>
    rpc<TopicConfig[]>('admin_save_topic', {
      p_code: topic.code,
      p_name_id: topic.name_id,
      p_name_en: topic.name_en,
      p_skill: topic.skill,
      p_default_priority: topic.default_priority,
      p_help_url: topic.help_url,
      p_sort_order: topic.sort_order,
      p_active: topic.active,
      p_description_id: topic.description_id,
      p_description_en: topic.description_en,
      p_icon: topic.icon,
      p_style: topic.style,
      p_flags: topic.flags,
    }),
  saveTopicExtras: (code: string, extras: TopicExtras) =>
    rpc<TopicConfig>('admin_set_topic_extras', {
      p_code: code,
      p_intake: extras.intake as unknown as Json,
      p_customer_replies: extras.customer_replies as unknown as Json,
      p_sop: extras.sop,
    }),
  reorderTopics: (codes: string[]) => rpc<TopicConfig[]>('admin_reorder_topics', { p_codes: codes }),
  topicPicker: () => rpc<TopicPicker>('admin_topic_picker'),
  saveTopicPicker: (draft: TopicPickerDraft) =>
    rpc<TopicPicker>('admin_set_topic_picker', {
      p_title_id: draft.title_id,
      p_title_en: draft.title_en,
      p_hint_id: draft.hint_id,
      p_hint_en: draft.hint_en,
    }),
  quickReplies: () => rpc<QuickReplyConfig[]>('admin_quick_replies'),
  saveQuickReply: (reply: QuickReplyConfig) =>
    rpc<QuickReplyConfig[]>('admin_save_quick_reply', {
      p_id: reply.id,
      p_shortcut: reply.shortcut,
      p_title: reply.title,
      p_body: reply.body,
      p_language: reply.language,
      p_active: reply.active,
    }),
  settings: () => rpc<SettingEntry[]>('admin_settings'),
  setSetting: (key: string, value: Json) =>
    rpc<SavedSetting>('admin_set_setting', { p_key: key, p_value: value }),
  attachmentPolicy: () => rpc<AdminAttachmentPolicy>('admin_attachment_policy'),
  saveAttachmentPolicy: (policy: Record<AttachmentPolicyKind, AttachmentKindRule>) =>
    rpc<AdminAttachmentPolicy>('admin_set_attachment_policy', { p_policy: policy as unknown as Json }),
  holidays: (year: number) => rpc<Holiday[]>('admin_holidays', { p_year: year }),
  saveHoliday: (holiday: Holiday) =>
    rpc<Holiday[]>('admin_save_holiday', { p_day: holiday.day, p_name: holiday.name, p_kind: holiday.kind }),
  deleteHoliday: (day: string) => rpc<Holiday[]>('admin_delete_holiday', { p_day: day }),
  integration: () => gatewayRequest<IntegrationStatus>('GET', '/integration'),
  testIntegration: (url: string, clientId: string) =>
    gatewayRequest<IntegrationCheck>('POST', '/integration/test', {}, { url, client_id: clientId }),
  saveIntegration: (url: string, clientId: string) =>
    gatewayRequest<IntegrationSave>('PUT', '/integration', {}, { url, client_id: clientId }),
  clearIntegration: () => gatewayRequest<IntegrationStatus>('DELETE', '/integration'),
}
