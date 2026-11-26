import { ToneBadge } from '@/features/system/components/system-ui'

import { isWaitingRetry } from '../logic'
import type { FileStatus, FileView } from '../types'
import { useReportText } from './report-text'

const statusTone: Record<FileStatus, 'ok' | 'warn' | 'late' | 'neutral'> = {
  queued: 'neutral',
  processing: 'warn',
  done: 'ok',
  duplicate: 'neutral',
  rejected: 'late',
}

export function FileStatusBadge({ status }: { status: FileStatus }) {
  const { t } = useReportText()
  return <ToneBadge tone={statusTone[status]}>{t(`moderation.finreport.statuses.${status}`)}</ToneBadge>
}

export function FileOutcome({ file }: { file: FileView }) {
  const { t, stamp, fileError } = useReportText()
  const waiting = isWaitingRetry(file)
  return (
    <span className="flex flex-col items-start gap-1">
      <FileStatusBadge status={file.status} />
      {waiting && file.retry_at ? (
        <span className="text-xs text-warning">
          {t('moderation.finreport.retryAt', { time: stamp(file.retry_at) })}
        </span>
      ) : null}
      {file.error_code && (file.status === 'rejected' || waiting) ? (
        <span className="max-w-72 text-xs break-words">
          <span className={file.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}>
            {fileError(file.error_code)}
          </span>
          {file.error_detail ? (
            <span className="block font-mono text-muted-foreground">{file.error_detail}</span>
          ) : null}
        </span>
      ) : null}
      {file.status === 'duplicate' ? (
        <span className="text-xs text-muted-foreground">{t('moderation.finreport.list.duplicateOf')}</span>
      ) : null}
      {file.attempts > 1 && file.status !== 'done' ? (
        <span className="tabular text-xs text-muted-foreground">
          {t('moderation.finreport.attempts', { count: file.attempts })}
        </span>
      ) : null}
    </span>
  )
}

export function WarningBadges({ codes }: { codes: string[] }) {
  const { t, warningShort } = useReportText()
  if (codes.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1" aria-label={t('moderation.finreport.cols.warnings')}>
      {codes.map((code) => (
        <li key={code}>
          <ToneBadge tone="warn">{warningShort(code)}</ToneBadge>
        </li>
      ))}
    </ul>
  )
}
