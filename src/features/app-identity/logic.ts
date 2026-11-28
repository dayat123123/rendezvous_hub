import {
  appIdentityLimits,
  type AndroidApp,
  type AppIdentity,
  type AppIdentityDraft,
  type AppIdentityField,
  type AppIdentityStatus,
} from './types'

export const validAppName = (value: string) =>
  value.length >= 1 && value.length <= appIdentityLimits.appName && !/[<>]/.test(value)

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
  | { ok: true; apps: AndroidApp[] }
  | { ok: false; problem: 'tooMany' | 'package' | 'fingerprint' | 'fingerprintCount'; line: number }

export function parseAndroid(text: string): AndroidParse {
  const rows = lines(text)
  if (rows.length > appIdentityLimits.apps)
    return { ok: false, problem: 'tooMany', line: appIdentityLimits.apps + 1 }
  const apps: AndroidApp[] = []
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
    if (prints.length < 1 || prints.length > appIdentityLimits.fingerprints)
      return { ok: false, problem: 'fingerprintCount', line: index + 1 }
    apps.push({ package: name, sha256: prints })
  }
  return { ok: true, apps }
}

export type IosParse = { ok: true; ids: string[] } | { ok: false; problem: 'tooMany' | 'appId'; line: number }

export function parseIos(text: string): IosParse {
  const rows = lines(text)
  if (rows.length > appIdentityLimits.apps)
    return { ok: false, problem: 'tooMany', line: appIdentityLimits.apps + 1 }
  const ids: string[] = []
  for (const [index, row] of rows.entries()) {
    if (row.length > 160 || !/^[A-Z0-9]{10}\.[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$/.test(row))
      return { ok: false, problem: 'appId', line: index + 1 }
    if (!ids.includes(row)) ids.push(row)
  }
  return { ok: true, ids }
}

type AndroidProblem = Extract<AndroidParse, { ok: false }>['problem']
type IosProblem = Extract<IosParse, { ok: false }>['problem']

export type IdentityProblemCode =
  'appNameInvalid' | 'httpsInvalid' | `android.${AndroidProblem}` | `ios.${IosProblem}`

export type IdentityProblem = { code: IdentityProblemCode; line?: number }

export function draftFromIdentity(identity: AppIdentity): AppIdentityDraft {
  return {
    appName: identity.app_name,
    android: identity.android.map((app) => [app.package, ...app.sha256].join(' ')).join('\n'),
    ios: identity.ios_app_ids.join('\n'),
    androidStore: identity.android_store_url,
    iosStore: identity.ios_store_url,
    windowsDownload: identity.windows_download_url,
    macDownload: identity.macos_download_url,
  }
}

export function identityProblems(
  draft: AppIdentityDraft,
): Partial<Record<AppIdentityField, IdentityProblem>> {
  const problems: Partial<Record<AppIdentityField, IdentityProblem>> = {}
  if (!validAppName(draft.appName.trim())) problems.appName = { code: 'appNameInvalid' }
  const android = parseAndroid(draft.android)
  if (!android.ok) problems.android = { code: `android.${android.problem}`, line: android.line }
  const ios = parseIos(draft.ios)
  if (!ios.ok) problems.ios = { code: `ios.${ios.problem}`, line: ios.line }
  for (const field of ['androidStore', 'iosStore', 'windowsDownload', 'macDownload'] as const) {
    if (!validHttps(draft[field].trim())) problems[field] = { code: 'httpsInvalid' }
  }
  return problems
}

export function identityFromDraft(draft: AppIdentityDraft): AppIdentity {
  const android = parseAndroid(draft.android)
  const ios = parseIos(draft.ios)
  return {
    app_name: draft.appName.trim(),
    android: android.ok ? android.apps : [],
    ios_app_ids: ios.ok ? ios.ids : [],
    android_store_url: draft.androidStore.trim(),
    ios_store_url: draft.iosStore.trim(),
    windows_download_url: draft.windowsDownload.trim(),
    macos_download_url: draft.macDownload.trim(),
  }
}

export const sameIdentity = (a: AppIdentity, b: AppIdentity) => JSON.stringify(a) === JSON.stringify(b)

export function normalizeIdentity(raw: Partial<AppIdentity> | null | undefined): AppIdentity {
  const c = raw ?? {}
  return {
    app_name: c.app_name ?? 'OLT',
    android: (c.android ?? []).map((app) => ({ package: app.package, sha256: app.sha256 ?? [] })),
    ios_app_ids: c.ios_app_ids ?? [],
    android_store_url: c.android_store_url ?? '',
    ios_store_url: c.ios_store_url ?? '',
    windows_download_url: c.windows_download_url ?? '',
    macos_download_url: c.macos_download_url ?? '',
  }
}

export function normalizeIdentityStatus(raw: Partial<AppIdentityStatus> | null): AppIdentityStatus {
  return {
    identity: normalizeIdentity(raw?.identity),
    app_scheme: raw?.app_scheme ?? '',
    version: raw?.version ?? 0,
    updated_at: raw?.updated_at ?? null,
    updated_by: raw?.updated_by ?? null,
  }
}

export const downloadCount = (identity: AppIdentity) =>
  [
    identity.android_store_url,
    identity.ios_store_url,
    identity.windows_download_url,
    identity.macos_download_url,
  ].filter((url) => url !== '').length
