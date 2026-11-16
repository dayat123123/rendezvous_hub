import { ServerIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { UsageBar, type UsageTone } from '@/components/usage-bar'
import { formatBytes, formatNumber } from '@/lib/time'
import { cn } from '@/lib/utils'

import type { MapSummary } from '../../map-logic'
import type { NodeHost } from '../../types'

const ringSegments = [
  { key: 'healthy', className: 'stroke-signal-success' },
  { key: 'warn', className: 'stroke-signal-warning' },
  { key: 'bad', className: 'stroke-signal-danger' },
  { key: 'off', className: 'stroke-signal-neutral' },
] as const

function HealthRing({ summary }: { summary: MapSummary }) {
  const { t } = useTranslation()
  const size = 116
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const total = Math.max(summary.containers, 1)
  const live = summary.containers - summary.off
  const share = live > 0 ? Math.round((summary.healthy / live) * 100) : 0
  const gap = summary.containers > 1 ? 3 : 0
  const lengths = ringSegments.map(({ key }) => (summary[key] / total) * circumference)
  const segments = ringSegments.map((segment, i) => ({
    ...segment,
    length: lengths[i] ?? 0,
    start: lengths.slice(0, i).reduce((acc, value) => acc + value, 0),
  }))
  return (
    <figure
      className="relative w-fit shrink-0 justify-self-center md:justify-self-start"
      aria-label={t('system.map.ringLabel', { healthy: summary.healthy, total: summary.containers })}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        {segments.map(({ key, className, length, start }) => {
          if (length === 0) return null
          const dash = Math.max(length - gap, 1)
          return (
            <circle
              key={key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-start}
              className={cn(className, 'transition-[stroke-dasharray,stroke-dashoffset] duration-700')}
            />
          )
        })}
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-metric font-semibold tracking-tight">{share}%</span>
        <span className="text-label text-muted-foreground uppercase">{t('system.map.healthyShare')}</span>
      </figcaption>
    </figure>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('tabular text-lg font-semibold', tone)}>{formatNumber(value)}</dd>
    </div>
  )
}

const usageTone = (ratio: number): UsageTone => (ratio >= 0.9 ? 'late' : ratio >= 0.75 ? 'warn' : 'accent')

export function MapSummaryPanel({ summary, host }: { summary: MapSummary; host: NodeHost | undefined }) {
  const { t } = useTranslation()
  const cpuRatio =
    summary.cpuPercent !== null && summary.cpuCapacity ? summary.cpuPercent / summary.cpuCapacity : 0
  const memoryRatio =
    summary.memoryBytes !== null && summary.memoryTotal ? summary.memoryBytes / summary.memoryTotal : 0
  return (
    <section
      aria-label={t('system.map.title')}
      className="grid gap-5 rounded-xl border bg-background p-4 md:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,20rem)] lg:items-center"
    >
      <HealthRing summary={summary} />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
        <Stat label={t('system.map.summary.containers')} value={summary.containers} />
        <Stat label={t('system.map.summary.services')} value={summary.services} />
        <Stat label={t('system.map.summary.healthy')} value={summary.healthy} tone="text-success" />
        <Stat
          label={t('system.map.summary.attention')}
          value={summary.attention}
          tone={summary.bad > 0 ? 'text-destructive' : summary.warn > 0 ? 'text-warning' : undefined}
        />
        <Stat label={t('system.map.summary.off')} value={summary.off} tone="text-muted-foreground" />
      </dl>
      {host ? (
        <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-subtle p-3 md:col-span-2 lg:col-span-1">
          <div className="flex min-w-0 items-center gap-2">
            <ServerIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate text-row font-medium">{host.name}</span>
          </div>
          <p className="-mt-2 truncate text-xs text-muted-foreground">
            {t('system.map.host', {
              cpus: host.cpus,
              memory: formatBytes(host.memory_bytes),
              docker: host.docker_version || '–',
            })}
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{t('system.map.summary.cpu')}</span>
              <span className="tabular font-medium">
                {t('system.map.summary.cpuValue', {
                  used: formatNumber((summary.cpuPercent ?? 0) / 100, 1),
                  cores: host.cpus,
                })}
              </span>
            </div>
            <UsageBar
              ratio={cpuRatio}
              tone={usageTone(cpuRatio)}
              label={t('system.map.summary.cpu')}
              valueText={`${Math.round(cpuRatio * 100)}%`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{t('system.map.summary.memory')}</span>
              <span className="tabular font-medium">
                {formatBytes(summary.memoryBytes)} / {formatBytes(summary.memoryTotal)}
              </span>
            </div>
            <UsageBar
              ratio={memoryRatio}
              tone={usageTone(memoryRatio)}
              label={t('system.map.summary.memory')}
              valueText={`${Math.round(memoryRatio * 100)}%`}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
