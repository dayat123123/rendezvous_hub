import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import {
  backbone,
  mapLanes,
  visibleEdges,
  type MapLane,
  type NodeTone,
  type ServiceNode,
} from '../../map-logic'
import { toneStroke } from './tones'
import { ServiceCard } from './service-card'

type Path = { from: string; to: string; tone: NodeTone; d: string }

const laneLayout: Record<MapLane, { area: string; grid: string }> = {
  edge: {
    area: '@5xl:col-start-1 @5xl:row-start-1',
    grid: 'grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-1',
  },
  api: { area: '@5xl:col-start-2 @5xl:row-start-1', grid: 'grid-cols-1 @xl:grid-cols-2' },
  data: {
    area: '@5xl:col-start-3 @5xl:row-start-1',
    grid: 'grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-1',
  },
  workers: {
    area: '@5xl:col-span-3 @5xl:row-start-2',
    grid: 'grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-4',
  },
  ops: {
    area: '@5xl:col-span-3 @5xl:row-start-3',
    grid: 'grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-4',
  },
}

const laneOrder: MapLane[] = ['edge', 'api', 'data', 'workers', 'ops']

function curve(a: DOMRect, b: DOMRect): string {
  const ax = a.left + a.width / 2
  const ay = a.top + a.height / 2
  const bx = b.left + b.width / 2
  const by = b.top + b.height / 2
  if (b.left > a.right + 8 || b.right < a.left - 8) {
    const forward = b.left > a.right
    const sx = forward ? a.right : a.left
    const tx = forward ? b.left : b.right
    const bend = Math.max(Math.abs(tx - sx) * 0.5, 24)
    const dir = forward ? 1 : -1
    return `M${sx},${ay} C${sx + bend * dir},${ay} ${tx - bend * dir},${by} ${tx},${by}`
  }
  const down = by > ay
  const sy = down ? a.bottom : a.top
  const ty = down ? b.top : b.bottom
  const bend = Math.max(Math.abs(ty - sy) * 0.5, 20)
  const dir = down ? 1 : -1
  return `M${ax},${sy} C${ax},${sy + bend * dir} ${bx},${ty - bend * dir} ${bx},${ty}`
}

function relative(el: Element, origin: DOMRect): DOMRect {
  const r = el.getBoundingClientRect()
  return new DOMRect(r.left - origin.left, r.top - origin.top, r.width, r.height)
}

export function Topology({
  services,
  history,
  onOpen,
}: {
  services: ServiceNode[]
  history: Record<string, number[]>
  onOpen: (service: string) => void
}) {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const [paths, setPaths] = useState<Path[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hovered, setHovered] = useState<string | null>(null)
  const edges = useMemo(() => visibleEdges(services), [services])
  const layoutKey = services.map((s) => `${s.service}:${s.lane}:${s.tone}`).join('|')

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const measure = () => {
      const origin = root.getBoundingClientRect()
      setSize({ width: origin.width, height: origin.height })
      const next: Path[] = []
      for (const edge of edges) {
        const a = root.querySelector(`[data-node="${edge.from}"]`)
        const b = root.querySelector(`[data-node="${edge.to}"]`)
        if (!a || !b) continue
        next.push({ ...edge, d: curve(relative(a, origin), relative(b, origin)) })
      }
      setPaths(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [edges, layoutKey])

  const neighbours = useMemo(() => {
    if (!hovered) return null
    const set = new Set([hovered])
    for (const e of edges) {
      if (e.from === hovered) set.add(e.to)
      if (e.to === hovered) set.add(e.from)
    }
    return set
  }, [edges, hovered])

  const byLane = useMemo(() => {
    const map = new Map<MapLane, ServiceNode[]>(mapLanes.map((lane) => [lane, []]))
    for (const node of services) map.get(node.lane)?.push(node)
    return map
  }, [services])

  let index = 0
  return (
    <div
      ref={container}
      role="group"
      aria-label={t('system.map.canvasLabel')}
      className="relative grid gap-x-8 gap-y-8 @5xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,14rem)] @6xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)] @6xl:gap-x-14"
    >
      <svg
        aria-hidden="true"
        width={size.width}
        height={size.height}
        className="pointer-events-none absolute inset-0 z-0 hidden overflow-visible @5xl:block"
      >
        {paths.map((p) => {
          const connected = neighbours !== null && neighbours.has(p.from) && neighbours.has(p.to)
          const main = backbone.has(`${p.from}>${p.to}`)
          const flowing = (p.tone === 'ok' || p.tone === 'warn') && (neighbours ? connected : main)
          const opacity = neighbours ? (connected ? 1 : 0.06) : main || p.tone === 'bad' ? 1 : 0.55
          return (
            <g key={`${p.from}-${p.to}`} className="transition-opacity duration-300" style={{ opacity }}>
              <path
                d={p.d}
                fill="none"
                strokeWidth={connected ? 2 : 1.25}
                strokeDasharray={p.tone === 'off' ? '2 6' : p.tone === 'bad' ? '6 5' : undefined}
                className={cn(
                  toneStroke[p.tone],
                  p.tone === 'bad'
                    ? 'opacity-80'
                    : connected
                      ? 'opacity-40'
                      : main
                        ? 'opacity-30'
                        : 'opacity-15',
                )}
              />
              {flowing ? (
                <path
                  d={p.d}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="3 15"
                  className={cn(toneStroke[p.tone], 'animate-flow opacity-80')}
                />
              ) : null}
            </g>
          )
        })}
      </svg>
      {laneOrder.map((lane) => {
        const nodes = byLane.get(lane) ?? []
        if (nodes.length === 0) return null
        return (
          <section
            key={lane}
            aria-label={t(`system.map.lanes.${lane}`)}
            className={cn('flex min-w-0 flex-col gap-3', laneLayout[lane].area)}
          >
            <h3 className="relative z-10 flex items-center gap-2 text-label font-medium tracking-wider text-muted-foreground uppercase">
              {t(`system.map.lanes.${lane}`)}
              <span className="tabular rounded-sm bg-muted px-1 normal-case">{nodes.length}</span>
            </h3>
            <div className={cn('grid gap-3', laneLayout[lane].grid)}>
              {nodes.map((node) => (
                <ServiceCard
                  key={node.service}
                  node={node}
                  history={history[node.service] ?? []}
                  index={index++}
                  dimmed={neighbours !== null && !neighbours.has(node.service)}
                  highlighted={hovered === node.service}
                  onOpen={onOpen}
                  onHover={setHovered}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
