import i18n from '@/i18n'
import { durationLabel } from '@/lib/time'

import type { NodeContainer, NodeProbe, SystemNodes } from './types'

export const mapLanes = ['edge', 'api', 'workers', 'data', 'ops'] as const
export type MapLane = (typeof mapLanes)[number]

export type NodeTone = 'ok' | 'warn' | 'bad' | 'off' | 'done'
export type NodeStatus =
  | 'healthy'
  | 'running'
  | 'starting'
  | 'unhealthy'
  | 'restarting'
  | 'paused'
  | 'stopped'
  | 'failed'
  | 'done'
  | 'created'

const catalog: Record<string, MapLane> = {
  traefik: 'edge',
  kong: 'edge',
  'cs-console': 'edge',
  rest: 'api',
  auth: 'api',
  'auth-bridge': 'api',
  realtime: 'api',
  storage: 'api',
  functions: 'api',
  integration: 'api',
  finreport: 'api',
  'nasabah-gateway': 'api',
  media: 'workers',
  classifier: 'workers',
  clamav: 'workers',
  imgproxy: 'workers',
  notifier: 'workers',
  janitor: 'workers',
  'link-preview': 'workers',
  'trade-relay': 'workers',
  pgbouncer: 'data',
  db: 'data',
  valkey: 'data',
  sentinel: 'ops',
  healer: 'ops',
  backup: 'ops',
  migrate: 'ops',
  'volume-init': 'ops',
  tools: 'ops',
  meta: 'ops',
  studio: 'ops',
  'dummy-olt': 'ops',
  'dummy-iproxy': 'ops',
}

const order = Object.keys(catalog)
const oneShot = new Set(['migrate', 'volume-init', 'tools'])
const gracefulExit = new Set([0, 130, 137, 143])

export const backbone = new Set([
  'traefik>kong',
  'kong>rest',
  'rest>pgbouncer',
  'pgbouncer>db',
  'kong>realtime',
  'realtime>db',
])

export const mapEdges: readonly (readonly [string, string])[] = [
  ['traefik', 'kong'],
  ['traefik', 'cs-console'],
  ['kong', 'rest'],
  ['kong', 'auth'],
  ['kong', 'auth-bridge'],
  ['kong', 'realtime'],
  ['kong', 'storage'],
  ['kong', 'functions'],
  ['kong', 'integration'],
  ['kong', 'finreport'],
  ['kong', 'nasabah-gateway'],
  ['kong', 'media'],
  ['media', 'classifier'],
  ['media', 'clamav'],
  ['finreport', 'rest'],
  ['finreport', 'storage'],
  ['finreport', 'clamav'],
  ['storage', 'imgproxy'],
  ['rest', 'pgbouncer'],
  ['auth', 'pgbouncer'],
  ['storage', 'pgbouncer'],
  ['auth-bridge', 'valkey'],
  ['realtime', 'db'],
  ['pgbouncer', 'db'],
]

export function laneOf(service: string): MapLane {
  return catalog[service] ?? 'workers'
}

export function containerStatus(c: NodeContainer): NodeStatus {
  switch (c.state) {
    case 'running':
      if (c.health === 'unhealthy') return 'unhealthy'
      if (c.health === 'starting') return 'starting'
      return c.health === 'healthy' ? 'healthy' : 'running'
    case 'restarting':
      return 'restarting'
    case 'paused':
      return 'paused'
    case 'created':
      return 'created'
    default:
      if (oneShot.has(c.service) && c.exit_code === 0) return 'done'
      return gracefulExit.has(c.exit_code) ? 'stopped' : 'failed'
  }
}

export function statusTone(status: NodeStatus): NodeTone {
  switch (status) {
    case 'healthy':
    case 'running':
      return 'ok'
    case 'starting':
    case 'restarting':
    case 'paused':
      return 'warn'
    case 'unhealthy':
    case 'failed':
      return 'bad'
    case 'done':
      return 'done'
    default:
      return 'off'
  }
}

export type ServiceNode = {
  service: string
  lane: MapLane
  tone: NodeTone
  replicas: (NodeContainer & { status: NodeStatus; tone: NodeTone })[]
  running: number
  cpuPercent: number | null
  memoryBytes: number | null
  memoryLimitBytes: number | null
  restarts24h: number
  probe: NodeProbe | null
  version: string | null
}

export function serviceTone(tones: NodeTone[]): NodeTone {
  if (tones.length === 0) return 'off'
  const live = tones.filter((tone) => tone !== 'off' && tone !== 'done')
  if (live.length === 0) return tones.includes('done') ? 'done' : 'off'
  if (tones.includes('bad')) return 'bad'
  if (live.length < tones.filter((tone) => tone !== 'done').length || tones.includes('warn')) return 'warn'
  return 'ok'
}

const sum = (values: (number | null)[]) => {
  const known = values.filter((value): value is number => value !== null)
  return known.length === 0 ? null : known.reduce((total, value) => total + value, 0)
}

