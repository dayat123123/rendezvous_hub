import { InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Sheet, SheetContent } from '@/components/ui/overlay'
import { UsageBar } from '@/components/usage-bar'
import { useNow } from '@/hooks/use-now'
import { formatBytes, formatNumber, stamp } from '@/lib/time'
import { cn } from '@/lib/utils'

import { imageTag, shortImage, uptimeLabel, uptimeSeconds, type ServiceNode } from '../../map-logic'
import { Beacon, Sparkline, StatusPill } from './map-ui'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border bg-subtle px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular truncate text-row font-medium">{children}</dd>
    </div>
  )
}

function Replica({ replica, now }: { replica: ServiceNode['replicas'][number]; now: number }) {
  const { t } = useTranslation()
  const running = replica.state === 'running'
  const memoryRatio =
    replica.memory_bytes !== null && replica.memory_limit_bytes
      ? replica.memory_bytes / replica.memory_limit_bytes
      : 0
  const cpuRatio = replica.cpu_percent !== null ? replica.cpu_percent / 100 : 0
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-2">
        <Beacon tone={replica.tone} />
        <span className="min-w-0 flex-1 truncate font-mono text-row font-medium">{replica.name}</span>
        <StatusPill tone={replica.tone} status={replica.status} code={replica.exit_code} />
      </div>
      {running ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('system.map.cpu')}</span>
              <span className="tabular font-medium">
                {replica.cpu_percent === null
                  ? t('system.map.noUsage')
                  : `${formatNumber(replica.cpu_percent, 1)}%`}
              </span>
            </div>
            <UsageBar
              ratio={cpuRatio}
              tone={cpuRatio >= 0.9 ? 'late' : cpuRatio >= 0.75 ? 'warn' : 'accent'}
              label={`${t('system.map.cpu')} ${replica.name}`}
              valueText={replica.cpu_percent === null ? '–' : `${formatNumber(replica.cpu_percent, 1)}%`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('system.map.memory')}</span>
              <span className="tabular font-medium">
                {formatBytes(replica.memory_bytes)}
                {replica.memory_limit_bytes ? ` / ${formatBytes(replica.memory_limit_bytes)}` : ''}
              </span>
            </div>
            <UsageBar
              ratio={memoryRatio}
              tone={memoryRatio >= 0.9 ? 'late' : memoryRatio >= 0.75 ? 'warn' : 'accent'}
              label={`${t('system.map.memory')} ${replica.name}`}
              valueText={formatBytes(replica.memory_bytes)}
            />
          </div>
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {running ? (
          <>
            <dt className="text-muted-foreground">{t('system.map.uptime')}</dt>
            <dd className="tabular text-right font-medium">
              {uptimeLabel(uptimeSeconds(replica.started_at, now))}
            </dd>
          </>
        ) : replica.finished_at ? (
          <>
            <dt className="text-muted-foreground">{t('system.map.stoppedAt')}</dt>
            <dd className="text-right font-medium">{stamp(replica.finished_at)}</dd>
          </>
        ) : null}
        {!running && replica.exit_code !== 0 ? (
          <>
            <dt className="text-muted-foreground">{t('system.map.exitCode')}</dt>
            <dd className="tabular text-right font-medium">{replica.exit_code}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">{t('system.map.restartsTotal')}</dt>
        <dd className="tabular text-right font-medium">{replica.restarts}</dd>
        <dt className="text-muted-foreground">{t('system.map.autoheal')}</dt>
        <dd className="text-right font-medium">
          {replica.autoheal ? t('system.map.autohealOn') : t('system.map.autohealOff')}
        </dd>
        <dt className="text-muted-foreground">{t('system.map.hostLabel')}</dt>
        <dd className="truncate text-right font-medium">{replica.host || '–'}</dd>
        <dt className="text-muted-foreground">{t('system.map.image')}</dt>
        <dd className="truncate text-right font-mono" title={replica.image}>
          {replica.image ? shortImage(replica.image) : '–'}
        </dd>
      </dl>
    </li>
  )
}

export function NodeSheet({
  node,
  history,
  onClose,
}: {
  node: ServiceNode | null
  history: number[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const now = useNow(1_000).getTime()
  const role = node ? t(`system.map.roles.${node.service}`, { defaultValue: '' }) : ''
  const about = node ? t(`system.map.about.${node.service}`, { defaultValue: '' }) : ''
  const impact = node ? t(`system.map.impact.${node.service}`, { defaultValue: '' }) : ''
  return (
    <Sheet open={node !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        title={node?.service ?? ''}
        closeLabel={t('app.close')}
        className="w-[min(480px,100vw)] bg-background"
      >
        {node ? (
          <div className="flex flex-col gap-5 overflow-y-auto p-4">
            <header className="flex items-start gap-3 pr-8">
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg border bg-subtle',
                  node.tone === 'bad' && 'map-glow-bad',
                  node.tone === 'warn' && 'map-glow-warn',
                )}
              >
                <Beacon tone={node.tone} className="size-3" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-mono text-panel font-semibold">{node.service}</h2>
                {role ? <p className="truncate text-row text-muted-foreground">{role}</p> : null}
              </div>
              <StatusPill tone={node.tone} />
            </header>
            {about ? (
              <section
                aria-label={t('system.map.aboutTitle')}
                className="flex flex-col gap-3 rounded-lg border bg-subtle p-3"
              >
                <div className="flex gap-2.5">
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      {t('system.map.aboutTitle')}
                    </h3>
                    <p className="text-row">{about}</p>
                  </div>
                </div>
                {impact ? (
                  <div className="flex gap-2.5">
                    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                    <div className="min-w-0">
                      <h3 className="text-xs font-medium text-muted-foreground">
                        {t('system.map.impactTitle')}
                      </h3>
                      <p className="text-row">{impact}</p>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Fact label={t('system.map.replicasTitle')}>
                {t('system.map.replicas', { running: node.running, total: node.replicas.length })}
              </Fact>
              <Fact label={t('system.map.cpu')}>
                {node.cpuPercent === null ? '–' : `${formatNumber(node.cpuPercent, 1)}%`}
              </Fact>
              <Fact label={t('system.map.memory')}>
                {formatBytes(node.memoryBytes)}
                {node.memoryLimitBytes ? (
                  <span className="text-muted-foreground"> / {formatBytes(node.memoryLimitBytes)}</span>
                ) : null}
              </Fact>
              <Fact label={t('system.map.restarts')}>{node.restarts24h}</Fact>
              <Fact label={t('system.map.probe')}>
                {node.probe ? (
                  node.probe.ok ? (
                    t('system.map.probeOk', { ms: node.probe.latency_ms ?? 0 })
                  ) : (
                    <span className="text-destructive">{t('system.map.probeFail')}</span>
                  )
                ) : (
                  '–'
                )}
              </Fact>
              <Fact label={t('system.map.version')}>
                {node.version ?? imageTag(node.replicas[0]?.image ?? '')}
              </Fact>
            </dl>
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">{t('system.map.cpuTrend')}</h3>
              <div className="rounded-lg border bg-subtle px-3 py-3">
                <Sparkline
                  values={history}
                  tone={node.tone === 'off' || node.tone === 'done' ? 'off' : node.tone}
                  width={420}
                  height={56}
                  label={t('system.map.cpuTrend')}
                  stretch
                  className="h-14 w-full"
                />
              </div>
            </section>
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">{t('system.map.replicasTitle')}</h3>
              <ul className="flex flex-col gap-2">
                {node.replicas.map((r) => (
                  <Replica key={r.name} replica={r} now={now} />
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
