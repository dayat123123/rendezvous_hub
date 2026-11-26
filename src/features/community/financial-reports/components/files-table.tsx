import { LoaderCircleIcon, RotateCcwIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBytes } from '@/lib/time'

import { PostStatusText } from '../../components/shared'
import { useRetryFile } from '../hooks'
import { finreportErrorText } from '../logic'
import type { FileView } from '../types'
import { FileOutcome, WarningBadges } from './file-status'
import { useReportText } from './report-text'

function ReportCell({ file, onOpen }: { file: FileView; onOpen: (id: string) => void }) {
  const { t, period, reportName } = useReportText()
  const report = file.report
  if (!report) {
    return (
      <span className="flex flex-col gap-0.5">
        <span className="text-muted-foreground">{t('moderation.finreport.list.unread')}</span>
        <span className="tabular text-xs text-muted-foreground">{formatBytes(file.size_bytes)}</span>
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(report.id)}
      aria-label={t('moderation.finreport.list.open', { name: reportName(report) })}
      className="flex flex-col items-start gap-0.5 rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="font-mono font-medium">${report.entity_code}</span>
      <span className="max-w-64 text-xs break-words">{report.entity_name}</span>
      <span className="text-xs text-muted-foreground">
        {[period(report), t(`moderation.finreport.audit.${report.audit}`)].join(' · ')}
      </span>
    </button>
  )
}

function RetryButton({ file }: { file: FileView }) {
  const { t, stamp } = useReportText()
  const retry = useRetryFile()
  return (
    <Button
      size="xs"
      variant="outline"
      disabled={retry.isPending}
      aria-label={t('moderation.finreport.retry.label', { time: stamp(file.received_at) })}
      onClick={() =>
        retry.mutate(file.id, {
          onSuccess: () => toast.success(t('moderation.finreport.retry.done')),
          onError: (error) => toast.error(finreportErrorText(error)),
        })
      }
    >
      {retry.isPending ? <LoaderCircleIcon className="animate-spin" /> : <RotateCcwIcon />}
      {t('moderation.finreport.retry.action')}
    </Button>
  )
}

export function FilesTable({
  files,
  canPost,
  onOpen,
}: {
  files: FileView[]
  canPost: boolean
  onOpen: (id: string) => void
}) {
  const { t, stamp, source } = useReportText()
  return (
    <Table>
      <caption className="sr-only">{t('moderation.finreport.list.title')}</caption>
      <TableHeader>
        <TableRow>
          <TableHead>{t('moderation.finreport.cols.report')}</TableHead>
          <TableHead>{t('moderation.finreport.cols.source')}</TableHead>
          <TableHead>{t('moderation.finreport.cols.received')}</TableHead>
          <TableHead>{t('moderation.finreport.cols.file')}</TableHead>
          <TableHead>{t('moderation.finreport.cols.post')}</TableHead>
          <TableHead>{t('moderation.finreport.cols.warnings')}</TableHead>
          <TableHead>
            <span className="sr-only">{t('moderation.finreport.cols.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.id} className="h-auto align-top">
            <TableCell className="py-2 whitespace-normal">
              <ReportCell file={file} onOpen={onOpen} />
            </TableCell>
            <TableCell className="max-w-48 py-2 text-xs whitespace-normal">{source(file)}</TableCell>
            <TableCell className="tabular py-2 text-xs whitespace-nowrap text-muted-foreground">
              {stamp(file.received_at)}
            </TableCell>
            <TableCell className="py-2 whitespace-normal">
              <FileOutcome file={file} />
            </TableCell>
            <TableCell className="py-2">
              {file.report?.post ? (
                <PostStatusText status={file.report.post.status} />
              ) : file.report ? (
                <span className="text-xs text-muted-foreground">{t('moderation.finreport.noPost')}</span>
              ) : (
                <span className="text-xs text-muted-foreground">–</span>
              )}
            </TableCell>
            <TableCell className="py-2 whitespace-normal">
              <WarningBadges codes={file.report?.warnings ?? []} />
            </TableCell>
            <TableCell className="py-2">
              <div className="flex justify-end gap-1">
                {file.retryable && canPost ? <RetryButton file={file} /> : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