export function buildServices(data: SystemNodes): ServiceNode[] {
  const groups = new Map<string, NodeContainer[]>()
  for (const c of data.report.containers) {
    const list = groups.get(c.service) ?? []
    list.push(c)
    groups.set(c.service, list)
  }
  const restarts = new Map(data.restarts.map((r) => [r.service, r.count]))
  const probes = new Map(data.probes.map((p) => [p.name, p]))
  const nodes: ServiceNode[] = []
  for (const [service, list] of groups) {
    const replicas = [...list]
      .sort((a, b) => a.replica - b.replica || a.name.localeCompare(b.name))
      .map((c) => {
        const status = containerStatus(c)
        return { ...c, status, tone: statusTone(status) }
      })
    const live = replicas.filter((r) => r.state === 'running')
    const limits = live.map((r) => r.memory_limit_bytes)
    nodes.push({
      service,
      lane: laneOf(service),
      tone: serviceTone(replicas.map((r) => r.tone)),
      replicas,
      running: live.length,
      cpuPercent: sum(live.map((r) => r.cpu_percent)),
      memoryBytes: sum(live.map((r) => r.memory_bytes)),
      memoryLimitBytes: limits.every((limit) => limit !== null) ? sum(limits) : null,
      restarts24h: restarts.get(service) ?? 0,
      probe: probes.get(service) ?? null,
      version: data.versions[service] ?? null,
    })
  }
  return nodes.sort((a, b) => {
    const ai = order.indexOf(a.service)
    const bi = order.indexOf(b.service)
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi) || a.service.localeCompare(b.service)
  })
}

export type MapSummary = {
  containers: number
  healthy: number
  warn: number
  bad: number
  attention: number
  off: number
  services: number
  cpuPercent: number | null
  cpuCapacity: number | null
  memoryBytes: number | null
  memoryTotal: number | null
}

export function summarize(data: SystemNodes, services: ServiceNode[]): MapSummary {
  let healthy = 0
  let warn = 0
  let bad = 0
  let off = 0
  for (const node of services) {
    for (const r of node.replicas) {
      if (r.tone === 'ok') healthy += 1
      else if (r.tone === 'warn') warn += 1
      else if (r.tone === 'bad') bad += 1
      else off += 1
    }
  }
  const host = data.report.host
  return {
    containers: healthy + warn + bad + off,
    healthy,
    warn,
    bad,
    attention: warn + bad,
    off,
    services: services.length,
    cpuPercent: sum(services.map((s) => s.cpuPercent)),
    cpuCapacity: host && host.cpus > 0 ? host.cpus * 100 : null,
    memoryBytes: sum(services.map((s) => s.memoryBytes)),
    memoryTotal: host && host.memory_bytes > 0 ? host.memory_bytes : null,
  }
}

export function visibleEdges(services: ServiceNode[]): { from: string; to: string; tone: NodeTone }[] {
  const byName = new Map(services.map((s) => [s.service, s]))
  return mapEdges.flatMap(([from, to]) => {
    const a = byName.get(from)
    const b = byName.get(to)
    if (!a || !b) return []
    const pair = [a.tone, b.tone]
    const tone: NodeTone = pair.includes('bad')
      ? 'bad'
      : pair.some((t) => t === 'off' || t === 'done')
        ? 'off'
        : pair.includes('warn')
          ? 'warn'
          : 'ok'
    return [{ from, to, tone }]
  })
}

export type CpuHistory = { at: string | null; series: Record<string, number[]> }

export const historyLength = 36

export function pushHistory(
  history: CpuHistory,
  at: string | undefined,
  services: ServiceNode[],
): CpuHistory {
  if (!at || at === history.at) return history
  const series: Record<string, number[]> = {}
  for (const node of services) {
    if (node.cpuPercent === null) continue
    series[node.service] = [...(history.series[node.service] ?? []), node.cpuPercent].slice(-historyLength)
  }
  return { at, series }
}

export function uptimeSeconds(startedAt: string | null, now: number): number | null {
  if (!startedAt) return null
  const started = Date.parse(startedAt)
  return Number.isNaN(started) ? null : Math.max(0, Math.floor((now - started) / 1000))
}

export function uptimeLabel(seconds: number | null): string {
  if (seconds === null) return '–'
  const days = Math.floor(seconds / 86_400)
  if (days >= 2)
    return `${days} ${i18n.t('time.dayShort')} ${Math.floor((seconds % 86_400) / 3600)} ${i18n.t('time.hourShort')}`
  return durationLabel(seconds * 1000)
}

export function shortImage(image: string): string {
  const withoutDigest = image.split('@')[0] ?? image
  const parts = withoutDigest.split('/')
  return parts[parts.length - 1] ?? withoutDigest
}

export function imageTag(image: string): string {
  const name = shortImage(image)
  const at = name.lastIndexOf(':')
  return at > 0 ? name.slice(at + 1) : '–'
}
