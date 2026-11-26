import { describe, expect, it } from 'vitest'

import {
  buildServices,
  containerStatus,
  pushHistory,
  serviceTone,
  shortImage,
  summarize,
  uptimeLabel,
  uptimeSeconds,
  visibleEdges,
} from './map-logic'
import type { NodeContainer, SystemNodes } from './types'

function container(overrides: Partial<NodeContainer>): NodeContainer {
  return {
    service: 'rest',
    name: 'olt-social-rest-1',
    replica: 1,
    host: 'srv-1',
    state: 'running',
    health: 'healthy',
    started_at: '2026-11-16T01:00:00Z',
    finished_at: null,
    exit_code: 0,
    restarts: 0,
    image: 'postgrest/postgrest:v14@sha256:abc',
    autoheal: true,
    cpu_percent: 2,
    memory_bytes: 100,
    memory_limit_bytes: 1000,
    ...overrides,
  }
}

function nodes(containers: NodeContainer[]): SystemNodes {
  return {
    now: '2026-11-16T03:00:10Z',
    reported_at: '2026-11-16T03:00:05Z',
    stale: false,
    report: {
      checked_at: '2026-11-16T03:00:00Z',
      host: { name: 'srv-1', cpus: 8, memory_bytes: 8000, os: 'Ubuntu', docker_version: '28' },
      containers,
    },
    probes: [
      { name: 'rest', ok: true, latency_ms: 4, checked_at: '2026-11-16T03:00:00Z', failing_since: null },
    ],
    restarts: [{ service: 'rest', count: 2, last_at: '2026-11-16T02:00:00Z' }],
    versions: { notifier: '0.3.0' },
  }
}

describe('containerStatus', () => {
  it('reads health for running containers and exit codes for stopped ones', () => {
    expect(containerStatus(container({}))).toBe('healthy')
    expect(containerStatus(container({ health: '' }))).toBe('running')
    expect(containerStatus(container({ health: 'starting' }))).toBe('starting')
    expect(containerStatus(container({ health: 'unhealthy' }))).toBe('unhealthy')
    expect(containerStatus(container({ state: 'restarting' }))).toBe('restarting')
    expect(containerStatus(container({ state: 'exited', health: 'unhealthy', exit_code: 0 }))).toBe('stopped')
    expect(containerStatus(container({ state: 'exited', exit_code: 137 }))).toBe('stopped')
    expect(containerStatus(container({ state: 'exited', exit_code: 1 }))).toBe('failed')
    expect(containerStatus(container({ service: 'migrate', state: 'exited', exit_code: 0 }))).toBe('done')
    expect(containerStatus(container({ service: 'migrate', state: 'exited', exit_code: 2 }))).toBe('failed')
  })
})

describe('serviceTone', () => {
  it('flags partial outages and keeps intentionally stopped services quiet', () => {
    expect(serviceTone(['ok', 'ok'])).toBe('ok')
    expect(serviceTone(['ok', 'off'])).toBe('warn')
    expect(serviceTone(['ok', 'bad'])).toBe('bad')
    expect(serviceTone(['off'])).toBe('off')
    expect(serviceTone(['done'])).toBe('done')
    expect(serviceTone([])).toBe('off')
  })
})

describe('buildServices', () => {
  it('groups replicas, sums usage of running ones and keeps the catalog order', () => {
    const services = buildServices(
      nodes([
        container({ service: 'db', name: 'olt-social-db-1', cpu_percent: 10 }),
        container({ name: 'olt-social-rest-2', replica: 2, cpu_percent: 3, memory_bytes: 50 }),
        container({}),
        container({
          service: 'trade-relay',
          name: 'olt-social-trade-relay-1',
          state: 'exited',
          cpu_percent: null,
        }),
        container({ service: 'mystery', name: 'olt-social-mystery-1' }),
      ]),
    )
    expect(services.map((s) => s.service)).toEqual(['rest', 'trade-relay', 'db', 'mystery'])
    const rest = services[0]!
    expect(rest.replicas.map((r) => r.replica)).toEqual([1, 2])
    expect(rest.cpuPercent).toBe(5)
    expect(rest.memoryBytes).toBe(150)
    expect(rest.memoryLimitBytes).toBe(2000)
    expect(rest.restarts24h).toBe(2)
    expect(rest.probe?.latency_ms).toBe(4)
    expect(rest.lane).toBe('api')
    expect(services[1]!.tone).toBe('off')
    expect(services[1]!.cpuPercent).toBeNull()
    expect(services[3]!.lane).toBe('workers')
  })
})

