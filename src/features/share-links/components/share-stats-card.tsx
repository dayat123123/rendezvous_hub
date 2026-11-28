import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MetricStrip } from '@/components/metric-strip'
import { SeriesChart } from '@/components/series-chart'
import { EmptyState } from '@/components/states'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/controls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryContent, SettingsCard } from '@/features/settings/components/settings-ui'
import { chartColors } from '@/lib/chart'
import { formatNumber } from '@/lib/time'

import { useShareLinkStats } from '../hooks'
import { downloadTotal, hasStats } from '../logic'
import { type ShareLinkStats, statsRanges, type StatsRange } from '../types'

function StatsReport({ stats }: { stats: ShareLinkStats }) {
  const { t } = useTranslation()
  const totals = stats.totals
  if (!hasStats(stats)) {
    return <EmptyState className="border-y" title={t('settings.share.stats.empty')} />
  }
  return (
    <div className="flex flex-col gap-5">
      <MetricStrip
        className="md:grid-cols-4 xl:grid-cols-4"
        metrics={[
          {
            label: t('settings.share.stats.views'),
            value: formatNumber(totals.views),
            caption: t('settings.share.stats.previewsCaption', { count: totals.previews }),
          },
          {
            label: t('settings.share.stats.opens'),
            value: formatNumber(totals.opens),
            caption: t('settings.share.stats.opensCaption'),
          },
          {
            label: t('settings.share.stats.appOpens'),
            value: formatNumber(totals.app_opens),
            caption: t('settings.share.stats.appOpensCaption'),
          },
          {
            label: t('settings.share.stats.downloads'),
            value: formatNumber(downloadTotal(totals)),
            caption: t('settings.share.stats.downloadsCaption', {
              android: formatNumber(totals.android),
              ios: formatNumber(totals.ios),
              windows: formatNumber(totals.windows),
              mac: formatNumber(totals.mac),
            }),
          },
        ]}
      />
      <SeriesChart
        data={stats.daily}
        label={t('settings.share.stats.chart')}
        height="h-48"
        series={[
          { key: 'views', label: t('settings.share.stats.views'), color: chartColors.accent },
          {
            key: 'app_opens',
            label: t('settings.share.stats.appOpens'),
            color: chartColors.neutral,
            dash: '4 3',
          },
          {
            key: 'downloads',
            label: t('settings.share.stats.downloads'),
            color: chartColors.info,
            dash: '1 3',
          },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h3 className="text-row font-medium">{t('settings.share.stats.top')}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('settings.share.stats.post')}</TableHead>
              <TableHead className="text-right">{t('settings.share.stats.views')}</TableHead>
              <TableHead className="text-right">{t('settings.share.stats.opensShort')}</TableHead>
              <TableHead className="text-right">{t('settings.share.stats.appOpensShort')}</TableHead>
              <TableHead className="text-right">{t('settings.share.stats.downloadsShort')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.top.map((post) => (
              <TableRow key={post.post_id}>
                <TableCell className="max-w-md">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-row">{post.body || t('settings.share.stats.noText')}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {post.author_name} · @{post.author_username}
                      {post.available ? null : ` · ${t('settings.share.stats.unavailable')}`}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="tabular text-right">{formatNumber(post.views)}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(post.opens)}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(post.app_opens)}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(post.downloads)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function ShareStatsCard() {
  const { t } = useTranslation()
  const [days, setDays] = useState<StatsRange>(30)
  const query = useShareLinkStats(days)
  return (
    <SettingsCard title={t('settings.share.stats.title')} subtitle={t('settings.share.stats.subtitle')}>
      <div>
        <ToggleGroup
          type="single"
          value={String(days)}
          aria-label={t('settings.share.stats.rangeLabel')}
          onValueChange={(value) => {
            const next = statsRanges.find((item) => String(item) === value)
            if (next) setDays(next)
          }}
        >
          {statsRanges.map((item) => (
            <ToggleGroupItem key={item} value={String(item)}>
              {t('settings.share.stats.range', { count: item })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <QueryContent query={query}>{(stats) => <StatsReport stats={stats} />}</QueryContent>
    </SettingsCard>
  )
}
