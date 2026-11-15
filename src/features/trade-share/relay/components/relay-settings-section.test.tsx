import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/errors'
import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { findToast, Toaster } from '@/test/toast'

import { relayApi } from '../api'
import type { RelayView } from '../types'
import { RelaySettingsSection } from './relay-settings-section'

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
    reconnect_generation: 0,
    restart_generation: 0,
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
        counters: {},
        last_error: null,
        applied_reconnect: 0,
        applied_restart: 0,
        started_at: now,
        reported_at: now,
      },
    ],
    today: {},
    ...overrides,
  }
}

function renderSection() {
  return renderWithProviders(
    <>
      <RelaySettingsSection />
      <Toaster />
    </>,
    monitorFixture,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RelaySettingsSection', () => {
  it('splits the stored address into host and port and shows the live relay status beside it', async () => {
    vi.mocked(relayApi.get).mockResolvedValue(view())
    renderSection()

    expect(await screen.findByLabelText('Host')).toHaveValue('10.0.0.5')
    expect(screen.getByLabelText('Port')).toHaveValue('9990')
    expect(screen.getByLabelText('Identity')).toHaveValue('social_trade_relay')
    expect(screen.getByLabelText('Heartbeat (detik)')).toHaveValue('4')
    expect(screen.getByText('tcp://10.0.0.5:9990')).toBeInTheDocument()

    const live = screen.getByRole('complementary', { name: 'Status relay saat ini' })
    expect(within(live).getByText('Terhubung')).toBeInTheDocument()
    expect(within(live).getByText('Tersambung ke iProxy')).toBeInTheDocument()
    expect(within(live).getByText('Relay sudah melapor setelah config versi 5 disimpan.')).toBeInTheDocument()
  })

  it('validates host and port, previews the address, and saves it as tcp://host:port with a reason', async () => {
    const user = userEvent.setup()
    vi.mocked(relayApi.get).mockResolvedValue(view())
    const before = view().instances[0]!
    vi.mocked(relayApi.update).mockResolvedValue(
      view({
        iproxy_addr: 'tcp://olt-uat.local:9991',
        version: 6,
        updated_at: new Date().toISOString(),
        instances: [{ ...before, reported_at: new Date(Date.now() - 10_000).toISOString() }],
      }),
    )
    renderSection()

    const host = await screen.findByLabelText('Host')
    const port = screen.getByLabelText('Port')
    await user.clear(host)
    await user.type(host, 'olt uat')
    await user.clear(port)
    await user.type(port, '70000')
    expect(screen.getByText(/Host 1–253 karakter/)).toBeInTheDocument()
    expect(screen.getByText('Port harus 1–65535.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.clear(host)
    await user.type(host, 'olt-uat.local')
    await user.clear(port)
    await user.type(port, '9991')
    expect(screen.getByText('tcp://olt-uat.local:9991')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    const confirm = await screen.findByRole('dialog', { name: 'Simpan konfigurasi relay?' })
    expect(confirm).toHaveTextContent('tcp://olt-uat.local:9991')
    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'Pindah ke UAT')
    await user.click(within(confirm).getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(relayApi.update).toHaveBeenCalledWith(
        { iproxyAddr: 'tcp://olt-uat.local:9991', identity: 'social_trade_relay', heartbeatSeconds: 4 },
        'Pindah ke UAT',
      ),
    )
    expect(await findToast('Konfigurasi relay disimpan')).toBeInTheDocument()
    expect(
      await screen.findByText('Menunggu relay memuat config versi 6 (biasanya kurang dari 30 detik).'),
    ).toBeInTheDocument()
  })

  it('disconnects the relay by saving an empty address after a confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(relayApi.get).mockResolvedValue(view({ heartbeat_seconds: 6, identity: 'relay_b' }))
    vi.mocked(relayApi.update).mockResolvedValue(view({ iproxy_addr: null, version: 6 }))
    renderSection()

    await user.click(await screen.findByRole('button', { name: 'Putuskan relay' }))
    const confirm = await screen.findByRole('dialog', { name: 'Putuskan relay dari iProxy?' })
    await user.click(within(confirm).getByRole('button', { name: 'Putuskan relay' }))
    expect(relayApi.update).not.toHaveBeenCalled()

    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'Pensiun sementara')
    await user.click(within(confirm).getByRole('button', { name: 'Putuskan relay' }))
    await waitFor(() =>
      expect(relayApi.update).toHaveBeenCalledWith(
        { iproxyAddr: '', identity: 'relay_b', heartbeatSeconds: 6 },
        'Pensiun sementara',
      ),
    )
    expect(await screen.findByText('Relay belum diarahkan ke iProxy.')).toBeInTheDocument()
    expect(screen.getByLabelText('Host')).toHaveValue('')
  })

  it('explains server refusals of the connection settings', async () => {
    const user = userEvent.setup()
    vi.mocked(relayApi.get).mockResolvedValue(view())
    vi.mocked(relayApi.update).mockRejectedValue(new ApiError('invalid_identity', 'x', 400))
    renderSection()

    const identity = await screen.findByLabelText('Identity')
    await user.clear(identity)
    await user.type(identity, 'relay_c')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    const confirm = await screen.findByRole('dialog', { name: 'Simpan konfigurasi relay?' })
    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'Ganti identity')
    await user.click(within(confirm).getByRole('button', { name: 'Simpan' }))

    expect(await findToast(/Identity 3–63 karakter/)).toBeInTheDocument()
  })

  it('names who last changed the configuration', async () => {
    vi.mocked(relayApi.get).mockResolvedValue(
      view({ updated_by: '99999999-9999-4999-8999-999999999999', updated_by_name: 'Adi' }),
    )
    renderSection()

    expect(await screen.findByText(/Versi config 5 · diubah .+ oleh Adi/)).toBeInTheDocument()
  })

  it('shows only the AES fingerprint and writes a new key from password fields', async () => {
    const user = userEvent.setup()
    vi.mocked(relayApi.get).mockResolvedValue(view())
    vi.mocked(relayApi.setAes).mockResolvedValue(view())
    renderSection()

    expect(await screen.findByText('a1b2c3d4')).toBeInTheDocument()
    const key = screen.getByLabelText('Kunci AES')
    const iv = screen.getByLabelText('IV')
    expect(key).toHaveAttribute('type', 'password')
    expect(key).toHaveValue('')
    expect(iv).toHaveAttribute('type', 'password')

    await user.type(key, 'short')
    await user.click(screen.getByRole('button', { name: 'Ganti kunci' }))
    expect(screen.getByText(/Kunci harus 16, 24, atau 32 karakter/)).toBeInTheDocument()

    await user.clear(key)
    await user.type(key, 'K'.repeat(32))
    await user.type(iv, 'I'.repeat(16))
    await user.click(screen.getByRole('button', { name: 'Ganti kunci' }))
    const confirm = await screen.findByRole('dialog', { name: 'Simpan kunci AES?' })
    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'Rotasi kunci')
    await user.click(within(confirm).getByRole('button', { name: 'Simpan kunci' }))

    await waitFor(() =>
      expect(relayApi.setAes).toHaveBeenCalledWith(
        { mode: 'cbc', key: 'K'.repeat(32), iv: 'I'.repeat(16) },
        'Rotasi kunci',
      ),
    )
    await waitFor(() => expect(screen.getByLabelText('Kunci AES')).toHaveValue(''))
  })

  it('warns about duplicate pushes before turning on owner notifications', async () => {
    const user = userEvent.setup()
    vi.mocked(relayApi.get).mockResolvedValue(view())
    vi.mocked(relayApi.setNotify).mockResolvedValue(view({ trade_notify_enabled: true }))
    renderSection()

    expect(await screen.findByText(/notifEngine OLT mungkin sudah mengirim/)).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Notifikasi trade ke pemilik order' }))
    const confirm = await screen.findByRole('dialog', { name: 'Nyalakan notifikasi trade ke pemilik order?' })
    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'OLT sudah mematikan')
    await user.click(within(confirm).getByRole('button', { name: 'Nyalakan' }))

    await waitFor(() => expect(relayApi.setNotify).toHaveBeenCalledWith(true, 'OLT sudah mematikan'))
  })
})
