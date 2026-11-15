import type * as RouterModule from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agentFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { tradeShareApi } from '../api'
import type { TradeSharer } from '../types'
import { TradeSharePage } from './trade-share-page'

const router = vi.hoisted(() => {
  const search: { tab?: string; profile?: string } = {}
  return { navigate: vi.fn(), search }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  return { ...actual, useNavigate: () => router.navigate, useSearch: () => router.search }
})

vi.mock('../api', () => ({
  tradeShareApi: { list: vi.fn(), settings: vi.fn(), detail: vi.fn() },
}))

vi.mock('./monitoring-tab', () => ({ MonitoringTab: () => <p>monitoring-tab</p> }))

const kirana = { ...agentFixture, roles: ['compliance'], trade_permissions: ['trade_share.review'] }
const other = '99999999-9999-4999-8999-999999999999'

const pending: TradeSharer = {
  profile: {
    id: '44444444-4444-4444-8444-444444444444',
    username: 'hidayat',
    display_name: 'Hidayat',
    avatar_url: null,
    is_verified: true,
    follower_count: 10,
    created_at: '2026-09-01T00:00:00.000Z',
  },
  status: 'pending',
  pause_source: null,
  show_price: true,
  show_lot: true,
  delay_minutes: 15,
  subscribe_mode: 'auto',
  applied_at: '2026-11-14T03:00:00.000Z',
  proposed_by: other,
  proposed_by_name: 'Dewi',
  proposed_at: '2026-11-14T04:00:00.000Z',
  decided_by: null,
  decided_at: null,
  decision_reason: null,
  suspended_until: null,
  cooldown_until: null,
  accounts: 2,
  warnings: 1,
  subscribers: { active: 0, pending: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
  router.search = {}
  vi.mocked(tradeShareApi.list).mockResolvedValue([pending])
  vi.mocked(tradeShareApi.settings).mockResolvedValue([])
})

describe('TradeSharePage', () => {
  it('lists pending applications first and opens one in the detail sheet', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TradeSharePage />, kirana)

    expect(screen.getByRole('tab', { name: 'Pengajuan' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Hidayat')).toBeInTheDocument()
    expect(tradeShareApi.list).toHaveBeenCalledWith('pending', undefined, 50)
    expect(screen.getByText('Diusulkan Dewi, butuh persetujuan kedua')).toBeInTheDocument()
    expect(screen.getByText('1 peringatan')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Buka Hidayat' }))
    expect(router.navigate).toHaveBeenCalledWith({
      to: '/compliance/trade-share',
      search: { tab: 'applications', profile: pending.profile.id },
    })
  })

  it('warns when the kill switch is off and follows the tab in the search param', async () => {
    router.search = { tab: 'monitoring' }
    vi.mocked(tradeShareApi.settings).mockResolvedValue([
      {
        key: 'trade_share.enabled',
        value: false,
        description: null,
        version: 1,
        updated_at: null,
        updated_by: null,
      },
    ])
    renderWithProviders(<TradeSharePage />, kirana)

    expect(screen.getByText('monitoring-tab')).toBeVisible()
    expect(await screen.findByText(/Tombol darurat sedang mati/)).toBeInTheDocument()
  })

  it('filters the trader list by status', async () => {
    const user = userEvent.setup()
    router.search = { tab: 'traders' }
    renderWithProviders(<TradeSharePage />, kirana)

    await waitFor(() => expect(tradeShareApi.list).toHaveBeenCalledWith(null, undefined, 50))
    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(await screen.findByRole('option', { name: 'Ditangguhkan' }))
    await waitFor(() => expect(tradeShareApi.list).toHaveBeenCalledWith('suspended', undefined, 50))
  })
})
