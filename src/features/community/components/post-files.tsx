import {
  ExternalLinkIcon,
  FileIcon,
  FilePlusIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LoaderCircleIcon,
  PresentationIcon,
  XIcon,
} from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatBytes } from '@/lib/time'

import {
  MAX_FILE_NAME,
  MAX_POST_FILES,
  POST_FILE_ACCEPT,
  fileNameProblem,
  type ChipFile,
  type FilesProblem,
  type PostFileExt,
} from '../post-files'
import { postFilesApi } from '../post-files-api'
import type { PostFileDrafts } from '../use-post-file-drafts'

const icons = {
  pdf: FileTextIcon,
  docx: FileTextIcon,
  xlsx: FileSpreadsheetIcon,
  csv: FileSpreadsheetIcon,
  pptx: PresentationIcon,
} as const

function FileTypeIcon({ ext }: { ext: PostFileExt | null }) {
  const Icon = ext ? icons[ext] : FileIcon
  return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
}

function useTypeLabel() {
  const { t } = useTranslation()
  return (ext: PostFileExt | null) => (ext ? t(`moderation.postFiles.types.${ext}`) : '')
}

export function PostFilesField({
  drafts,
  accountId,
  problem,
  touched,
  disabled,
}: {
  drafts: PostFileDrafts
  accountId: string
  problem: FilesProblem | null
  touched: boolean
  disabled: boolean
}) {
  const { t } = useTranslation()
  const typeLabel = useTypeLabel()
  const input = useRef<HTMLInputElement>(null)
  const { files } = drafts
  return (
    <section aria-labelledby="post-files-title" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 id="post-files-title" className="text-sm font-medium">
          {t('moderation.postFiles.title')}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || files.length >= MAX_POST_FILES}
          onClick={() => input.current?.click()}
        >
          <FilePlusIcon />
          {t('moderation.postFiles.add')}
        </Button>
      </div>
      {files.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => {
            const nameProblem = fileNameProblem(file.name)
            const stale = file.accountId !== accountId
            return (
              <li key={file.id} className="flex flex-col gap-1 rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <FileTypeIcon ext={file.ext} />
                  <Input
                    aria-label={t('moderation.postFiles.name', { index: index + 1 })}
                    className="h-8 min-w-0 flex-1"
                    maxLength={MAX_FILE_NAME + 20}
                    value={file.name}
                    aria-invalid={nameProblem ? true : undefined}
                    onChange={(event) => drafts.rename(file.id, event.target.value)}
                  />
                  <span className="tabular shrink-0 text-xs text-muted-foreground">
                    {[typeLabel(file.ext), formatBytes(file.size)].filter(Boolean).join(' · ')}
                  </span>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('moderation.postFiles.remove', { name: file.name || index + 1 })}
                    onClick={() => drafts.remove(file.id)}
                  >
                    <XIcon />
                  </Button>
                </div>
                <p
                  className={
                    file.state === 'failed' || stale
                      ? 'text-xs text-destructive'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {file.state === 'uploading' ? (
                    <LoaderCircleIcon className="mr-1 inline size-3 animate-spin" aria-hidden />
                  ) : null}
                  {stale
                    ? t('moderation.postFiles.staleAccount')
                    : file.state === 'failed'
                      ? `${t('moderation.postFiles.states.failed')}: ${file.error ?? ''}`
                      : t(`moderation.postFiles.states.${file.state}`)}
                </p>
                {nameProblem ? (
                  <p className="text-xs text-destructive">
                    {t(`moderation.postFiles.problems.${nameProblem}`, { max: MAX_FILE_NAME })}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('moderation.postFiles.hint', { max: MAX_POST_FILES })}
        </p>
      )}
      {touched && problem && problem !== 'names' ? (
        <p className="text-xs text-destructive">
          {t(`moderation.postFiles.problems.${problem}`, { max: MAX_POST_FILES })}
        </p>
      ) : null}
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept={POST_FILE_ACCEPT}
        aria-label={t('moderation.postFiles.input')}
        onChange={(event) => {
          drafts.add(accountId, [...(event.target.files ?? [])])
          event.target.value = ''
        }}
      />
    </section>
  )
}

function useOpenPostFile() {
  const { t } = useTranslation()
  return (path: string) => {
    const target = window.open('about:blank', '_blank')
    postFilesApi
      .postFileUrl(path)
      .then((url) => {
        if (!target) {
          window.location.assign(url)
          return
        }
        target.opener = null
        target.location.href = url
      })
      .catch(() => {
        target?.close()
        toast.error(t('moderation.postFiles.openFailed'))
      })
  }
}

export function PostFileChips({ files, openable = false }: { files: ChipFile[]; openable?: boolean }) {
  const { t } = useTranslation()
  const typeLabel = useTypeLabel()
  const open = useOpenPostFile()
  if (files.length === 0) return null
  return (
    <ul aria-label={t('moderation.postFiles.title')} className="flex flex-col gap-1.5">
      {files.map((file) => (
        <li
          key={file.key}
          className="flex min-w-0 items-center gap-2 rounded-md border bg-subtle px-2.5 py-1.5"
        >
          <FileTypeIcon ext={file.ext} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium">{file.name}</span>
            <span className="tabular text-xs text-muted-foreground">
              {[typeLabel(file.ext), file.size ? formatBytes(file.size) : null].filter(Boolean).join(' · ')}
            </span>
          </span>
          {openable && file.path ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              aria-label={t('moderation.postFiles.open', { name: file.name })}
              onClick={(event) => {
                event.stopPropagation()
                if (file.path) open(file.path)
              }}
            >
              <ExternalLinkIcon />
              {t('moderation.postFiles.openShort')}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
