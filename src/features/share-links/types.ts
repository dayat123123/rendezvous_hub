export type ShareAndroidApp = { package: string; sha256: string[] }

export type ShareLinksConfig = {
  enabled: boolean
  base_url: string
  preview: boolean
  app_name: string
  app_scheme: string
  android: ShareAndroidApp[]
  ios_app_ids: string[]
  android_store_url: string
  ios_store_url: string
  windows_download_url: string
  macos_download_url: string
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

export type ShareLinksDraft = {
  enabled: boolean
  baseUrl: string
  preview: boolean
  appName: string
  appScheme: string
  android: string
  ios: string
  androidStore: string
  iosStore: string
  windowsDownload: string
  macDownload: string
}

export type ShareLinksField = Exclude<keyof ShareLinksDraft, 'enabled' | 'preview'>

export const shareLinksLimits = { apps: 5, fingerprints: 5, appName: 40 } as const
