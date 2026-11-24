import { useState } from 'react'

import { MetricStrip } from '@/components/metric-strip'
import { ErrorState, ListSkeleton } from '@/components/states'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/controls'
import { formatNumber } from '@/lib/time'

import { useRetentionOverview } from '../hooks'
import { countOpen, totalDeleted } from '../logic'
import { retentionTabs, type RetentionOverview, type RetentionTab } from '../types'
import { RetentionChanges } from './retention-changes'
import { RetentionHolds } from './retention-holds'
import { RetentionRules } from './retention-rules'
import { RetentionRuns } from './retention-runs'
import { stamp, useRetentionText } from './retention-text'

function Summary({ overview }: { overview: RetentionOverview }) {
  const { t } = useRetentionText()
  const last = overview.runs[0]
  const pending = countOpen(overview.changes)
  const holds = overview.holds.filter((hold) => hold.active).length
  return (
    <MetricStrip
      metrics={[
        {
          label: t('retention.summary.guard'),
          value: overview.enabled ? t('retention.summary.on') : t('retention.summary.off'),
          tone: overview.enabled ? undefined : 'warn',
        },
        {
          label: t('retention.summary.schedule'),
          value: t('retention.summary.scheduleValue', { time: overview.schedule.time_wib }),
        },
        {
          label: t('retention.summary.lastRun'),
          value: last ? stamp(last.finished_at) : t('retention.summary.never'),
        },
        {
          label: t('retention.summary.lastDeleted'),
          value: last ? formatNumber(totalDeleted(last)) : '–',
        },
        {
          label: t('retention.summary.pending'),
          value: formatNumber(pending),
          tone: pending > 0 ? 'warn' : undefined,
        },
        { label: t('retention.summary.holds'), value: formatNumber(holds) },
      ]}
    />
  )
}

export function RetentionPage() {
  const { t } = useRetentionText()
  const overview = useRetentionOverview()
  const [tab, setTab] = useState<RetentionTab>('rules')
  const data = overview.data
  const pending = data ? countOpen(data.changes) : 0
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 lg:px-6">
        <header className="min-w-0">
          <h1 className="text-lg font-semibold">{t('retention.title')}</h1>
          <p className="max-w-3xl text-row text-muted-foreground">
            {t('retention.subtitle', { days: data?.delay_days ?? 7 })}
          </p>
        </header>
        {data ? (
          <>
            <Summary overview={data} />
            <ToggleGroup
              type="single"
              value={tab}
              onValueChange={(value) => {
                if (retentionTabs.includes(value as RetentionTab)) setTab(value as RetentionTab)
              }}
              aria-label={t('retention.tabs.label')}
              className="self-start"
            >
              {retentionTabs.map((item) => (
                <ToggleGroupItem key={item} value={item}>
                  {t(`retention.tabs.${item}`)}
                  {item === 'changes' && pending > 0 ? ` (${formatNumber(pending)})` : ''}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {tab === 'rules' ? <RetentionRules overview={data} /> : null}
            {tab === 'changes' ? <RetentionChanges overview={data} /> : null}
            {tab === 'holds' ? <RetentionHolds holds={data.holds} /> : null}
            {tab === 'runs' ? <RetentionRuns overview={data} /> : null}
          </>
        ) : overview.isError ? (
          <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
        ) : (
          <ListSkeleton rows={6} />
        )}
      </div>
    </div>
  )
}