describe('summarize', () => {
  it('counts containers by tone and adds up host usage', () => {
    const data = nodes([
      container({}),
      container({ name: 'olt-social-rest-2', replica: 2, health: 'unhealthy' }),
      container({ service: 'media', name: 'olt-social-media-1', health: 'starting' }),
      container({ service: 'migrate', name: 'olt-social-migrate-1', state: 'exited' }),
    ])
    const summary = summarize(data, buildServices(data))
    expect(summary).toMatchObject({
      containers: 4,
      healthy: 1,
      warn: 1,
      bad: 1,
      attention: 2,
      off: 1,
      services: 3,
      cpuPercent: 6,
      cpuCapacity: 800,
      memoryTotal: 8000,
    })
  })
})

describe('visibleEdges', () => {
  it('draws only edges between present services and takes the worst live tone', () => {
    const data = nodes([
      container({ service: 'kong', name: 'olt-social-kong-1' }),
      container({}),
      container({ service: 'pgbouncer', name: 'olt-social-pgbouncer-1', health: 'unhealthy' }),
      container({ service: 'storage', name: 'olt-social-storage-1', state: 'exited' }),
    ])
    const edges = visibleEdges(buildServices(data))
    expect(edges).toEqual([
      { from: 'kong', to: 'rest', tone: 'ok' },
      { from: 'kong', to: 'storage', tone: 'off' },
      { from: 'rest', to: 'pgbouncer', tone: 'bad' },
      { from: 'storage', to: 'pgbouncer', tone: 'bad' },
    ])
  })
})

describe('finreport on the map', () => {
  it('sits with the API services and links to its gateway, API, storage and antivirus', () => {
    const data = nodes([
      container({ service: 'kong', name: 'olt-social-kong-1' }),
      container({}),
      container({ service: 'finreport', name: 'olt-social-finreport-1' }),
      container({ service: 'storage', name: 'olt-social-storage-1' }),
      container({ service: 'clamav', name: 'olt-social-clamav-1', health: 'unhealthy' }),
    ])
    const services = buildServices(data)
    expect(services.find((s) => s.service === 'finreport')?.lane).toBe('api')
    expect(services.map((s) => s.service)).toEqual(['kong', 'rest', 'storage', 'finreport', 'clamav'])
    expect(visibleEdges(services).filter((e) => e.from === 'finreport' || e.to === 'finreport')).toEqual([
      { from: 'kong', to: 'finreport', tone: 'ok' },
      { from: 'finreport', to: 'rest', tone: 'ok' },
      { from: 'finreport', to: 'storage', tone: 'ok' },
      { from: 'finreport', to: 'clamav', tone: 'bad' },
    ])
  })
})

describe('pushHistory', () => {
  it('adds one CPU point per new report and caps the length', () => {
    const services = buildServices(nodes([container({})]))
    let history = pushHistory({ at: null, series: {} }, 'a', services)
    history = pushHistory(history, 'a', services)
    expect(history.series.rest).toEqual([2])
    for (let i = 0; i < 50; i += 1) history = pushHistory(history, `t${i}`, services)
    expect(history.series.rest).toHaveLength(36)
  })
})

describe('uptime and image labels', () => {
  it('formats long uptimes in days and trims image digests', () => {
    const now = Date.parse('2026-11-16T03:00:00Z')
    expect(uptimeSeconds('2026-11-16T02:59:30Z', now)).toBe(30)
    expect(uptimeSeconds(null, now)).toBeNull()
    expect(uptimeLabel(3 * 86_400 + 5 * 3600)).toBe('3 hr 5 j')
    expect(uptimeLabel(90)).toBe('1 mnt 30 dtk')
    expect(shortImage('ghcr.io/org/postgrest:v14@sha256:abc')).toBe('postgrest:v14')
  })
})
