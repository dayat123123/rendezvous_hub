import { normalizeIdentity } from '@/features/app-identity/logic'

import type {
  ShareLinkStats,
  ShareLinksConfig,
  ShareLinksDraft,
  ShareLinksSettings,
  ShareLinksStatus,
  ShareStatsDay,
  ShareStatsPost,
  ShareStatsTotals,
} from './types'

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

const count = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0

export function normalizeStats(raw: Partial<ShareLinkStats> | null): ShareLinkStats {
  const t: Partial<ShareStatsTotals> = raw?.totals ?? {}
  return {
    days: raw?.days ?? 30,
    from: raw?.from ?? null,
    to: raw?.to ?? null,
    totals: {
      views: count(t.views),
      previews: count(t.previews),
      opens: count(t.opens),
      app_opens: count(t.app_opens),
      android: count(t.android),
      ios: count(t.ios),
      windows: count(t.windows),
      mac: count(t.mac),
      posts: count(t.posts),
    },
    daily: (raw?.daily ?? []).map((d: Partial<ShareStatsDay>) => ({
      day: d.day ?? '',
      views: count(d.views),
      opens: count(d.opens),
      app_opens: count(d.app_opens),
      downloads: count(d.downloads),
    })),
    top: (raw?.top ?? []).map((p: Partial<ShareStatsPost>) => ({
      code: p.code ?? null,
      post_id: p.post_id ?? '',
      author_username: p.author_username ?? '',
      author_name: p.author_name ?? p.author_username ?? '',
      body: p.body ?? '',
      available: p.available === true,
      views: count(p.views),
      previews: count(p.previews),
      opens: count(p.opens),
      app_opens: count(p.app_opens),
      downloads: count(p.downloads),
    })),
  }
}

export const downloadTotal = (t: ShareStatsTotals) => t.android + t.ios + t.windows + t.mac

export const hasStats = (stats: ShareLinkStats) =>
  stats.totals.views +
    stats.totals.previews +
    stats.totals.opens +
    stats.totals.app_opens +
    downloadTotal(stats.totals) >
  0
