import type { AppIdentity } from '@/features/app-identity/types'

export type ShareLinksConfig = AppIdentity & {
  enabled: boolean
  base_url: string
  preview: boolean
  app_scheme: string
}

export type ShareLinksStatus = {
  config: ShareLinksConfig
  ready: boolean
  version: number
  updated_at: string | null
  updated_by: string | null
  codes: number
  codes_7d: number
}

export type ShareStatsTotals = {
  views: number
  previews: number
  opens: number
  app_opens: number
  android: number
  ios: number
  windows: number
  mac: number
  posts: number
}

export type ShareStatsDay = {
  day: string
  views: number
  opens: number
  app_opens: number
  downloads: number
}

export type ShareStatsPost = {
  code: string | null
  post_id: string
  author_username: string
  author_name: string
  body: string
  available: boolean
  views: number
  previews: number
  opens: number
  app_opens: number
  downloads: number
}

export type ShareLinkStats = {
  days: number
  from: string | null
  to: string | null
  totals: ShareStatsTotals
  daily: ShareStatsDay[]
  top: ShareStatsPost[]
}

export type ShareLinksSettings = { enabled: boolean; base_url: string; preview: boolean }

export type ShareLinksDraft = { enabled: boolean; baseUrl: string; preview: boolean }
