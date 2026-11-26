import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { balanceComparison, isPerShare, percentChange } from '../logic'
import type { ReportMetrics } from '../types'
import { useReportText } from './report-text'

const numeric = 'tabular py-1.5 text-right text-xs whitespace-nowrap'

function Change({ ratio }: { ratio: number | null }) {
  const { change } = useReportText()
  return (
    <span
      className={cn(
        ratio === null ? 'text-muted-foreground' : ratio < 0 ? 'text-destructive' : 'text-success',
      )}
    >
      {change(ratio)}
    </span>
  )
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-1.5">
      <h4 id={id} className="text-xs font-medium text-muted-foreground">
        {title}
      </h4>
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </section>
  )
}

function Flows({ metrics, currency }: { metrics: ReportMetrics; currency: string }) {
  const { t, money, perShare, metricName } = useReportText()
  const quarter = metrics.flows.some((flow) => flow.quarter !== undefined)
  const amount = (key: string, value: number | undefined) =>
    isPerShare(key) ? perShare(value, currency) : money(value, currency)
  return (
    <Block id="finreport-flows" title={t('moderation.finreport.metrics.flows')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('moderation.finreport.metrics.line')}</TableHead>
            <TableHead className="text-right">
              {t('moderation.finreport.metrics.ytd', { months: metrics.months })}
            </TableHead>
            <TableHead className="text-right">
              {t('moderation.finreport.metrics.ytdPrior', { months: metrics.months })}
            </TableHead>
            <TableHead className="text-right">{t('moderation.finreport.metrics.yoy')}</TableHead>
            {quarter ? (
              <>
                <TableHead className="text-right">{t('moderation.finreport.metrics.quarter')}</TableHead>
                <TableHead className="text-right">{t('moderation.finreport.metrics.quarterPrior')}</TableHead>
                <TableHead className="text-right">{t('moderation.finreport.metrics.quarterYoy')}</TableHead>
              </>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.flows.map((flow) => (
            <TableRow key={flow.key} className="h-auto">
              <TableCell className="py-1.5 text-xs whitespace-normal">{metricName(flow.key)}</TableCell>
              <TableCell className={numeric}>{amount(flow.key, flow.ytd)}</TableCell>
              <TableCell className={cn(numeric, 'text-muted-foreground')}>
                {amount(flow.key, flow.ytd_prior)}
              </TableCell>
              <TableCell className={numeric}>
                <Change ratio={percentChange(flow.ytd, flow.ytd_prior)} />
              </TableCell>
              {quarter ? (
                <>
                  <TableCell className={numeric}>{amount(flow.key, flow.quarter)}</TableCell>
                  <TableCell className={cn(numeric, 'text-muted-foreground')}>
                    {amount(flow.key, flow.quarter_prior)}
                  </TableCell>
                  <TableCell className={numeric}>
                    <Change ratio={percentChange(flow.quarter, flow.quarter_prior)} />
                  </TableCell>
                </>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Block>
  )
}

function Balances({ metrics, currency }: { metrics: ReportMetrics; currency: string }) {
  const { t, money, metricName } = useReportText()
  const previous = metrics.balances.some((balance) => balance.previous !== undefined)
  const yearEnd = metrics.balance_base === 'year_end'
  return (
    <Block id="finreport-balances" title={t('moderation.finreport.metrics.balances')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('moderation.finreport.metrics.line')}</TableHead>
            <TableHead className="text-right">{t('moderation.finreport.metrics.end')}</TableHead>
            <TableHead className="text-right">
              {yearEnd
                ? t('moderation.finreport.metrics.yearEnd')
                : t('moderation.finreport.metrics.yearAgo')}
            </TableHead>
            <TableHead className="text-right">{t('moderation.finreport.metrics.change')}</TableHead>
            {previous ? (
              <>
                <TableHead className="text-right">{t('moderation.finreport.metrics.previous')}</TableHead>
                <TableHead className="text-right">{t('moderation.finreport.metrics.qoq')}</TableHead>
              </>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.balances.map((balance) => {
            const base = balanceComparison(balance, metrics.balance_base)
            return (
              <TableRow key={balance.key} className="h-auto">
                <TableCell className="py-1.5 text-xs whitespace-normal">{metricName(balance.key)}</TableCell>
                <TableCell className={numeric}>{money(balance.end, currency)}</TableCell>
                <TableCell className={cn(numeric, 'text-muted-foreground')}>
                  {money(base, currency)}
                </TableCell>
                <TableCell className={numeric}>
                  <Change ratio={percentChange(balance.end, base)} />
                </TableCell>
                {previous ? (
                  <>
                    <TableCell className={cn(numeric, 'text-muted-foreground')}>
                      {money(balance.previous, currency)}
                    </TableCell>
                    <TableCell className={numeric}>
                      <Change ratio={percentChange(balance.end, balance.previous)} />
                    </TableCell>
                  </>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {yearEnd ? (
        <p className="text-xs text-muted-foreground">{t('moderation.finreport.metrics.sinceYearEnd')}</p>
      ) : null}
    </Block>
  )
}

function Ratios({ metrics }: { metrics: ReportMetrics }) {
  const { t, ratio, metricName } = useReportText()
  return (
    <Block id="finreport-ratios" title={t('moderation.finreport.metrics.ratios')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('moderation.finreport.metrics.line')}</TableHead>
            <TableHead className="text-right">{t('moderation.finreport.metrics.value')}</TableHead>
            <TableHead className="text-right">{t('moderation.finreport.metrics.yearAgo')}</TableHead>
            <TableHead className="text-right">{t('moderation.finreport.metrics.previous')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.ratios.map((item) => (
            <TableRow key={item.key} className="h-auto">
              <TableCell className="py-1.5 text-xs whitespace-normal">{metricName(item.key)}</TableCell>
              <TableCell className={numeric}>{ratio(item.key, item.value)}</TableCell>
              <TableCell className={cn(numeric, 'text-muted-foreground')}>
                {ratio(item.key, item.year_ago)}
              </TableCell>
              <TableCell className={cn(numeric, 'text-muted-foreground')}>
                {ratio(item.key, item.previous)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Block>
  )
}

export function MetricsTables({ metrics, currency }: { metrics: ReportMetrics; currency: string }) {
  const { t } = useReportText()
  if (metrics.flows.length + metrics.balances.length + metrics.ratios.length === 0)
    return <p className="text-row text-muted-foreground">{t('moderation.finreport.metrics.empty')}</p>
  return (
    <div className="flex flex-col gap-4">
      {metrics.flows.length > 0 ? <Flows metrics={metrics} currency={currency} /> : null}
      {metrics.balances.length > 0 ? <Balances metrics={metrics} currency={currency} /> : null}
      {metrics.ratios.length > 0 ? <Ratios metrics={metrics} /> : null}
    </div>
  )
}
