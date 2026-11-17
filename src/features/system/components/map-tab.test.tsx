import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { systemApi } from '../api'
import type { NodeContainer, SystemNodes } from '../types'
import { MapTab } from './map-tab'

vi.mock('../api', () => ({
  systemApi: { nodes: vi.fn(), health: vi.fn(), badge: vi.fn() },
}))

const now = new Date()

function container(overrides: Partial<NodeContainer>): NodeContainer {
  return {
    service: 'rest',
    name: 'olt-social-rest-1',
    replica: 1,
    host: 'srv-1',
    state: 'running',
    health: 'healthy',
    started_at: new Date(now.getTime() - 3_600_000).toISOString(),
    finished_at: null,
    exit_code: 0,
    restarts: 0,
    image: 'postgrest/postgrest:v14.18@sha256:abc',
    autoheal: true,
    cpu_percent: 1.5,
    memory_bytes: 32 * 1024 * 1024,
    memory_limit_bytes: 512 * 1024 * 1024,
    ...overrides,
  }
}

function data(overrides: Partial<SystemNodes> = {}): SystemNodes {
  return {
    now: now.toISOString(),
    reported_at: new Date(now.getTime() - 4_000).toISOString(),
    stale: false,
    report: {
      checked_at: new Date(now.getTime() - 5_000).toISOString(),
      host: { name: 'srv-1', cpus: 8, memory_bytes: 32 * 1024 ** 3, os: 'Ubuntu', docker_version: '28.4.0' },
      containers: [
        container({ service: 'kong', name: 'olt-social-kong-1', image: 'kong:3' }),
        container({}),
        container({ name: 'olt-social-rest-2', replica: 2, health: 'unhealthy' }),
        container({ service: 'db', name: 'olt-social-db-1', cpu_percent: 12 }),
        container({
          service: 'trade-relay',
          name: 'olt-social-trade-relay-1',
          state: 'exited',
          health: 'unhealthy',
          finished_at: new Date(now.getTime() - 86_400_000).toISOString(),
          cpu_percent: null,
          memory_bytes: null,
        }),
      ],
    },
    probes: [{ name: 'rest', ok: true, latency_ms: 7, checked_at: now.toISOString(), failing_since: null }],
    restarts: [{ service: 'rest', count: 2, last_at: now.toISOString() }],
    versions: {},
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MapTab', () => {
  it('summarises every container and lays services out by lane', async () => {
    vi.mocked(systemApi.nodes).mockResolvedValue(data())
    renderWithProviders(<MapTab />, monitorFixture)

    expect(await screen.findByRole('button', { name: 'Buka detail rest' })).toBeInTheDocument()
    expect(screen.getByLabelText('3 dari 5 container sehat')).toBeInTheDocument()
    const stats = screen.getByRole('region', { name: 'Peta layanan' })
    expect(within(stats).getByText('srv-1')).toBeInTheDocument()
    expect(within(stats).getByText('8 CPU · 32 GB · Docker 28.4.0')).toBeInTheDocument()

    const api = screen.getByRole('region', { name: 'API & layanan' })
    const rest = within(api).getByRole('button', { name: 'Buka detail rest' })
    expect(within(rest).getByText('API utama')).toBeInTheDocument()
    expect(within(rest).getByText('2/2 replika')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Gerbang' })).getByText('kong')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Data' })).getByText('db')).toBeInTheDocument()
    const workers = screen.getByRole('region', { name: 'Pekerja' })
    expect(within(workers).getByRole('button', { name: 'Buka detail trade-relay' })).toHaveTextContent(
      '0/1 replika',
    )
    expect(screen.getByRole('status')).toHaveTextContent(/Live\s*Diperbarui \d+ dtk lalu/)
  })

  it('opens the replica details of a service', async () => {
    const user = userEvent.setup()
    vi.mocked(systemApi.nodes).mockResolvedValue(data())
    renderWithProviders(<MapTab />, monitorFixture)

    await user.click(await screen.findByRole('button', { name: 'Buka detail rest' }))
    const sheet = await screen.findByRole('dialog', { name: 'rest' })
    expect(within(sheet).getByText('olt-social-rest-1')).toBeInTheDocument()
    expect(within(sheet).getByRole('region', { name: 'Fungsinya' })).toHaveTextContent(
      /API utama. Melayani hampir semua permintaan/,
    )
    expect(within(sheet).getByText('Sebagian besar fitur gagal dimuat.')).toBeInTheDocument()
    expect(within(sheet).getByText('olt-social-rest-2')).toBeInTheDocument()
    expect(within(sheet).getByText('Tidak sehat')).toBeInTheDocument()
    expect(within(sheet).getByText('7 ms')).toBeInTheDocument()
    expect(within(sheet).getAllByText('postgrest:v14.18')).toHaveLength(2)
    expect(within(sheet).getAllByText(/1 j 0 mnt/).length).toBeGreaterThan(0)
  })

  it('shows a stopped service as stopped instead of its leftover health', async () => {
    const user = userEvent.setup()
    vi.mocked(systemApi.nodes).mockResolvedValue(data())
    renderWithProviders(<MapTab />, monitorFixture)

    await user.click(await screen.findByRole('button', { name: 'Buka detail trade-relay' }))
    const sheet = await screen.findByRole('dialog', { name: 'trade-relay' })
    expect(within(sheet).getAllByText('Dimatikan').length).toBeGreaterThan(0)
    expect(within(sheet).queryByText('Tidak sehat')).not.toBeInTheDocument()
  })

  it('warns when the report is late or the healer cannot read Docker', async () => {
    vi.mocked(systemApi.nodes).mockResolvedValue(
      data({
        stale: true,
        reported_at: new Date(now.getTime() - 5 * 60_000).toISOString(),
        report: { ...data().report, error: 'docker list: permission denied' },
      }),
    )
    renderWithProviders(<MapTab />, monitorFixture)

    const alerts = await screen.findAllByRole('alert')
    expect(alerts[0]).toHaveTextContent(/Data terlambat: laporan terakhir 5 mnt lalu/)
    expect(alerts[1]).toHaveTextContent('Healer tidak bisa membaca Docker: docker list: permission denied')
  })

  it('explains an empty map', async () => {
    vi.mocked(systemApi.nodes).mockResolvedValue(
      data({ reported_at: null, stale: true, report: { containers: [] } }),
    )
    renderWithProviders(<MapTab />, monitorFixture)

    expect(await screen.findByText(/Belum ada data container/)).toBeInTheDocument()
  })
})
