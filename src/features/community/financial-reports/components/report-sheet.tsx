import { ExternalLinkIcon, LoaderCircleIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/overlay'
import { useAgent } from '@/features/auth/hooks'

import { PostStatusText } from '../../components/shared'
import { useCreateReportPost, useFinreportReport } from '../hooks'
import { finreportErrorText } from '../logic'
import type { ReportDetail, ReportRef, ReportWarning } from '../types'
import { FileOutcome, WarningBadges } from './file-status'
import { MetricsTables } from './metrics-tables'
import { useReportText } from './report-text'

type Open = (id: string) => void

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 border-b px-5 py-4">
      <h3 id={id} className="text-sm font-medium">
        {title}
      </h3>
      {children}
    </section>
  )
}

function WarningText({ warning }: { warning: ReportWarning }) {
  const { t, stamp, warningShort, metricName } = useReportText()
  const long = (() => {
    switch (warning.code) {
      case 'restated':
      case 'template_basic':
      case 'missing_lines':
      case 'no_official_account':
      case 'post_rejected':
        return t(`moderation.finreport.warnings.long.${warning.code}`)
      case 'revision':
        return warning.received_at
          ? t('moderation.finreport.warnings.long.revision', { time: stamp(warning.received_at) })
          : t('moderation.finreport.warnings.long.revisionNoTime')
      default:
        return null
    }
  })()
  return (
    <li className="flex items-start gap-2 text-row">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <span className="min-w-0">
        <span className="block font-medium">{warningShort(warning.code)}</span>
        {long ? <span className="block text-muted-foreground">{long}</span> : null}
        {warning.lines && warning.lines.length > 0 ? (
          <span className="block text-xs text-muted-foreground">
            {t('moderation.finreport.warnings.lines', { list: warning.lines.map(metricName).join(', ') })}
          </span>
        ) : null}
        {warning.reason ? (
          <span className="block text-xs break-words text-muted-foreground">
            {t('moderation.finreport.warnings.reason', { reason: warning.reason })}
          </span>
        ) : null}
      </span>
    </li>
  )
}

function RefButton({ report, label, onOpen }: { report: ReportRef; label?: string; onOpen: Open }) {
  const { reportName } = useReportText()
  return (
    <Button size="xs" variant="link" className="h-auto px-0" onClick={() => onOpen(report.id)}>
      {label ?? reportName(report)}
    </Button>
  )
}

