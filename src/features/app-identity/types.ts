export type AndroidApp = { package: string; sha256: string[] }

export type AppIdentity = {
  app_name: string
  android: AndroidApp[]
  ios_app_ids: string[]
  android_store_url: string
  ios_store_url: string
  windows_download_url: string
  macos_download_url: string
}

export type AppIdentityStatus = {
  identity: AppIdentity
  app_scheme: string
  version: number
  updated_at: string | null
  updated_by: string | null
}

export type AppIdentityDraft = {
  appName: string
  android: string
  ios: string
  androidStore: string
  iosStore: string
  windowsDownload: string
  macDownload: string
}

export type AppIdentityField = keyof AppIdentityDraft

export const appIdentityLimits = { apps: 5, fingerprints: 5, appName: 40 } as const
