import { CircleCheckIcon, DownloadIcon, LoaderCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { MetricStrip } from '@/components/metric-strip'
import { ReasonDialog } from '@/components/reason-dialog'
import { ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/controls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAgent } from '@/features/auth/hooks'
import { canManageTradeShare, canReviewTradeShare } from '@/features/presence/types'
import { TextField, ToneBadge } from '@/features/system/components/system-ui'
import { downloadText } from '@/lib/download'
import { tradeErrorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'

import { useReviewFlag, useTradeDashboard, useTradeExport, useTradeFlags } from '../hooks'
import { csvFileContent, defaultExportRange, exportRangeProblem, safeFileName } from '../logic'
import {
  EXPORT_MAX_DAYS,
  flagKinds,
  REASON_MAX,
  REASON_MIN,
  traderStatuses,
  type FlagKind,
  type FlagStatus,
  type TradeDashboard,
  type TradeFlag,
} from '../types'
import { relayMetricLabel } from '../relay-labels'
import { useStaffName } from '../use-staff-name'
import { Panel, ProfileCell } from './shared'

const num = (value: unknown) => (typeof value === 'number' ? formatNumber(value) : '–')
const text = (value: unknown) => (typeof value === 'string' ? value : '–')

function Overview({ data }: { data: TradeDashboard }) {
  const { t } = useTranslation()
  const traders = data.traders
  return (
    <MetricStrip
      metrics={[
        {
          label: t('trade.monitoring.feature'),
          value: data.enabled ? t('trade.monitoring.on') : t('trade.monitoring.off'),
          caption: data.pilot_only ? t('trade.monitoring.pilotOnly') : t('trade.monitoring.openToAll'),
          tone: data.enabled ? 'ok' : 'late',
        },
        {
          label: t('trade.monitoring.activeTraders'),
          value: formatNumber(traders.active ?? 0),
          caption: t('trade.monitoring.pendingApplications', { value: formatNumber(traders.pending ?? 0) }),
        },
        {
          label: t('trade.monitoring.subscriptions'),
          value: formatNumber(data.subscriptions.active),
          caption: t('trade.monitoring.subscriptionsCaption', {
            pending: formatNumber(data.subscriptions.pending),
            muted: formatNumber(data.subscriptions.muted),
          }),
        },
        {
          label: t('trade.monitoring.activitiesToday'),
          value: formatNumber(data.activities_today),
          caption: t('trade.monitoring.activitiesWeek', { value: formatNumber(data.activities_7d) }),
        },
        {
          label: t('trade.monitoring.deliveriesToday'),
          value: formatNumber(data.deliveries_today.recipients),
          caption: t('trade.monitoring.deliveriesCaption', {
            pushed: formatNumber(data.deliveries_today.pushed),
            capped: formatNumber(data.deliveries_today.capped),
          }),
        },
        {
          label: t('trade.monitoring.openFlags'),
          value: formatNumber(data.open_flags),
          caption: t('trade.monitoring.pendingOrders', { value: formatNumber(data.pending_orders) }),
          tone: data.open_flags > 0 ? 'warn' : undefined,
        },
      ]}
    />
  )
}

function Health({ data }: { data: TradeDashboard }) {
  const { t } = useTranslation()
  const metrics = Object.entries(data.relay_today).sort(([a], [b]) => a.localeCompare(b))
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={t('trade.monitoring.relayHealth')}>
        {data.relay_health.length === 0 ? (
          <p className="flex items-center gap-1.5 text-row text-success">
            <CircleCheckIcon className="size-4" aria-hidden="true" />
            {t('trade.monitoring.relayHealthy')}
          </p>
        ) : (
          <ul className="flex flex-col border-t">
            {data.relay_health.map((item) => (
              <li key={item.key} className="flex flex-col gap-1 border-b py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <ToneBadge tone={item.severity === 'critical' ? 'late' : 'warn'}>
                    {t(`trade.monitoring.severity.${item.severity}`)}
                  </ToneBadge>
                  <span className="text-row font-medium">{item.title}</span>
                </span>
                {item.detail ? <span className="text-xs text-muted-foreground">{item.detail}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t('trade.monitoring.relayToday')} description={t('trade.monitoring.relayTodayHint')}>
        {metrics.length === 0 ? (
          <p className="text-row text-muted-foreground">{t('trade.monitoring.noRelayToday')}</p>
        ) : (
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-row">
            {metrics.map(([metric, count]) => (
              <div key={metric} className="contents">
                <dt className="text-muted-foreground">{relayMetricLabel(t, metric)}</dt>
                <dd className="tabular text-right">{formatNumber(count)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>
      <Panel title={t('trade.monitoring.tradersByStatus')}>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-row">
          {traderStatuses.map((status) => (
            <div key={status} className="contents">
              <dt className="text-muted-foreground">{t(`trade.share.statuses.${status}`)}</dt>
              <dd className="tabular text-right">{formatNumber(data.traders[status] ?? 0)}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title={t('trade.monitoring.topTraders')}>
        {data.top_traders.length === 0 ? (
          <p className="text-row text-muted-foreground">{t('trade.monitoring.noTopTraders')}</p>
        ) : (
          <ol className="flex flex-col border-t">
            {data.top_traders.map((item, index) => (
              <li key={item.profile?.id ?? index} className="flex items-center gap-3 border-b py-1.5">
                <ProfileCell profile={item.profile} className="flex-1" />
                <span className="tabular text-xs text-muted-foreground">
                  {t('trade.monitoring.subscribers', { value: formatNumber(item.subscribers) })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  )
}

function useFlagDetail() {
  const { t } = useTranslation()
  return (flag: TradeFlag) => {
    const details = flag.details
    switch (flag.kind) {
      case 'review_threshold':
        return t('trade.monitoring.flagDetails.review_threshold', {
          active: num(details.active),
          threshold: num(details.threshold),
        })
      case 'subscriber_surge':
        return t('trade.monitoring.flagDetails.subscriber_surge', {
          active: num(details.active),
          before: num(details.seven_days_ago),
        })
      case 'quick_flip':
        return t('trade.monitoring.flagDetails.quick_flip', {
          stock: text(details.stock),
          minutes: num(details.minutes),
        })
      case 'shared_link':
        return t('trade.monitoring.flagDetails.shared_link', { cust: text(details.cust_id) })
      default:
        return JSON.stringify(details)
    }
  }
}

function Flags({ onOpen }: { onOpen: (profile: string) => void }) {
  const { t } = useTranslation()
  const me = useAgent()
  const canReview = canReviewTradeShare(me)
  const [status, setStatus] = useState<FlagStatus>('open')
  const [reviewing, setReviewing] = useState<TradeFlag | null>(null)
  const flags = useTradeFlags(status)
  const review = useReviewFlag()
  const detail = useFlagDetail()
  const staff = useStaffName()
  return (
    <Panel
      title={t('trade.monitoring.flagsTitle')}
      description={t('trade.monitoring.flagsHint')}
      action={
        <ToggleGroup
          type="single"
          value={status}
          aria-label={t('trade.monitoring.flagsFilter')}
          onValueChange={(value) => value && setStatus(value as FlagStatus)}
        >
          <ToggleGroupItem value="open">{t('trade.monitoring.flagStatus.open')}</ToggleGroupItem>
          <ToggleGroupItem value="reviewed">{t('trade.monitoring.flagStatus.reviewed')}</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      {flags.data ? (
        flags.data.length === 0 ? (
          <p className="border-y py-4 text-center text-row text-muted-foreground">
            {status === 'open' ? t('trade.monitoring.noOpenFlags') : t('trade.monitoring.noReviewedFlags')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('trade.monitoring.columns.time')}</TableHead>
                <TableHead>{t('trade.monitoring.columns.trader')}</TableHead>
                <TableHead>{t('trade.monitoring.columns.kind')}</TableHead>
                <TableHead>{t('trade.monitoring.columns.detail')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('trade.share.columns.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.data.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell className="tabular text-xs whitespace-nowrap text-muted-foreground">
                    {stamp(flag.created_at)}
                  </TableCell>
                  <TableCell className="max-w-56">
                    {flag.profile ? (
                      <button
                        type="button"
                        className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        onClick={() => flag.profile && onOpen(flag.profile.id)}
                      >
                        <ProfileCell profile={flag.profile} />
                      </button>
                    ) : (
                      '–'
                    )}
                  </TableCell>
                  <TableCell className="text-row">
                    {(flagKinds as readonly string[]).includes(flag.kind)
                      ? t(`trade.monitoring.flagKinds.${flag.kind as FlagKind}`)
                      : flag.kind}
                  </TableCell>
                  <TableCell className="max-w-80 text-xs">
                    <span className="break-words">{detail(flag)}</span>
                    {flag.reviewed_at ? (
                      <span className="mt-1 block text-muted-foreground">
                        {t('trade.monitoring.reviewedAt', {
                          time: stamp(flag.reviewed_at),
                          name: staff({ id: flag.reviewed_by, name: flag.reviewed_by_name }),
                        })}
                        {flag.note ? `: ${flag.note}` : ''}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {status === 'open' && canReview ? (
                      <Button size="xs" variant="outline" onClick={() => setReviewing(flag)}>
                        {t('trade.monitoring.markReviewed')}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : flags.isError ? (
        <ErrorState error={flags.error} onRetry={() => void flags.refetch()} />
      ) : (
        <ListSkeleton rows={3} className="border-t" />
      )}
      {reviewing ? (
        <ReasonDialog
          open
          title={t('trade.monitoring.reviewTitle')}
          description={detail(reviewing)}
          label={t('trade.monitoring.noteLabel')}
          action={t('trade.monitoring.markReviewed')}
          min={REASON_MIN}
          max={REASON_MAX}
          hint={t('trade.reasonHint')}
          pending={review.isPending}
          onClose={() => setReviewing(null)}
          onSubmit={(note) =>
            void review
              .mutateAsync({ id: reviewing.id, note })
              .then(() => {
                setReviewing(null)
                toast.success(t('trade.monitoring.reviewed'))
              })
              .catch((error: unknown) => toast.error(tradeErrorText(error)))
          }
        />
      ) : null}
    </Panel>
  )
}

function Export() {
  const { t } = useTranslation()
  const [range, setRange] = useState(defaultExportRange)
  const exporter = useTradeExport()
  const problem = exportRangeProblem(range.from, range.to)
  return (
    <Panel
      title={t('trade.monitoring.exportTitle')}
      description={t('trade.monitoring.exportHint', { days: EXPORT_MAX_DAYS })}
    >
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (problem) return
          void exporter
            .mutateAsync(range)
            .then((result) => {
              downloadText(
                safeFileName(result.filename, `berbagi-trade-${range.from}-${range.to}.csv`),
                csvFileContent(result.csv),
                'text/csv;charset=utf-8',
              )
              toast.success(t('trade.monitoring.exported', { count: result.rows ?? 0 }))
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }}
      >
        <TextField
          id="trade-export-from"
          type="date"
          label={t('trade.monitoring.from')}
          value={range.from}
          className="w-44"
          onChange={(from) => setRange((current) => ({ ...current, from }))}
        />
        <TextField
          id="trade-export-to"
          type="date"
          label={t('trade.monitoring.to')}
          value={range.to}
          className="w-44"
          onChange={(to) => setRange((current) => ({ ...current, to }))}
        />
        <Button type="submit" variant="outline" disabled={problem !== null || exporter.isPending}>
          {exporter.isPending ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />}
          {t('trade.monitoring.download')}
        </Button>
      </form>
      {problem ? (
        <p role="alert" className="text-xs text-destructive">
          {t(`trade.monitoring.rangeProblems.${problem}`, { days: EXPORT_MAX_DAYS })}
        </p>
      ) : null}
    </Panel>
  )
}

export function MonitoringTab({ onOpen }: { onOpen: (profile: string) => void }) {
  const me = useAgent()
  const dashboard = useTradeDashboard()
  return (
    <div className="flex flex-col gap-6">
      {dashboard.data ? (
        <>
          <Overview data={dashboard.data} />
          <Health data={dashboard.data} />
        </>
      ) : dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : (
        <ListSkeleton rows={3} />
      )}
      <Flags onOpen={onOpen} />
      {canManageTradeShare(me) ? <Export /> : null}
    </div>
  )
}
