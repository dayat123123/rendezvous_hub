import { RotateCcwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatBytes, formatNumber } from '@/lib/time'
import { cn } from '@/lib/utils'

import type { ServiceNode } from '../../map-logic'
import { Beacon, Sparkline } from './map-ui'
import { toneFill, toneGlow, toneText } from './tones'

export function ServiceCard({
  node,
  history,
  index,
  dimmed,
  highlighted,
  onOpen,
  onHover,
}: {
  node: ServiceNode
  history: number[]
  index: number
  dimmed: boolean
  highlighted: boolean
  onOpen: (service: string) => void
  onHover: (service: string | null) => void
}) {
  const { t } = useTranslation()
  const role = t(`system.map.roles.${node.service}`, { defaultValue: '' })
  const about = t(`system.map.about.${node.service}`, { defaultValue: '' })
  const inactive = node.tone === 'off' || node.tone === 'done'
  const total = node.replicas.length
  return (
    <button
      type="button"
      data-node={node.service}
      title={about || undefined}
      aria-label={t('system.map.open', { name: node.service })}
      onClick={() => onOpen(node.service)}
      onMouseEnter={() => onHover(node.service)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(node.service)}
      onBlur={() => onHover(null)}
      style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
      className={cn(
        'group relative z-10 flex w-full min-w-0 animate-rise flex-col gap-2 rounded-lg border bg-background p-3 text-left transition-[opacity,transform,border-color] outline-none hover:-translate-y-0.5 hover:border-strong focus-visible:ring-2 focus-visible:ring-ring/50',
        toneGlow[node.tone],
        inactive && 'border-dashed opacity-75',
        dimmed && 'opacity-40',
        highlighted && 'border-strong',
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Beacon tone={node.tone} className="mt-1" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-row font-medium">{node.service}</p>
          {role ? <p className="truncate text-xs text-muted-foreground">{role}</p> : null}
        </div>
        <span
          className={cn(
            'tabular shrink-0 rounded-md bg-muted px-1.5 py-px text-xs font-medium',
            node.running < total && !inactive ? toneText.warn : 'text-muted-foreground',
          )}
        >
          {t('system.map.replicas', { running: node.running, total })}
        </span>
      </div>
      <div className="flex items-center gap-1" aria-hidden="true">
        {node.replicas.map((r) => (
          <span
            key={r.name}
            title={`${r.name}: ${t(`system.map.status.${r.status}`, { code: r.exit_code })}`}
            className={cn(
              'h-1 flex-1 rounded-full',
              toneFill[r.tone],
              r.tone === 'ok' && 'opacity-60',
              r.tone === 'off' && 'opacity-40',
            )}
          />
        ))}
      </div>
      {inactive ? null : (
        <div className="flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col text-xs">
            <span className="tabular font-medium text-foreground">
              {node.cpuPercent === null ? '–' : `${formatNumber(node.cpuPercent, 1)}%`}
              <span className="ml-1 font-normal text-muted-foreground">{t('system.map.cpu')}</span>
            </span>
            <span className="tabular text-muted-foreground">
              {formatBytes(node.memoryBytes)} {t('system.map.memory')}
            </span>
          </div>
          <Sparkline values={history} tone={node.tone === 'ok' ? 'ok' : node.tone} />
        </div>
      )}
      {node.restarts24h > 0 ? (
        <span
          className="absolute -top-2 -right-2 inline-flex items-center gap-0.5 rounded-full border bg-background px-1.5 py-px text-label font-medium text-warning"
          title={t('system.map.restarts')}
        >
          <RotateCcwIcon className="size-3" aria-hidden="true" />
          {node.restarts24h}
        </span>
      ) : null}
    </button>
  )
}
