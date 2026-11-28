import { normalizeIdentity } from '@/features/app-identity/logic'

import type { ShareLinksConfig, ShareLinksDraft, ShareLinksSettings, ShareLinksStatus } from './types'

export const exampleCode = 'Ab12Cd34Ef'

export const tidyBaseUrl = (value: string) => value.trim().replace(/\/+$/, '')

export const validBaseUrl = (value: string) =>
  value.length <= 200 && /^https?:\/\/[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?$/.test(value)

export type ShareProblem = { code: 'baseUrlRequired' | 'baseUrlInvalid' }

export function draftFromConfig(config: ShareLinksConfig): ShareLinksDraft {
  return { enabled: config.enabled, baseUrl: config.base_url, preview: config.preview }
}

export function draftProblems(draft: ShareLinksDraft): { baseUrl?: ShareProblem } {
  const base = tidyBaseUrl(draft.baseUrl)
  if (base === '' && draft.enabled) return { baseUrl: { code: 'baseUrlRequired' } }
  if (base !== '' && !validBaseUrl(base)) return { baseUrl: { code: 'baseUrlInvalid' } }
  return {}
}

export function settingsFromDraft(draft: ShareLinksDraft): ShareLinksSettings {
  return { enabled: draft.enabled, base_url: tidyBaseUrl(draft.baseUrl), preview: draft.preview }
}

export const sameSettings = (a: ShareLinksSettings, config: ShareLinksConfig) =>
  a.enabled === config.enabled && a.base_url === config.base_url && a.preview === config.preview

export function normalizeStatus(raw: Partial<ShareLinksStatus> | null): ShareLinksStatus {
  const c: Partial<ShareLinksConfig> = raw?.config ?? {}
  return {
    config: {
      ...normalizeIdentity(c),
      enabled: c.enabled === true,
      base_url: c.base_url ?? '',
      preview: c.preview !== false,
      app_scheme: c.app_scheme ?? '',
    },
    ready: raw?.ready === true,
    version: raw?.version ?? 0,
    updated_at: raw?.updated_at ?? null,
    updated_by: raw?.updated_by ?? null,
    codes: raw?.codes ?? 0,
    codes_7d: raw?.codes_7d ?? 0,
  }
}
