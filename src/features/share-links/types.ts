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

export type ShareLinksSettings = { enabled: boolean; base_url: string; preview: boolean }

export type ShareLinksDraft = { enabled: boolean; baseUrl: string; preview: boolean }
