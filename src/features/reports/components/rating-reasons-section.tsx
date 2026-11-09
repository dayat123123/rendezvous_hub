import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/states'
import { Skeleton } from '@/components/ui/primitives'
import { reasonLabel } from '@/features/survey/logic'
import { useSurveyConfig } from '@/features/survey/hooks'
import { useTopicName } from '@/features/tickets/hooks'
import { formatNumber } from '@/lib/time'
import { cn } from '@/lib/utils'

import { helpCsvName, reasonsByAgentCsv, reasonsByTopicCsv } from '../help-csv'
import { useRatingReasons } from '../hooks'
import { reportColumns } from '../table'
import type { DateRange, RatingReasonByAgent, RatingReasonByTopic } from '../types'
import { CsvButton, TableHeading } from './csv-button'
import { SortableTable } from './sortable-table'

export function RatingReasonsSection({ range }: { range: DateRange }) {
  const { t, i18n } = useTranslation()
  const report = useRatingReasons(range)
  const survey = useSurveyConfig()
  const topicName = useTopicName()
  const reasons = survey.data?.config.reasons
  const language = i18n.language
  const reasonName = useMemo(
    () => (code: string) => reasonLabel(reasons, code, language),
    [reasons, language],
  )
  const columns = useMemo(() => {
    const topic = reportColumns<RatingReasonByTopic>()
    const agent = reportColumns<RatingReasonByAgent>()
    return {
      topic: topic.columns([
        topic.accessor((row) => topicName(row.topic), {
          id: 'topic',
          header: t('help.admin.reports.topic'),
          sortFn: 'alphanumeric',
        }),
        topic.accessor((row) => reasonName(row.reason), {
          id: 'reason',
          header: t('help.admin.reports.reason'),
          sortFn: 'alphanumeric',
        }),
        topic.accessor('count', {
          header: t('help.admin.reports.count'),
          sortFn: 'basic',
          meta: { numeric: true },
          cell: (info) => formatNumber(info.getValue()),
        }),
      ]),
      agent: agent.columns([
        agent.accessor((row) => row.agent_name ?? '–', {
          id: 'agent',
          header: t('help.admin.reports.agent'),
          sortFn: 'alphanumeric',
        }),
        agent.accessor((row) => reasonName(row.reason), {
          id: 'reason',
          header: t('help.admin.reports.reason'),
          sortFn: 'alphanumeric',
        }),
        agent.accessor('count', {
          header: t('help.admin.reports.count'),
          sortFn: 'basic',
          meta: { numeric: true },
          cell: (info) => formatNumber(info.getValue()),
        }),
      ]),
    }
  }, [t, topicName, reasonName])
  const data = report.data
  return (
    <section className="flex flex-col gap-3" aria-labelledby="rating-reasons-title">
      <div>
        <h2 id="rating-reasons-title" className="text-panel font-semibold">
          {t('help.admin.reports.reasonsTitle')}
        </h2>
        <p className="text-row text-muted-foreground">{t('help.admin.reports.reasonsHint')}</p>
      </div>
      {data ? (
        <div
          className={cn('grid items-start gap-6 xl:grid-cols-2', report.isPlaceholderData && 'opacity-60')}
          aria-busy={report.isFetching}
        >
          <div className="flex flex-col gap-2" role="group" aria-labelledby="reasons-topic-title">
            <TableHeading
              id="reasons-topic-title"
              title={t('help.admin.reports.reasonsByTopic')}
              action={
                <CsvButton
                  label={t('help.admin.reports.reasonsByTopic')}
                  disabled={data.by_topic.length === 0}
                  fileName={helpCsvName('reasons-topic', range)}
                  build={() =>
                    reasonsByTopicCsv(
                      data.by_topic,
                      [
                        t('help.admin.reports.topicCode'),
                        t('help.admin.reports.topic'),
                        t('help.admin.reports.reasonCode'),
                        t('help.admin.reports.reason'),
                        t('help.admin.reports.count'),
                      ],
                      topicName,
                      reasonName,
                    )
                  }
                />
              }
            />
            <SortableTable
              columns={columns.topic}
              data={data.by_topic}
              caption={t('help.admin.reports.reasonsByTopic')}
              empty={t('help.admin.reports.reasonsEmpty')}
            />
          </div>
          <div className="flex flex-col gap-2" role="group" aria-labelledby="reasons-agent-title">
            <TableHeading
              id="reasons-agent-title"
              title={t('help.admin.reports.reasonsByAgent')}
              action={
                <CsvButton
                  label={t('help.admin.reports.reasonsByAgent')}
                  disabled={data.by_agent.length === 0}
                  fileName={helpCsvName('reasons-agent', range)}
                  build={() =>
                    reasonsByAgentCsv(
                      data.by_agent,
                      [
                        t('help.admin.reports.agent'),
                        t('help.admin.reports.reasonCode'),
                        t('help.admin.reports.reason'),
                        t('help.admin.reports.count'),
                      ],
                      reasonName,
                    )
                  }
                />
              }
            />
            <SortableTable
              columns={columns.agent}
              data={data.by_agent}
              caption={t('help.admin.reports.reasonsByAgent')}
              empty={t('help.admin.reports.reasonsEmpty')}
            />
          </div>
        </div>
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        <Skeleton className="h-2 w-2/3" />
      )}
    </section>
  )
}
