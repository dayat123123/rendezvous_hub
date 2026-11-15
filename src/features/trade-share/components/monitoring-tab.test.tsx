import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadText } from '@/lib/download'
import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { Toaster } from '@/test/toast'

import { tradeShareApi } from '../api'
import type { TradeDashboard, TradeFlag } from '../types'
import { MonitoringTab } from './monitoring-tab'

vi.mock('../api', () => ({
  tradeShareApi: { dashboard: vi.fn(), flags: vi.fn(), reviewFlag: vi.fn(), exportCsv: vi.fn() },
}))

vi.mock('@/lib/download', () => ({ downloadText: vi.fn() }))

const dashboard: TradeDashboard = {
  enabled: true,
  pilot_only: true,
  traders: { active: 3, pending: 2 },
  subscriptions: { active: 40, pending: 5, muted: 2 },
  activities_today: 12,
  activities_7d: 80,
  deliveries_today: { recipients: 300, pushed: 250, capped: 4 },
  pending_orders: 6,
  open_flags: 1,
  relay_today: { accepted: 120, stock_excluded: 3 },
  relay_health: [
    {
      key: 'trade_relay:silent',
      severity: 'warning',
      title: 'Relay trade tidak menerima paket',
      detail: null,
    },
  ],
  top_traders: [],
}

const flag: TradeFlag = {
  id: 7,
  profile: {
    id: '44444444-4444-4444-8444-444444444444',
    username: 'hidayat',
    display_name: 'Hidayat',
    avatar_url: null,
    is_verified: false,
    follower_count: 0,
    created_at: null,
  },
  kind: 'quick_flip',
  details: { stock: 'GOTO', minutes: 12 },
  created_at: '2026-11-15T02:00:00.000Z',
  reviewed_by: null,
  reviewed_at: null,
  note: null,
}

function renderTab(agent = monitorFixture, onOpen = vi.fn()) {
  return renderWithProviders(
    <>
      <MonitoringTab onOpen={onOpen} />
      <Toaster />
    </>,
    agent,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tradeShareApi.dashboard).mockResolvedValue(dashboard)
  vi.mocked(tradeShareApi.flags).mockResolvedValue([flag])
})

describe('MonitoringTab', () => {
  it('shows the dashboard cards, relay health, and open flags', async () => {
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderTab(monitorFixture, onOpen)

    expect(await screen.findByText('Trader aktif')).toBeInTheDocument()
    expect(screen.getByText('Hanya undangan pilot')).toBeInTheDocument()
    expect(screen.getByText('250 push · 4 kena batas')).toBeInTheDocument()
    expect(screen.getByText('Relay trade tidak menerima paket')).toBeInTheDocument()
    expect(screen.getByText('Dibuang, saham dikecualikan')).toBeInTheDocument()
    expect(await screen.findByText('$GOTO dibeli lalu dijual dalam 12 menit')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Hidayat/ }))
    expect(onOpen).toHaveBeenCalledWith(flag.profile?.id)
  })

  it('requires a note to mark a flag reviewed', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.reviewFlag).mockResolvedValue([])
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Tandai ditinjau' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tandai penanda sudah ditinjau' })
    await user.click(within(dialog).getByRole('button', { name: 'Tandai ditinjau' }))
    expect(tradeShareApi.reviewFlag).not.toHaveBeenCalled()

    await user.type(
      within(dialog).getByRole('textbox', { name: 'Catatan peninjauan' }),
      'Saham likuid, wajar',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Tandai ditinjau' }))
    await waitFor(() => expect(tradeShareApi.reviewFlag).toHaveBeenCalledWith(7, 'Saham likuid, wajar'))
  })

  it('shows who reviewed a flag and the note', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.flags).mockImplementation((status) =>
      Promise.resolve(
        status === 'reviewed'
          ? [
              {
                ...flag,
                reviewed_by: '99999999-9999-4999-8999-999999999999',
                reviewed_by_name: 'Dewi',
                reviewed_at: '2026-11-15T03:00:00.000Z',
                note: 'Wajar',
              },
            ]
          : [],
      ),
    )
    renderTab()

    await user.click(await screen.findByText('Sudah ditinjau'))
    expect(await screen.findByText(/^Ditinjau Dewi · .+: Wajar$/)).toBeInTheDocument()
    expect(tradeShareApi.flags).toHaveBeenCalledWith('reviewed', 200)
  })

  it('downloads the CSV export for managers', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.exportCsv).mockResolvedValue({
      filename: 'berbagi-trade-2026-11-09-2026-11-15.csv',
      rows: 2,
      csv: 'waktu_wib,trader\n"2026-11-15 10:00:00","hidayat"',
    })
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Unduh CSV' }))
    await waitFor(() => expect(downloadText).toHaveBeenCalled())
    const [name, content, type] = vi.mocked(downloadText).mock.calls[0]!
    expect(name).toBe('berbagi-trade-2026-11-09-2026-11-15.csv')
    expect(content.charCodeAt(0)).toBe(0xfeff)
    expect(content).toContain('waktu_wib,trader')
    expect(type).toBe('text/csv;charset=utf-8')
  })

  it('lets managers without review export but not review flags', async () => {
    renderTab({ ...agentFixture, roles: ['compliance'], trade_permissions: ['trade_share.manage'] })

    expect(await screen.findByText('$GOTO dibeli lalu dijual dalam 12 menit')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tandai ditinjau' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unduh CSV' })).toBeInTheDocument()
  })

  it('lets reviewers without manage review flags but not export', async () => {
    renderTab({ ...agentFixture, roles: ['compliance'], trade_permissions: ['trade_share.review'] })

    expect(await screen.findByRole('button', { name: 'Tandai ditinjau' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unduh CSV' })).not.toBeInTheDocument()
  })
})
