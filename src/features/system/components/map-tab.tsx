import type { TFunction } from 'i18next'
import { TriangleAlertIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/utils'

import { useSystemNodes } from '../hooks'
import { buildServices, pushHistory, summarize, type CpuHistory, type NodeTone } from '../map-logic'
import type { SystemNodes } from '../types'
import { toneFill } from './map/tones'
import { NodeSheet } from './map/node-sheet'
import { MapSummaryPanel } from './map/summary'
import { Topology } from './map/topology'

function agoText(t: TFunction, seconds: number) {
  return seconds < 90
    ? t('system.map.agoSeconds', { count: Math.max(0, seconds) })
    : t('system.map.agoMinutes', { count: Math.floor(seconds / 60) })
}

function LiveBadge({ stale, ago }: { stale: boolean; ago: string }) {
  const { t } = useTranslation()
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative inline-flex size-2" aria-hidden="true">
        {stale ? null : <span className="absolute inset-0 animate-beacon rounded-full bg-signal-success" />}
        <span
          className={cn('relative size-2 rounded-full', stale ? 'bg-signal-warning' : 'bg-signal-success')}
        />
      </span>
      <span className={cn('font-medium', stale ? 'text-warning' : 'text-foreground')}>
        {t('system.map.live')}
      </span>
      <span>{t('system.map.updated', { ago })}</span>
    </p>
  )
}

const legend: NodeTone[] = ['ok', 'warn', 'bad', 'off']

function Legend() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{t('system.map.legend')}</span>
      {legend.map((tone) => (
        <span key={tone} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn('size-2 rounded-full', toneFill[tone])} />
          {t(`system.map.tone.${tone}`)}
        </span>
      ))}
    </div>
  )
}

function MapContent({ data, updatedAt }: { data: SystemNodes; updatedAt: number }) {
  const { t } = useTranslation()
  const now = useNow(1_000).getTime()
  const [open, setOpen] = useState<string | null>(null)
  const services = useMemo(() => buildServices(data), [data])
  const summary = useMemo(() => summarize(data, services), [data, services])
  const [history, setHistory] = useState<CpuHistory>({ at: null, series: {} })
  const checkedAt = data.report.checked_at
  if (checkedAt && checkedAt !== history.at) {
    setHistory(pushHistory(history, checkedAt, services))
  }
  const reported = data.reported_at ? Date.parse(data.reported_at) : null
  const serverNow = Date.parse(data.now)
  const age =
    reported === null || Number.isNaN(serverNow)
      ? null
      : Math.round((serverNow - reported + (now - updatedAt)) / 1000)
  const ago = age === null ? '–' : agoText(t, age)
  const problem = data.report.read_error
    ? t('system.map.readError', { error: data.report.read_error })
    : data.report.error
      ? t('system.map.dockerError', { error: data.report.error })
      : null
  const selected = services.find((s) => s.service === open) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-panel font-semibold">{t('system.map.title')}</h2>
          <p className="text-row text-muted-foreground">{t('system.map.subtitle')}</p>
        </div>
        <LiveBadge stale={data.stale} ago={ago} />
      </div>
      {data.stale && reported !== null ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-note p-3 text-row"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {t('system.map.stale', { ago })}
        </p>
      ) : null}
      {problem ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 p-3 text-row text-destructive"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {problem}
        </p>
      ) : null}
      {services.length === 0 ? (
        <EmptyState title={t('system.map.empty')} />
      ) : (
        <>
          <MapSummaryPanel summary={summary} host={data.report.host} />
          <div className="map-canvas overflow-hidden rounded-xl border p-4 lg:p-6">
            <Topology services={services} history={history.series} onOpen={setOpen} />
          </div>
          <Legend />
        </>
      )}
      <NodeSheet
        node={selected}
        history={selected ? (history.series[selected.service] ?? []) : []}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}

export function MapTab() {
  const query = useSystemNodes()
  if (query.isPending) return <ListSkeleton rows={6} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <MapContent data={query.data} updatedAt={query.dataUpdatedAt} />
}
