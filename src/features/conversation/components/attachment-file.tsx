import {
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FilePenLineIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileTypeIcon,
  FileVideoIcon,
  LoaderCircleIcon,
  PresentationIcon,
  SheetIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { useDownload, useSignedUrl } from '../hooks'
import { DOCUMENT_BUCKET, documentType, fileSize, type DocumentType } from '../media'
import type { Attachment } from '../types'

const card =
  'flex w-64 max-w-full items-center gap-1 rounded-lg border border-current/20 py-1 pr-1 pl-2.5 text-left'

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

export type LabelType = DocumentType | 'video'

const icons: Record<LabelType, LucideIcon> = {
  pdf: FileTextIcon,
  word: FilePenLineIcon,
  excel: FileSpreadsheetIcon,
  powerpoint: PresentationIcon,
  csv: SheetIcon,
  text: FileTypeIcon,
  other: FileIcon,
  video: FileVideoIcon,
}

export function DocumentLabel({
  name,
  size,
  type,
  extra,
}: {
  name: string
  size?: number | null
  type: LabelType
  extra?: string
}) {
  const { t } = useTranslation()
  const Icon = icons[type]
  return (
    <>
      <Icon className="size-5 shrink-0" aria-hidden data-type={type} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-row font-medium">{name}</span>
        <span className="block text-xs opacity-75">
          {[t(`attachments.types.${type}`), extra, fileSize(size)].filter(Boolean).join(' · ')}
        </span>
      </span>
    </>
  )
}

export function DownloadButton({ path, bucket, name }: { path: string; bucket: string; name: string }) {
  const { t } = useTranslation()
  const download = useDownload()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      aria-label={t('attachments.download', { name })}
      disabled={busy}
      onClick={() => {
        setBusy(true)
        download(path, bucket, name)
          .catch(() => toast.error(t('attachments.downloadFailed')))
          .finally(() => setBusy(false))
      }}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-current/10 disabled:opacity-60',
        focusRing,
      )}
    >
      {busy ? (
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
      ) : (
        <DownloadIcon className="size-4" aria-hidden />
      )}
    </button>
  )
}

function PdfLink({ attachment, bucket, name }: { attachment: Attachment; bucket: string; name: string }) {
  const { t } = useTranslation()
  const url = useSignedUrl(attachment.path, bucket)
  if (url.isError) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2.5 py-1 opacity-80">
        <DocumentLabel name={name} size={attachment.size} type="pdf" />
        <span className="text-xs">{t('conversation.documentFailed')}</span>
      </div>
    )
  }
  return (
    <a
      href={url.data}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={url.data ? undefined : true}
      aria-label={t('conversation.openDocument', { name })}
      onClick={(event) => {
        if (!url.data) event.preventDefault()
      }}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1 pr-1.5 transition-colors hover:bg-current/5',
        focusRing,
      )}
    >
      <DocumentLabel name={name} size={attachment.size} type="pdf" />
      {url.data ? (
        <ExternalLinkIcon className="size-4 shrink-0 opacity-70" aria-hidden />
      ) : (
        <LoaderCircleIcon className="size-4 shrink-0 animate-spin opacity-70" aria-hidden />
      )}
    </a>
  )
}

export function AttachmentFile({ attachment }: { attachment: Attachment }) {
  const { t } = useTranslation()
  const type = documentType(attachment)
  const bucket = attachment.bucket ?? DOCUMENT_BUCKET
  const name = attachment.name || t('attachments.documentFallback')
  return (
    <div className={card} role="group" aria-label={name}>
      {type === 'pdf' ? (
        <PdfLink attachment={attachment} bucket={bucket} name={name} />
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 py-1">
          <DocumentLabel name={name} size={attachment.size} type={type} />
        </div>
      )}
      <DownloadButton path={attachment.path} bucket={bucket} name={name} />
    </div>
  )
}
