import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/states'
import { Skeleton } from '@/components/ui/primitives'
import { formatNumber, minutesLabel } from '@/lib/time'
import { cn } from '@/lib/utils'

import { helpArticlesCsv, helpCsvName, helpMissesCsv, helpTopicsCsv } from '../help-csv'
import { useHelpReport } from '../hooks'
import { reportColumns } from '../table'
import type { DateRange, HelpArticleRow, HelpMissRow, HelpReport, HelpTopicRow } from '../types'
import { CsvButton, TableHeading } from './csv-button'
import { SortableTable } from './sortable-table'

function useHelpColumns() {
  const { t } = useTranslation()
  return useMemo(() => {
    const topic = reportColumns<HelpTopicRow>()
    const article = reportColumns<HelpArticleRow>()
    const miss = reportColumns<HelpMissRow>()
    return {
      topics: topic.columns([
        topic.accessor((row) => row.name ?? row.topic, {
          id: 'topic',
          header: t('help.admin.reports.topic'),
          sortFn: 'alphanumeric',
        }),
        topic.accessor('tickets', {
          header: t('help.admin.reports.tickets'),
          sortFn: 'basic',
          meta: { numeric: true },
          cell: (info) => formatNumber(info.getValue()),
        }),
        topic.accessor((row) => row.median_first_response_minutes ?? undefined, {
          id: 'firstResponse',
          header: t('help.admin.reports.medianFirstResponse'),
          sortFn: 'basic',
          sortUndefined: 'last',
          meta: { numeric: true },
          cell: (info) => minutesLabel(info.getValue()),
        }),
        topic.accessor((row) => row.median_resolution_minutes ?? undefined, {
          id: 'resolution',
          header: t('help.admin.reports.medianResolution'),
          sortFn: 'basic',
          sortUndefined: 'last',
          meta: { numeric: true },
          cell: (info) => minutesLabel(info.getValue()),
        }),
      ]),
      articles: article.columns([
        article.accessor('question', { header: t('help.admin.reports.article'), sortFn: 'alphanumeric' }),
        article.accessor('readers', {
          header: t('help.admin.reports.readers'),
          sortFn: 'basic',
          meta: { numeric: true },
          cell: (info) => formatNumber(info.getValue()),
        }),
        article.accessor((row) => row.helpful_percent ?? undefined, {
          id: 'helpful',
          header: t('help.admin.reports.helpful'),
          sortFn: 'basic',
          sortUndefined: 'last',
          meta: { numeric: true },
          cell: (info) => {
            const value = info.getValue()
            return value === undefined ? '–' : `${value}%`
          },
        }),
        article.accessor('tickets_after', {
          header: t('help.admin.reports.ticketsAfter'),
          sortFn: 'basic',
          meta: { numeric: true },
          cell: (info) => formatNumber(info.getValue()),
        }),
        article.accessor('prevented', {
          header: t('help.admin.reports.prevented'),
          sortFn: 'basic',
          meta: { numeric: true },
          cell: (info) => formatNumber(info.getValue()),
        }),
      ]),
      misses: miss.columns([
        miss.accessor('query', { header: t('help.admin.reports.query'), sortFn: 'alphanumeric' }),
        miss.accessor('language', {
          header: t('help.admin.reports.language'),
          sortFn: 'alphanumeric',
          cell: (info) => <span className="text-xs uppercase">{info.getValue()}</span>,
        }),
        miss.accessor('count', {
          header: t('help.admin.reports.searches'),
          sortFn: 'basic',
          meta: { numeric: true },
          cell: (info) => formatNumber(info.getValue()),
        }),
      ]),
    }
  }, [t])
}

function HelpTables({ report, range }: { report: HelpReport; range: DateRange }) {
  const { t } = useTranslation()
  const columns = useHelpColumns()
  const tables = [
    {
      kind: 'topics' as const,
      title: t('help.admin.reports.helpTopics'),
      content: (
        <SortableTable
          columns={columns.topics}
          data={report.topics}
          caption={t('help.admin.reports.helpTopics')}
          empty={t('help.admin.reports.empty')}
        />
      ),
      rows: report.topics.length,
      build: () =>
        helpTopicsCsv(report.topics, [
          t('help.admin.reports.topicCode'),
          t('help.admin.reports.topic'),
          t('help.admin.reports.tickets'),
          t('help.admin.reports.medianFirstResponseMinutes'),
          t('help.admin.reports.medianResolutionMinutes'),
        ]),
    },
    {
      kind: 'articles' as const,
      title: t('help.admin.reports.helpArticles'),
      content: (
        <SortableTable
          columns={columns.articles}
          data={report.articles}
          caption={t('help.admin.reports.helpArticles')}
          empty={t('help.admin.reports.empty')}
        />
      ),
      rows: report.articles.length,
      build: () =>
        helpArticlesCsv(report.articles, [
          t('help.admin.reports.article'),
          t('help.admin.reports.readers'),
          t('help.admin.reports.helpfulVotes'),
          t('help.admin.reports.notHelpfulVotes'),
          t('help.admin.reports.helpful'),
          t('help.admin.reports.ticketsAfter'),
          t('help.admin.reports.prevented'),
        ]),
    },
    {
      kind: 'misses' as const,
      title: t('help.admin.reports.helpMisses'),
      content: (
        <SortableTable
          columns={columns.misses}
          data={report.misses}
          caption={t('help.admin.reports.helpMisses')}
          empty={t('help.admin.reports.noMisses')}
        />
      ),
      rows: report.misses.length,
      build: () =>
        helpMissesCsv(report.misses, [
          t('help.admin.reports.query'),
          t('help.admin.reports.language'),
          t('help.admin.reports.searches'),
        ]),
    },
  ]
  return (
    <>
      {tables.map((table) => (
        <div
          key={table.kind}
          className="flex flex-col gap-2"
          role="group"
          aria-labelledby={`help-${table.kind}-title`}
        >
          <TableHeading
            id={`help-${table.kind}-title`}
            title={table.title}
            action={
              <CsvButton
                label={table.title}
                disabled={table.rows === 0}
                fileName={helpCsvName(table.kind, range)}
                build={table.build}
              />
            }
          />
          {table.content}
        </div>
      ))}
    </>
  )
}

export function HelpReportSection({ range }: { range: DateRange }) {
  const { t } = useTranslation()
  const report = useHelpReport(range)
  return (
    <section className="flex flex-col gap-3" aria-labelledby="help-report-title">
      <div>
        <h2 id="help-report-title" className="text-panel font-semibold">
          {t('help.admin.reports.helpTitle')}
        </h2>
        <p className="text-row text-muted-foreground">{t('help.admin.reports.helpHint')}</p>
      </div>
      {report.data ? (
        <div
          className={cn('flex flex-col gap-6', report.isPlaceholderData && 'opacity-60')}
          aria-busy={report.isFetching}
        >
          <HelpTables report={report.data} range={range} />
        </div>
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        <Skeleton className="h-2 w-2/3" />
      )}
    </section>
  )
}
