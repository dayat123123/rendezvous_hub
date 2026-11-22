import { FileTextIcon, FilmIcon, ImageIcon } from 'lucide-react'

import { appEnv } from '@/lib/supabase'

import type { FaqAttachment, FaqAttachmentKind } from './types'

export const kindIcon: Record<FaqAttachmentKind, typeof FileTextIcon> = {
  document: FileTextIcon,
  image: ImageIcon,
  video: FilmIcon,
}

export const kindLabel = {
  document: 'faq.attachmentKind.document',
  image: 'faq.attachmentKind.image',
  video: 'faq.attachmentKind.video',
} as const satisfies Record<FaqAttachmentKind, string>

export const FAQ_FILES_BUCKET = 'faq-files'
export const FAQ_MAX_ATTACHMENTS = 10
export const FAQ_ATTACHMENT_NAME_MAX = 120

type Format = { extension: string; kind: FaqAttachmentKind; mime: string; maxBytes: number }

const MB = 1024 * 1024

const formats: Format[] = [
  { extension: 'pdf', kind: 'document', mime: 'application/pdf', maxBytes: 10 * MB },
  { extension: 'jpg', kind: 'image', mime: 'image/jpeg', maxBytes: 5 * MB },
  { extension: 'png', kind: 'image', mime: 'image/png', maxBytes: 5 * MB },
  { extension: 'webp', kind: 'image', mime: 'image/webp', maxBytes: 5 * MB },
  { extension: 'mp4', kind: 'video', mime: 'video/mp4', maxBytes: 25 * MB },
  { extension: 'webm', kind: 'video', mime: 'video/webm', maxBytes: 25 * MB },
  { extension: 'mov', kind: 'video', mime: 'video/quicktime', maxBytes: 25 * MB },
]

const extensionAliases: Record<string, string> = { jpeg: 'jpg', qt: 'mov' }

export const FAQ_ATTACHMENT_ACCEPT = [
  ...formats.map((format) => format.mime),
  ...formats.map((format) => `.${format.extension}`),
  '.jpeg',
].join(',')

export class FaqAttachmentError extends Error {
  constructor(
    readonly reason: 'type' | 'size',
    readonly limit = 0,
  ) {
    super(reason === 'type' ? 'Unsupported attachment format' : 'Attachment exceeds the size limit')
  }
}

export function attachmentFormat(file: Pick<File, 'name' | 'type'>): Format | null {
  const byMime = formats.find((format) => format.mime === file.type)
  if (byMime) return byMime
  if (file.type && file.type !== 'application/octet-stream') return null
  const raw = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? ''
  const extension = extensionAliases[raw] ?? raw
  return formats.find((format) => format.extension === extension) ?? null
}

export function attachmentName(fileName: string) {
  const cleaned = Array.from(fileName.replace(/\s+/g, ' '))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0
      return code >= 32 && code !== 127
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(cleaned).slice(0, FAQ_ATTACHMENT_NAME_MAX).join('').trim() || 'lampiran'
}

export function attachmentNameValid(name: string) {
  const length = Array.from(name.trim()).length
  return length >= 1 && length <= FAQ_ATTACHMENT_NAME_MAX
}

function publicBase() {
  try {
    return appEnv().publicApiUrl ?? appEnv().supabaseUrl
  } catch {
    return ''
  }
}

export function faqFileUrl(path: string) {
  return `${publicBase()}/storage/v1/object/public/${FAQ_FILES_BUCKET}/${path}`
}

export function moveAttachment(items: FaqAttachment[], index: number, offset: -1 | 1) {
  const target = index + offset
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  if (item) next.splice(target, 0, item)
  return next
}
