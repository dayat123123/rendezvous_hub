import i18n from '@/i18n'
import { toApiError } from '@/lib/errors'

import { cardErrorText } from './card-logic'
import type { FileAttachment, PostAttachment } from './types'

export const POST_FILES_BUCKET = 'post-files'
export const MAX_POST_FILES = 5
export const MAX_FILE_NAME = 120
export const POST_FILE_URL_SECONDS = 300

const MB = 1024 * 1024

export const postFileTypes = {
  pdf: { mime: 'application/pdf', maxBytes: 20 * MB },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', maxBytes: 20 * MB },
  csv: { mime: 'text/csv', maxBytes: 10 * MB },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    maxBytes: 20 * MB,
  },
  pptx: {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    maxBytes: 20 * MB,
  },
} as const

export type PostFileExt = keyof typeof postFileTypes

export const postFileExts = Object.keys(postFileTypes) as PostFileExt[]

export const POST_FILE_ACCEPT = postFileExts.map((ext) => `.${ext}`).join(',')

const legacyExts: readonly string[] = ['xls', 'xlsm', 'xlsb', 'doc', 'docm', 'ppt', 'pptm']

const extensionOf = (name: string) => /\.([a-z0-9]+)$/i.exec(name.trim())?.[1]?.toLowerCase() ?? ''

const isPostFileExt = (ext: string): ext is PostFileExt => (postFileExts as string[]).includes(ext)

export const postFileExt = (name: string): PostFileExt | null => {
  const ext = extensionOf(name)
  return isPostFileExt(ext) ? ext : null
}

export const postFileMime = (ext: PostFileExt) => postFileTypes[ext].mime

export const postFilePath = (accountId: string, id: string, ext: PostFileExt) =>
  `${accountId}/${id}/file.${ext}`

export type FileProblem =
  { code: 'legacy' } | { code: 'type' } | { code: 'empty' } | { code: 'size'; max: number }

export function postFileProblem(file: Pick<File, 'name' | 'size'>): FileProblem | null {
  const ext = postFileExt(file.name)
  if (!ext) return legacyExts.includes(extensionOf(file.name)) ? { code: 'legacy' } : { code: 'type' }
  if (file.size <= 0) return { code: 'empty' }
  const max = postFileTypes[ext].maxBytes
  return file.size > max ? { code: 'size', max } : null
}

// eslint-disable-next-line no-control-regex
const badNameChars = /[\u0000-\u001f\u007f/\\]/

export type NameProblem = 'nameRequired' | 'nameLong' | 'nameChars'

export function fileNameProblem(name: string): NameProblem | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'nameRequired'
  if (Array.from(trimmed).length > MAX_FILE_NAME) return 'nameLong'
  return badNameChars.test(trimmed) ? 'nameChars' : null
}

export const isFileAttachment = (attachment: PostAttachment): attachment is FileAttachment =>
  (attachment as Partial<FileAttachment>).type === 'file' &&
  typeof (attachment as Partial<FileAttachment>).file?.path === 'string'

export const fileAttachments = (attachments: PostAttachment[]) => attachments.filter(isFileAttachment)

export type FileDraftState = 'uploading' | 'done' | 'failed'

export type FileDraft = {
  id: string
  name: string
  size: number | null
  ext: PostFileExt | null
  path: string | null
  accountId: string
  state: FileDraftState
  error: string | null
}

export const fileDraftsFrom = (attachments: PostAttachment[], accountId: string): FileDraft[] =>
  fileAttachments(attachments).map(({ file }) => ({
    id: file.path,
    name: file.name,
    size: file.size ?? null,
    ext: postFileExt(file.path),
    path: file.path,
    accountId,
    state: 'done',
    error: null,
  }))

export type FilesProblem = 'tooMany' | 'uploading' | 'failed' | 'stale' | 'names'

export function postFilesProblem(files: FileDraft[], accountId: string): FilesProblem | null {
  if (files.length > MAX_POST_FILES) return 'tooMany'
  if (files.some((file) => file.state === 'uploading')) return 'uploading'
  if (files.some((file) => file.state === 'failed')) return 'failed'
  if (files.some((file) => file.accountId !== accountId)) return 'stale'
  return files.some((file) => fileNameProblem(file.name)) ? 'names' : null
}

export const postFilesPayload = (files: FileDraft[]): FileAttachment[] =>
  files.flatMap((file) =>
    file.path && file.state === 'done'
      ? [{ type: 'file', file: { path: file.path, name: file.name.trim() } }]
      : [],
  )

export type ChipFile = {
  key: string
  name: string
  ext: PostFileExt | null
  size: number | null
  path?: string
}

export const chipFiles = (attachments: PostAttachment[]): ChipFile[] =>
  fileAttachments(attachments).map(({ file }) => ({
    key: file.path,
    name: file.name,
    ext: postFileExt(file.path),
    size: file.size ?? null,
    path: file.path,
  }))

const fileCodes = [
  'too_many_files',
  'invalid_file',
  'file_not_found',
  'file_too_large',
  'invalid_file_type',
  'duplicate_file',
  'invalid_file_name',
  'upload_forbidden',
] as const

type FileCode = (typeof fileCodes)[number]

const isFileCode = (code: string): code is FileCode => (fileCodes as readonly string[]).includes(code)

export function postErrorText(error: unknown) {
  const { code } = toApiError(error)
  return isFileCode(code) ? i18n.t(`moderation.postFiles.errors.${code}`) : cardErrorText(error)
}
