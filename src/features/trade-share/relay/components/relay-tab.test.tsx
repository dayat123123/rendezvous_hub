import type * as RouterModule from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/errors'
import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { findToast, Toaster } from '@/test/toast'

import { relayApi } from '../api'
import type { RelayView } from '../types'
import { RelayTab } from './relay-tab'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  const { createElement } = await import('react')
  return {
    ...actual,
    Link: ({
      to,
      search,
      children,
    }: {
      to: string
      search?: Record<string, string>
      children: React.ReactNode
    }) =>
      createElement('a', { href: search ? `${to}?${new URLSearchParams(search).toString()}` : to }, children),
  }
})

vi.mock('../api', () => ({
  relayApi: {
    get: vi.fn(),
    command: vi.fn(),
    update: vi.fn(),
    setAes: vi.fn(),
    clearAes: vi.fn(),
    setNotify: vi.fn(),
  },
}))

const operator = { ...agentFixture, roles: ['community'], trade_permissions: ['trade_relay.operate'] }

function view(overrides: Partial<RelayView> = {}): RelayView {
  const now = new Date().toISOString()
  return {
    iproxy_addr: 'tcp://10.0.0.5:9990',
    identity: 'social_trade_relay',
    heartbeat_seconds: 4,
    aes: {
      configured: true,
      mode: 'cbc',
      fingerprint: 'a1b2c3d4',
      key_length: 32,
      has_iv: true,
      updated_at: '2026-11-14T03:00:00.000Z',
    },
    reconnect_generation: 2,
    restart_generation: 1,
    last_command_at: null,
    version: 5,
    updated_at: '2026-11-14T03:00:00.000Z',
    updated_by: null,
    trade_notify_enabled: false,
    trade_share_enabled: true,
    instances: [
      {
        instance: 'trade-relay-1',
        version: '0.1.0',
        connected: true,
        state: 'connected',
        last_packet_at: now,
        last_realtime_at: now,
        counters: {
          received: 1200,
          decode_errors: 3,
          filtered_out: 1100,
          forwarded_fill: 9,
          config_errors: 0,
        },
        last_error: null,
        applied_reconnect: 2,
        applied_restart: 0,
        started_at: now,
        reported_at: now,
      },
    ],
    today: { accepted: 40, not_shared: 7 },
    ...overrides,
  }
}

function renderTab(agent = monitorFixture) {
  return renderWithProviders(
    <>
      <RelayTab />
      <Toaster />
    </>,
    agent,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RelayTab', () => {
  it('shows the instance status, counters, and which commands are done', async () => {
    vi.mocked(relayApi.get).mockResolvedValue(view())
    renderTab(operator)

    expect(await screen.findByText('trade-relay-1')).toBeInTheDocument()
    expect(screen.getByText('Terhubung')).toBeInTheDocument()
    expect(screen.getByText('Tersambung ke iProxy')).toBeInTheDocument()
    expect(screen.getByText('Paket diterima')).toBeInTheDocument()
    expect(screen.getByText('Disaring, rekening tidak diproses')).toBeInTheDocument()
    expect(screen.getByText('Fill diteruskan')).toBeInTheDocument()
    expect(screen.getByText('Gagal menarik config')).toBeInTheDocument()
    expect(screen.getByText('Dibuang, rekening tidak dibagikan')).toBeInTheDocument()
    expect(screen.getByText(/Sambung ulang \(generasi 2\): selesai/)).toBeInTheDocument()
    expect(screen.getByText(/Restart \(generasi 1\): menunggu relay/)).toBeInTheDocument()
  })

  it('keeps configuration, AES, and owner notifications away from relay operators', async () => {
    vi.mocked(relayApi.get).mockResolvedValue(view())
    renderTab(operator)

    await screen.findByText('trade-relay-1')
    expect(screen.getByRole('button', { name: 'Sambung ulang' })).toBeEnabled()
    expect(screen.queryByText('Enkripsi AES')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Alamat iProxy')).not.toBeInTheDocument()
    expect(screen.getByText(/hanya bisa diubah Super Admin/)).toBeInTheDocument()
  })

  it('sends a command with a reason and explains the one-minute limit', async () => {
    const user = userEvent.setup()
    vi.mocked(relayApi.get).mockResolvedValue(view())
    vi.mocked(relayApi.command).mockRejectedValue(
      new ApiError('command_rate_limited', 'Tunggu satu menit sebelum perintah berikutnya', 429),
    )
    renderTab(operator)

    await user.click(await screen.findByRole('button', { name: 'Restart' }))
    const confirm = await screen.findByRole('dialog', { name: 'Restart relay?' })
    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'Relay macet')
    await user.click(within(confirm).getByRole('button', { name: 'Restart' }))

    await waitFor(() => expect(relayApi.command).toHaveBeenCalledWith('restart', 'Relay macet'))
    expect(
      await findToast('Tunggu satu menit sebelum mengirim perintah relay berikutnya.'),
    ).toBeInTheDocument()
  })

  it('disables commands during the cooldown', async () => {
    vi.mocked(relayApi.get).mockResolvedValue(view({ last_command_at: new Date().toISOString() }))
    renderTab(operator)

    expect(await screen.findByRole('button', { name: 'Sambung ulang' })).toBeDisabled()
    expect(screen.getByText(/Perintah berikutnya bisa dalam \d+ detik/)).toBeInTheDocument()
  })

  it('points Super Admins to Pengaturan for the connection, AES key, and owner notifications', async () => {
    vi.mocked(relayApi.get).mockResolvedValue(view())
    renderTab()

    expect(await screen.findByText(/diatur di Pengaturan → Integrasi → Relay Trade/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buka pengaturan relay' })).toHaveAttribute(
      'href',
      '/settings?section=tradeRelay',
    )
    expect(screen.queryByLabelText('Kunci AES')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Host')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})