function PostSection({
  report,
  onOpenPost,
}: {
  report: ReportDetail
  onOpenPost?: (postId: string) => void
}) {
  const { t } = useReportText()
  const agent = useAgent()
  const create = useCreateReportPost()
  const canPost = agent.community_permissions.includes('community.post')
  const post = report.post
  return (
    <Section id="finreport-post" title={t('moderation.finreport.detail.postTitle')}>
      {post ? (
        <div className="flex flex-col gap-1">
          <PostStatusText status={post.status} />
          {post.review_note ? (
            <p className="text-xs break-words text-muted-foreground">
              {t('moderation.finreport.detail.reviewNote', { note: post.review_note })}
            </p>
          ) : null}
          {post.error ? (
            <p className="text-xs break-words text-destructive">
              {t('moderation.finreport.detail.postError', { error: post.error })}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-row text-muted-foreground">{t('moderation.finreport.detail.noPost')}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {post && onOpenPost ? (
          <Button size="sm" variant="outline" onClick={() => onOpenPost(post.id)}>
            <ExternalLinkIcon />
            {t('moderation.finreport.detail.openPost')}
          </Button>
        ) : null}
        {report.can_create_post && canPost ? (
          <Button
            size="sm"
            disabled={create.isPending}
            onClick={() =>
              create.mutate(report.id, {
                onSuccess: () => toast.success(t('moderation.finreport.detail.created')),
                onError: (error) => toast.error(finreportErrorText(error)),
              })
            }
          >
            {create.isPending ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
            {t('moderation.finreport.detail.createPost')}
          </Button>
        ) : null}
      </div>
      {report.can_create_post && canPost ? (
        <p className="text-xs text-muted-foreground">{t('moderation.finreport.detail.createHint')}</p>
      ) : null}
    </Section>
  )
}

function History({ report, onOpen }: { report: ReportDetail; onOpen: Open }) {
  const { t, period } = useReportText()
  return (
    <Section
      id="finreport-history"
      title={t('moderation.finreport.detail.historyTitle', { code: report.entity_code })}
    >
      {report.history.length === 0 ? (
        <p className="text-row text-muted-foreground">{t('moderation.finreport.detail.historyEmpty')}</p>
      ) : (
        <ul className="flex flex-col">
          {report.history.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-1.5 last:border-b-0"
            >
              <RefButton report={item} label={period(item)} onOpen={onOpen} />
              <span className="text-xs text-muted-foreground">
                {t(`moderation.finreport.audit.${item.audit}`)}
              </span>
              {item.post ? <PostStatusText status={item.post.status} /> : null}
              <WarningBadges codes={item.warnings} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Detail({
  report,
  onOpen,
  onOpenPost,
}: {
  report: ReportDetail
  onOpen: Open
  onOpenPost?: (postId: string) => void
}) {
  const { t, stamp, period, source } = useReportText()
  const meta = [
    period(report),
    t(`moderation.finreport.audit.${report.audit}`),
    report.currency === 'XXX' ? t('moderation.finreport.detail.currencyUnknown') : report.currency,
    t(`moderation.finreport.templates.${report.template}`),
  ]
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-1 border-b px-5 pt-4 pr-12 pb-3">
        <h2 className="text-panel font-semibold">
          <span className="font-mono">${report.entity_code}</span> · {report.entity_name}
        </h2>
        <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>
        {report.sector ? (
          <p className="text-xs text-muted-foreground">
            {[report.sector, report.subsector].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t('moderation.finreport.detail.received', { time: stamp(report.created_at) })}
        </p>
        {report.superseded_by ? (
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-warning">
            {t('moderation.finreport.detail.superseded')}
            <RefButton
              report={report.superseded_by}
              label={t('moderation.finreport.detail.openNewer')}
              onOpen={onOpen}
            />
          </p>
        ) : null}
        {report.supersedes ? (
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {t('moderation.finreport.detail.supersedes')}
            <RefButton
              report={report.supersedes}
              label={t('moderation.finreport.detail.openOlder')}
              onOpen={onOpen}
            />
          </p>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PostSection report={report} onOpenPost={onOpenPost} />
        {report.warnings.length > 0 ? (
          <Section id="finreport-warnings" title={t('moderation.finreport.detail.warningsTitle')}>
            <ul className="flex flex-col gap-2">
              {report.warnings.map((warning, index) => (
                <WarningText key={`${warning.code}-${index}`} warning={warning} />
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t('moderation.finreport.warnings.holdsAuto')}</p>
          </Section>
        ) : null}
        <Section id="finreport-summary" title={t('moderation.finreport.detail.summaryTitle')}>
          <p className="text-xs text-muted-foreground">{t('moderation.finreport.detail.summaryHint')}</p>
          <p className="rounded-md border bg-subtle p-3 text-sm break-words whitespace-pre-wrap">
            {report.summary}
          </p>
        </Section>
        <Section id="finreport-metrics" title={t('moderation.finreport.detail.metricsTitle')}>
          <MetricsTables metrics={report.metrics} currency={report.currency} />
        </Section>
        <Section id="finreport-files" title={t('moderation.finreport.detail.filesTitle')}>
          <ul className="flex flex-col">
            {report.files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-start gap-x-4 gap-y-1 border-b py-2 last:border-b-0"
              >
                <span className="tabular w-28 shrink-0 text-xs text-muted-foreground">
                  {stamp(file.received_at)}
                </span>
                <span className="min-w-0 flex-1 text-xs">{source(file)}</span>
                <FileOutcome file={file} />
              </li>
            ))}
          </ul>
        </Section>
        <History report={report} onOpen={onOpen} />
      </div>
    </div>
  )
}

function DetailLoader({
  id,
  onOpen,
  onOpenPost,
}: {
  id: string
  onOpen: Open
  onOpenPost?: (postId: string) => void
}) {
  const report = useFinreportReport(id)
  if (report.data) return <Detail report={report.data} onOpen={onOpen} onOpenPost={onOpenPost} />
  return (
    <div className="p-5 pt-12">
      {report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        <ListSkeleton rows={6} />
      )}
    </div>
  )
}

export function ReportSheet({
  id,
  onClose,
  onOpen,
  onOpenPost,
}: {
  id: string | null
  onClose: () => void
  onOpen: Open
  onOpenPost?: (postId: string) => void
}) {
  const { t } = useReportText()
  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        title={t('moderation.finreport.detail.title')}
        closeLabel={t('app.close')}
        className="w-[min(760px,100vw)] bg-background"
      >
        {id ? <DetailLoader key={id} id={id} onOpen={onOpen} onOpenPost={onOpenPost} /> : null}
      </SheetContent>
    </Sheet>
  )
}
