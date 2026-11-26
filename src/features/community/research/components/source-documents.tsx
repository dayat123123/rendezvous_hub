import { FilePlusIcon, FileSpreadsheetIcon, FileTextIcon, LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToneBadge } from '@/features/system/components/system-ui'
import { useAgent } from '@/features/auth/hooks'
import { formatBytes } from '@/lib/time'

import { MAX_FILE_NAME, fileNameProblem } from '../../post-files'
import { useOpenPostFile } from '../../use-open-post-file'
import { useAddReportDocument, useRemoveReportDocument } from '../hooks'
import {
  DOCUMENT_ACCEPT,
  documentErrorText,
  documentExt,
  documentProblem,
  liveDocuments,
  sourceName,
} from '../logic'
import {
  RESEARCH_DOCUMENT_MAX_BYTES,
  RESEARCH_MAX_DOCUMENTS,
  documentErrorCodes,
  type DocumentErrorCode,
  type DocumentStatus,
  type ReportDetail,
  type ResearchDocument,
} from '../types'
import { useReportText } from './report-text'
import { Section } from './section'

const statusTone: Record<DocumentStatus, 'ok' | 'warn' | 'late' | 'neutral'> = {
  queued: 'neutral',
  processing: 'warn',
  ready: 'ok',
  rejected: 'late',
}

const isDocumentError = (code: string): code is DocumentErrorCode =>
  (documentErrorCodes as readonly string[]).includes(code)

function DocumentRow({ document, canEdit }: { document: ResearchDocument; canEdit: boolean }) {
  const { t, stamp } = useReportText()
  const open = useOpenPostFile()
  const remove = useRemoveReportDocument()
  const ext = documentExt(document.path)
  const Icon = ext === 'xlsx' ? FileSpreadsheetIcon : FileTextIcon
  const name = document.name ?? t('moderation.research.documents.unnamed')
  const from = sourceName(document)
  const meta = [
    ext ? t(`moderation.postFiles.types.${ext}`) : null,
    formatBytes(document.size_bytes),
    from
      ? t(`moderation.research.sources.${document.source}`, { name: from })
      : t(`moderation.research.sources.${document.source}Unknown`),
    stamp(document.received_at),
  ]
  return (
    <li className="flex items-start gap-2 rounded-md border px-2.5 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <button
          type="button"
          className="truncate text-left text-sm font-medium underline-offset-2 hover:underline"
          onClick={() => open(document.path)}
        >
          {name}
        </button>
        <span className="tabular text-xs text-muted-foreground">{meta.filter(Boolean).join(' · ')}</span>
        {document.error_code && document.status !== 'ready' ? (
          <span
            className={
              document.status === 'rejected'
                ? 'text-xs break-words text-destructive'
                : 'text-xs break-words text-muted-foreground'
            }
          >
            {isDocumentError(document.error_code)
              ? t(`moderation.research.documents.rejections.${document.error_code}`)
              : document.error_code}
          </span>
        ) : null}
      </span>
      <ToneBadge tone={statusTone[document.status]}>
        {t(`moderation.research.documents.statuses.${document.status}`)}
      </ToneBadge>
      {canEdit ? (
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('moderation.research.documents.remove', { name })}
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(document.id, {
              onSuccess: () => toast.success(t('moderation.research.documents.removed')),
              onError: (error) => toast.error(documentErrorText(error)),
            })
          }
        >
          {remove.isPending ? <LoaderCircleIcon className="animate-spin" /> : <Trash2Icon />}
        </Button>
      ) : null}
    </li>
  )
}

export function SourceDocuments({ report }: { report: ReportDetail }) {
  const { t } = useReportText()
  const agent = useAgent()
  const add = useAddReportDocument()
  const input = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const canEdit = agent.community_permissions.includes('community.post')
  const open = report.superseded_at === null
  const full = liveDocuments(report.documents) >= RESEARCH_MAX_DOCUMENTS
  const custom = name.trim()
  const nameProblem = custom ? fileNameProblem(custom) : null

  const upload = (file: File) => {
    const issue = documentProblem(file, RESEARCH_DOCUMENT_MAX_BYTES)
    if (issue) {
      setProblem(
        t(`moderation.research.documents.problems.${issue}`, {
          size: formatBytes(RESEARCH_DOCUMENT_MAX_BYTES),
        }),
      )
      return
    }
    setProblem(null)
    add.mutate(
      { report: report.id, file, name: custom || null },
      {
        onSuccess: () => {
          setName('')
          toast.success(t('moderation.research.documents.added'))
        },
        onError: (error) => setProblem(documentErrorText(error)),
      },
    )
  }

  return (
    <Section id="research-documents" title={t('moderation.research.documents.title')}>
      <p className="text-xs text-muted-foreground">
        {t('moderation.research.documents.hint', { max: RESEARCH_MAX_DOCUMENTS })}
      </p>
      {report.documents.length === 0 ? (
        <p className="text-row text-muted-foreground">{t('moderation.research.documents.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {report.documents.map((document) => (
            <DocumentRow key={document.id} document={document} canEdit={canEdit} />
          ))}
        </ul>
      )}
      {canEdit && open ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label={t('moderation.research.documents.nameLabel')}
              placeholder={t('moderation.research.documents.namePlaceholder')}
              className="h-8 min-w-48 flex-1"
              maxLength={MAX_FILE_NAME + 20}
              value={name}
              aria-invalid={nameProblem ? true : undefined}
              disabled={full || add.isPending}
              onChange={(event) => setName(event.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={full || add.isPending || nameProblem !== null}
              onClick={() => input.current?.click()}
            >
              {add.isPending ? <LoaderCircleIcon className="animate-spin" /> : <FilePlusIcon />}
              {t('moderation.research.documents.add')}
            </Button>
          </div>
          {nameProblem ? (
            <p className="text-xs text-destructive">
              {t(`moderation.postFiles.problems.${nameProblem}`, { max: MAX_FILE_NAME })}
            </p>
          ) : null}
          {full ? (
            <p className="text-xs text-muted-foreground">
              {t('moderation.research.documents.full', { max: RESEARCH_MAX_DOCUMENTS })}
            </p>
          ) : null}
          <input
            ref={input}
            type="file"
            hidden
            accept={DOCUMENT_ACCEPT}
            aria-label={t('moderation.research.documents.input')}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) upload(file)
            }}
          />
        </div>
      ) : null}
      {problem ? (
        <p role="alert" className="text-xs break-words text-destructive">
          {problem}
        </p>
      ) : null}
    </Section>
  )
}
