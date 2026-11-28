import {
  shareLinksLimits,
  type ShareAndroidApp,
  type ShareLinksConfig,
  type ShareLinksDraft,
  type ShareLinksField,
  type ShareLinksStatus,
} from './types'

const blockedSchemes = new Set([
  'http',
  'https',
  'file',
  'ftp',
  'javascript',
  'data',
  'blob',
  'about',
  'mailto',
  'tel',
  'intent',
  'content',
])

export const exampleCode = 'Ab12Cd34Ef'

export const tidyBaseUrl = (value: string) => value.trim().replace(/\/+$/, '')

export const validBaseUrl = (value: string) =>
  value.length <= 200 && /^https?:\/\/[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?$/.test(value)

export const validScheme = (value: string) =>
  /^[a-z][a-z0-9+.-]{1,30}$/.test(value) && !blockedSchemes.has(value)

export const validAppName = (value: string) =>
  value.length >= 1 && value.length <= shareLinksLimits.appName && !/[<>]/.test(value)

export const validHttps = (value: string) =>
  value === '' ||
  (value.length <= 300 &&
    /^https:\/\/[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?(\/[^\s<>"'`\\]*)?$/.test(value))

export function normalizeFingerprint(value: string): string | null {
  const hex = value.trim().toUpperCase().replace(/:/g, '')
  if (!/^[0-9A-F]{64}$/.test(hex)) return null
  return hex.match(/.{2}/g)!.join(':')
}

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')

export type AndroidParse =
  | { ok: true; apps: ShareAndroidApp[] }
  | { ok: false; problem: 'tooMany' | 'package' | 'fingerprint' | 'fingerprintCount'; line: number }

export function parseAndroid(text: string): AndroidParse {
  const rows = lines(text)
  if (rows.length > shareLinksLimits.apps)
    return { ok: false, problem: 'tooMany', line: shareLinksLimits.apps + 1 }
  const apps: ShareAndroidApp[] = []
  for (const [index, row] of rows.entries()) {
    const [name = '', ...rest] = row.split(/[\s,]+/).filter(Boolean)
    if (name.length > 150 || !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(name))
      return { ok: false, problem: 'package', line: index + 1 }
    const prints: string[] = []
    for (const raw of rest) {
      const print = normalizeFingerprint(raw)
      if (!print) return { ok: false, problem: 'fingerprint', line: index + 1 }
      if (!prints.includes(print)) prints.push(print)
    }
    if (prints.length < 1 || prints.length > shareLinksLimits.fingerprints)
      return { ok: false, problem: 'fingerprintCount', line: index + 1 }
    apps.push({ package: name, sha256: prints })
  }
  return { ok: true, apps }
}

export type IosParse = { ok: true; ids: string[] } | { ok: false; problem: 'tooMany' | 'appId'; line: number }

export function parseIos(text: string): IosParse {
  const rows = lines(text)
  if (rows.length > shareLinksLimits.apps)
    return { ok: false, problem: 'tooMany', line: shareLinksLimits.apps + 1 }
  const ids: string[] = []
  for (const [index, row] of rows.entries()) {
    if (row.length > 160 || !/^[A-Z0-9]{10}\.[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$/.test(row))
      return { ok: false, problem: 'appId', line: index + 1 }
    if (!ids.includes(row)) ids.push(row)
  }
  return { ok: true, ids }
}

export function draftFromConfig(config: ShareLinksConfig): ShareLinksDraft {
  return {
    enabled: config.enabled,
    baseUrl: config.base_url,
    preview: config.preview,
    appName: config.app_name,
    appScheme: config.app_scheme,
    android: config.android.map((app) => [app.package, ...app.sha256].join(' ')).join('\n'),
    ios: config.ios_app_ids.join('\n'),
    androidStore: config.android_store_url,
    iosStore: config.ios_store_url,
    windowsDownload: config.windows_download_url,
  }
}

type AndroidProblem = Extract<AndroidParse, { ok: false }>['problem']
type IosProblem = Extract<IosParse, { ok: false }>['problem']

export type DraftProblemCode =
  | 'baseUrlRequired'
  | 'baseUrlInvalid'
  | 'appNameInvalid'
  | 'appSchemeInvalid'
  | 'httpsInvalid'
  | `android.${AndroidProblem}`
  | `ios.${IosProblem}`

export type DraftProblem = { code: DraftProblemCode; line?: number }

export function draftProblems(draft: ShareLinksDraft): Partial<Record<ShareLinksField, DraftProblem>> {
  const problems: Partial<Record<ShareLinksField, DraftProblem>> = {}
  const base = tidyBaseUrl(draft.baseUrl)
  if (base === '' && draft.enabled) problems.baseUrl = { code: 'baseUrlRequired' }
  else if (base !== '' && !validBaseUrl(base)) problems.baseUrl = { code: 'baseUrlInvalid' }
  if (!validAppName(draft.appName.trim())) problems.appName = { code: 'appNameInvalid' }
  if (!validScheme(draft.appScheme.trim().toLowerCase())) problems.appScheme = { code: 'appSchemeInvalid' }
  const android = parseAndroid(draft.android)
  if (!android.ok) problems.android = { code: `android.${android.problem}`, line: android.line }
  const ios = parseIos(draft.ios)
  if (!ios.ok) problems.ios = { code: `ios.${ios.problem}`, line: ios.line }
  for (const field of ['androidStore', 'iosStore', 'windowsDownload'] as const) {
    if (!validHttps(draft[field].trim())) problems[field] = { code: 'httpsInvalid' }
  }
  return problems
}

export function configFromDraft(draft: ShareLinksDraft): ShareLinksConfig {
  const android = parseAndroid(draft.android)
  const ios = parseIos(draft.ios)
  return {
    enabled: draft.enabled,
    base_url: tidyBaseUrl(draft.baseUrl),
    preview: draft.preview,
    app_name: draft.appName.trim(),
    app_scheme: draft.appScheme.trim().toLowerCase(),
    android: android.ok ? android.apps : [],
    ios_app_ids: ios.ok ? ios.ids : [],
    android_store_url: draft.androidStore.trim(),
    ios_store_url: draft.iosStore.trim(),
    windows_download_url: draft.windowsDownload.trim(),
  }
}

export const sameConfig = (a: ShareLinksConfig, b: ShareLinksConfig) =>
  JSON.stringify(a) === JSON.stringify(b)

export function normalizeStatus(raw: Partial<ShareLinksStatus> | null): ShareLinksStatus {
  const c: Partial<ShareLinksConfig> = raw?.config ?? {}
  return {
    config: {
      enabled: c.enabled === true,
      base_url: c.base_url ?? '',
      preview: c.preview !== false,
      app_name: c.app_name ?? 'OLT',
      app_scheme: c.app_scheme ?? 'olt',
      android: (c.android ?? []).map((app) => ({ package: app.package, sha256: app.sha256 ?? [] })),
      ios_app_ids: c.ios_app_ids ?? [],
      android_store_url: c.android_store_url ?? '',
      ios_store_url: c.ios_store_url ?? '',
      windows_download_url: c.windows_download_url ?? '',
    },
    ready: raw?.ready === true,
    version: raw?.version ?? 0,
    updated_at: raw?.updated_at ?? null,
    updated_by: raw?.updated_by ?? null,
    codes: raw?.codes ?? 0,
    codes_7d: raw?.codes_7d ?? 0,
  }
}
