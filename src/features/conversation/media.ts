import { formatNumber } from '@/lib/time'

import type { Attachment } from './types'

export const IMAGE_BUCKET = 'attachments'
export const DOCUMENT_BUCKET = 'cs-documents'
export const VIDEO_BUCKET = 'cs-videos'

export const attachmentKinds = ['documents', 'images', 'videos'] as const
export type AttachmentKind = (typeof attachmentKinds)[number]

export type PolicyFormat = { code: string; mime: string; ext: string }

export type KindPolicy = {
  enabled: boolean
  bucket: string
  max_bytes: number
  max_seconds?: number
  formats: PolicyFormat[]
}

export type AttachmentPolicy = Record<AttachmentKind, KindPolicy>

export type KnownFormat = PolicyFormat & { kind: AttachmentKind; extensions: string[]; aliases?: string[] }

const MB = 1024 * 1024

export const knownFormats: KnownFormat[] = [
  { kind: 'documents', code: 'pdf', mime: 'application/pdf', ext: 'pdf', extensions: ['pdf'] },
  {
    kind: 'documents',
    code: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: 'docx',
    extensions: ['docx'],
  },
  {
    kind: 'documents',
    code: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
    extensions: ['xlsx'],
  },
  {
    kind: 'documents',
    code: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ext: 'pptx',
    extensions: ['pptx'],
  },
  { kind: 'documents', code: 'txt', mime: 'text/plain', ext: 'txt', extensions: ['txt'] },
  {
    kind: 'documents',
    code: 'csv',
    mime: 'text/csv',
    ext: 'csv',
    extensions: ['csv'],
    aliases: ['application/csv', 'application/vnd.ms-excel'],
  },
  { kind: 'images', code: 'jpeg', mime: 'image/jpeg', ext: 'jpg', extensions: ['jpg', 'jpeg'] },
  { kind: 'images', code: 'png', mime: 'image/png', ext: 'png', extensions: ['png'] },
  { kind: 'images', code: 'webp', mime: 'image/webp', ext: 'webp', extensions: ['webp'] },
  { kind: 'images', code: 'gif', mime: 'image/gif', ext: 'gif', extensions: ['gif'] },
  { kind: 'videos', code: 'mp4', mime: 'video/mp4', ext: 'mp4', extensions: ['mp4'] },
  { kind: 'videos', code: 'mov', mime: 'video/quicktime', ext: 'mov', extensions: ['mov'] },
  { kind: 'videos', code: 'webm', mime: 'video/webm', ext: 'webm', extensions: ['webm'] },
]

const pick = (kind: AttachmentKind, codes: string[]) =>
  knownFormats
    .filter((format) => format.kind === kind && codes.includes(format.code))
    .map(({ code, mime, ext }) => ({ code, mime, ext }))

export const fallbackPolicy: AttachmentPolicy = {
  documents: {
    enabled: true,
    bucket: DOCUMENT_BUCKET,
    max_bytes: 10 * MB,
    formats: pick('documents', ['pdf']),
  },
  images: {
    enabled: true,
    bucket: IMAGE_BUCKET,
    max_bytes: 5 * MB,
    formats: pick('images', ['jpeg', 'png', 'webp', 'gif']),
  },
  videos: { enabled: false, bucket: VIDEO_BUCKET, max_bytes: 25 * MB, max_seconds: 120, formats: [] },
}

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

function parseKind(raw: unknown, fallback: KindPolicy): KindPolicy {
  const source = record(raw)
  const formats = Array.isArray(source.formats)
    ? source.formats
        .map(record)
        .filter(
          (item) =>
            typeof item.code === 'string' && typeof item.mime === 'string' && typeof item.ext === 'string',
        )
        .map((item) => ({ code: String(item.code), mime: String(item.mime), ext: String(item.ext) }))
    : fallback.formats
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback.enabled,
    bucket: typeof source.bucket === 'string' ? source.bucket : fallback.bucket,
    max_bytes: typeof source.max_bytes === 'number' ? source.max_bytes : fallback.max_bytes,
    max_seconds: typeof source.max_seconds === 'number' ? source.max_seconds : fallback.max_seconds,
    formats,
  }
}

export function parsePolicy(raw: unknown): AttachmentPolicy {
  const source = record(raw)
  return {
    documents: parseKind(source.documents, fallbackPolicy.documents),
    images: parseKind(source.images, fallbackPolicy.images),
    videos: parseKind(source.videos, fallbackPolicy.videos),
  }
}

