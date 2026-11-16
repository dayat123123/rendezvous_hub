import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { NodeStatus, NodeTone } from '../../map-logic'
import { toneBorder, toneFill, toneText } from './tones'

export function Beacon({ tone, className }: { tone: NodeTone; className?: string }) {
  const alive = tone === 'warn' || tone === 'bad'
  return (
    <span aria-hidden="true" className={cn('relative inline-flex size-2.5 shrink-0', className)}>
      {alive ? <span className={cn('absolute inset-0 animate-beacon rounded-full', toneFill[tone])} /> : null}
      <span className={cn('relative inline-flex size-full rounded-full', toneFill[tone])} />
    </span>
  )
}

export function StatusPill({
  tone,
  status,
  code,
  className,
}: {
  tone: NodeTone
  status?: NodeStatus
  code?: number
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-px text-xs font-medium whitespace-nowrap',
        toneBorder[tone],
        toneText[tone],
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', toneFill[tone])} />
      {status ? t(`system.map.status.${status}`, { code: code ?? 0 }) : t(`system.map.tone.${tone}`)}
    </span>
  )
}

export function Sparkline({
  values,
  tone,
  width = 72,
  height = 20,
  label,
  stretch = false,
  className,
}: {
  values: number[]
  tone: NodeTone
  width?: number
  height?: number
  label?: string
  stretch?: boolean
  className?: string
}) {
  const gradient = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  if (values.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden="true" className={className}>
        <line x1={0} x2={width} y1={height - 1} y2={height - 1} className="stroke-border" strokeWidth={1} />
      </svg>
    )
  }
  const top = Math.max(...values, 1)
  const step = width / (values.length - 1)
  const points = values.map((v, i) => [i * step, height - 1 - (v / top) * (height - 3)] as const)
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const last = points[points.length - 1] ?? [width, height]
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={stretch ? 'none' : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('overflow-visible', toneText[tone], className)}
    >
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradient})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {stretch ? null : <circle cx={last[0]} cy={last[1]} r={2} fill="currentColor" />}
    </svg>
  )
}