export function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

const looseTypes = ['', 'application/octet-stream']

export function identifyFile(file: Pick<File, 'name' | 'type'>): KnownFormat | null {
  const type = file.type.toLowerCase()
  const byType = knownFormats.find((format) => format.mime === type)
  if (byType) return byType
  const loose = looseTypes.includes(type) || knownFormats.some((format) => format.aliases?.includes(type))
  if (!loose) return null
  const ext = extensionOf(file.name)
  return knownFormats.find((format) => format.extensions.includes(ext)) ?? null
}

export const fileKind = (file: Pick<File, 'name' | 'type'>) => identifyFile(file)?.kind ?? null

export const isImageFile = (file: Pick<File, 'name' | 'type'>) => fileKind(file) === 'images'

export const needsCheck = (file: Pick<File, 'name' | 'type'>) => {
  const kind = fileKind(file)
  return kind === 'documents' || kind === 'videos'
}

export type MediaProblem = 'badType' | 'disabled' | 'tooLarge'

export function mediaProblem(file: File, policy: AttachmentPolicy): MediaProblem | null {
  const format = identifyFile(file)
  if (!format) return 'badType'
  const rule = policy[format.kind]
  if (!rule.enabled) return 'disabled'
  if (!rule.formats.some((item) => item.code === format.code)) return 'badType'
  return file.size > rule.max_bytes ? 'tooLarge' : null
}

export function acceptList(policy: AttachmentPolicy) {
  const items = new Set<string>()
  for (const kind of attachmentKinds) {
    const rule = policy[kind]
    if (!rule.enabled) continue
    for (const format of rule.formats) {
      items.add(format.mime)
      const known = knownFormats.find((item) => item.code === format.code)
      for (const ext of known?.extensions ?? [format.ext]) items.add(`.${ext}`)
    }
  }
  return [...items].join(',')
}

export const formatLabels: Record<string, string> = {
  pdf: 'PDF',
  docx: 'Word',
  xlsx: 'Excel',
  pptx: 'PowerPoint',
  txt: 'TXT',
  csv: 'CSV',
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  gif: 'GIF',
  mp4: 'MP4',
  mov: 'MOV',
  webm: 'WebM',
}

export function allowedLabels(policy: AttachmentPolicy) {
  return attachmentKinds
    .filter((kind) => policy[kind].enabled)
    .flatMap((kind) => policy[kind].formats.map((format) => formatLabels[format.code] ?? format.code))
}

export function attachmentKind(attachment: Pick<Attachment, 'bucket' | 'mime'>): AttachmentKind {
  const mime = attachment.mime?.toLowerCase() ?? ''
  if (attachment.bucket === VIDEO_BUCKET || mime.startsWith('video/')) return 'videos'
  if (attachment.bucket === DOCUMENT_BUCKET) return 'documents'
  const known = knownFormats.find((format) => format.mime === mime)
  return known?.kind === 'documents' ? 'documents' : 'images'
}

export const isDocument = (attachment: Pick<Attachment, 'bucket' | 'mime'>) =>
  attachmentKind(attachment) === 'documents'

export type DocumentType = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'csv' | 'text' | 'other'

const documentTypes: Record<string, DocumentType> = {
  pdf: 'pdf',
  docx: 'word',
  xlsx: 'excel',
  pptx: 'powerpoint',
  csv: 'csv',
  txt: 'text',
}

export function documentType(source: { mime?: string | null; name?: string | null }): DocumentType {
  const mime = source.mime?.toLowerCase() ?? ''
  const ext = extensionOf(source.name ?? '')
  const known =
    knownFormats.find((format) => format.kind === 'documents' && format.mime === mime) ??
    knownFormats.find((format) => format.kind === 'documents' && format.extensions.includes(ext))
  return (known && documentTypes[known.code]) ?? 'other'
}

export const fileLabelType = (file: Pick<File, 'name' | 'type'>): DocumentType | 'video' =>
  fileKind(file) === 'videos' ? 'video' : documentType({ mime: file.type, name: file.name })

export function duration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return ''
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const units = ['B', 'KB', 'MB']

export function fileSize(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined) return ''
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${formatNumber(value, unit === 0 || value >= 10 ? 0 : 1)} ${units[unit]}`
}
