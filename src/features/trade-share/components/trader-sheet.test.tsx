import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/errors'
import { agentFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { findToast, Toaster } from '@/test/toast'

import { tradeShareApi } from '../api'
import type { TradeSharerDetail } from '../types'
import { TraderSheet } from './trader-sheet'

vi.mock('../api', () => ({
  tradeShareApi: {
    detail: vi.fn(),
    decide: vi.fn(),
    suspend: vi.fn(),
    reinstate: vi.fn(),
    revoke: vi.fn(),
    subscribers: vi.fn(),
  },
}))

const kirana = {
  ...agentFixture,
  roles: ['compliance'],
  display_name: 'Kirana',
  trade_permissions: ['trade_share.review'],
}
const other = '99999999-9999-4999-8999-999999999999'
const profileId = '44444444-4444-4444-8444-444444444444'

function detail(overrides: Partial<TradeSharerDetail> = {}): TradeSharerDetail {
  return {
    profile: {
      id: profileId,
      username: 'hidayat',
      display_name: 'Hidayat',
      avatar_url: null,
      is_verified: false,
      follower_count: 1200,
      created_at: '2026-09-01T00:00:00.000Z',
    },
    status: 'pending',
    pause_source: null,
    show_price: true,
    show_lot: false,
    delay_minutes: 15,
    subscribe_mode: 'auto',
    applied_at: '2026-11-14T03:00:00.000Z',
    proposed_by: null,
    proposed_at: null,
    decided_by: null,
    decided_at: null,
    decision_reason: null,
    suspended_until: null,
    cooldown_until: null,
    accounts: 2,
    warnings: 1,
    subscribers: { active: 0, pending: 0 },
    account_review: [
      { cust_id: 'C001', state: 'active', current_state: 'active', excluded_reason: null, other_profiles: 0 },
      {
        cust_id: 'C002',
        state: 'active',
        current_state: 'shared_link',
        excluded_reason: null,
        other_profiles: 1,
      },
    ],
    eligibility: {
      eligible: false,
      checks: [
        { code: 'feature_enabled', ok: true },
        { code: 'account_age', ok: false },
      ],
      accounts: [],
      cooldown_until: null,
      terms_document: null,
    },
    sanctions: { active: false, last_365_days: 1 },
    events: [
      {
        id: 1,
        action: 'applied',
        actor_kind: 'user',
        actor_id: profileId,
        from_status: null,
        to_status: 'pending',
        reason: null,
        details: {},
        created_at: '2026-11-14T03:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

function renderSheet(agent = kirana) {
  return renderWithProviders(
    <>
      <TraderSheet profile={profileId} onClose={vi.fn()} />
      <Toaster />
    </>,
    agent,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TraderSheet', () => {
  it('shows the review summary with account warnings, checks, sanctions, and history', async () => {
    vi.mocked(tradeShareApi.detail).mockResolvedValue(detail())
    renderSheet()

    const dialog = await screen.findByRole('dialog', { name: 'Hidayat' })
    expect(within(dialog).getByText('Menunggu peninjauan')).toBeInTheDocument()
    expect(within(dialog).getByText('Tertaut ke lebih dari satu profil aktif')).toBeInTheDocument()
    expect(within(dialog).getByText('Juga tertaut ke 1 profil lain')).toBeInTheDocument()
    expect(within(dialog).getByText('Memenuhi syarat')).toBeInTheDocument()
    expect(within(dialog).getByText('Umur akun memenuhi minimum')).toBeInTheDocument()
    expect(within(dialog).getByText('Sanksi 365 hari terakhir')).toBeInTheDocument()
    expect(within(dialog).getByText('Mengajukan')).toBeInTheDocument()
    expect(within(dialog).getByText('Disembunyikan')).toBeInTheDocument()
    expect(tradeShareApi.subscribers).not.toHaveBeenCalled()
  })

  it('records a first four-eyes approval as a proposal and waits for a second staff member', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.detail).mockResolvedValue(detail())
    vi.mocked(tradeShareApi.decide).mockResolvedValue(
      detail({ proposed_by: kirana.id, proposed_at: '2026-11-15T03:00:00.000Z' }),
    )
    renderSheet()

    await user.click(await screen.findByRole('button', { name: 'Setujui' }))
    const confirm = await screen.findByRole('dialog', { name: 'Setujui Hidayat?' })
    await user.click(within(confirm).getByRole('button', { name: 'Setujui' }))

    await waitFor(() => expect(tradeShareApi.decide).toHaveBeenCalledWith(profileId, 'approve', ''))
    expect(await findToast(/Menunggu persetujuan staf kedua/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Menunggu persetujuan staf kedua' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument()
  })

  it('offers the second approval and names the staff member who proposed it', async () => {
    vi.mocked(tradeShareApi.detail).mockResolvedValue(
      detail({
        proposed_by: other,
        proposed_by_name: 'Dewi',
        proposed_at: '2026-11-15T02:00:00.000Z',
        events: [
          {
            id: 2,
            action: 'approval_proposed',
            actor_kind: 'staff',
            actor_id: other,
            actor_name: 'Dewi',
            from_status: 'pending',
            to_status: 'pending',
            reason: null,
            details: {},
            created_at: '2026-11-15T02:00:00.000Z',
          },
        ],
      }),
    )
    renderSheet()

    expect(await screen.findByRole('button', { name: 'Setujui (persetujuan kedua)' })).toBeEnabled()
    expect(
      screen.getByText(/^Dewi mengusulkan persetujuan pada .+ Persetujuan Anda menjadi persetujuan kedua/),
    ).toBeInTheDocument()
    expect(screen.getByText('Persetujuan diusulkan').parentElement).toHaveTextContent('Dewi')
  })

  it('shows who decided, saying Anda for the current agent', async () => {
    vi.mocked(tradeShareApi.detail).mockResolvedValue(
      detail({
        status: 'active',
        decided_by: kirana.id,
        decided_by_name: 'Kirana',
        decided_at: '2026-11-15T02:00:00.000Z',
        events: [
          {
            id: 3,
            action: 'approved',
            actor_kind: 'staff',
            actor_id: other,
            actor_name: null,
            from_status: 'pending',
            to_status: 'active',
            reason: null,
            details: {},
            created_at: '2026-11-15T02:00:00.000Z',
          },
        ],
      }),
    )
    renderSheet()

    expect((await screen.findByText('Diputuskan oleh')).nextElementSibling).toHaveTextContent('Anda')
    expect(screen.getByText('Disetujui').parentElement).toHaveTextContent('Staf')
  })

  it('requires a reason before rejecting', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.detail).mockResolvedValue(detail())
    vi.mocked(tradeShareApi.decide).mockResolvedValue(
      detail({ status: 'rejected', decision_reason: 'Rekening ganda' }),
    )
    renderSheet()

    await user.click(await screen.findByRole('button', { name: 'Tolak' }))
    const confirm = await screen.findByRole('dialog', { name: 'Tolak pengajuan Hidayat?' })
    await user.click(within(confirm).getByRole('button', { name: 'Tolak' }))
    expect(tradeShareApi.decide).not.toHaveBeenCalled()

    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'Rekening ganda')
    await user.click(within(confirm).getByRole('button', { name: 'Tolak' }))
    await waitFor(() =>
      expect(tradeShareApi.decide).toHaveBeenCalledWith(profileId, 'reject', 'Rekening ganda'),
    )
  })

  it('suspends an active trader with an optional end time and explains server refusals', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.detail).mockResolvedValue(detail({ status: 'active' }))
    vi.mocked(tradeShareApi.suspend).mockRejectedValueOnce(new ApiError('not_active', 'x', 409))
    renderSheet()

    await user.click(await screen.findByRole('button', { name: 'Tangguhkan' }))
    const confirm = await screen.findByRole('dialog', { name: 'Tangguhkan Hidayat?' })
    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'Pola beli jual cepat')
    await user.click(within(confirm).getByRole('button', { name: 'Tangguhkan' }))

    await waitFor(() =>
      expect(tradeShareApi.suspend).toHaveBeenCalledWith(profileId, 'Pola beli jual cepat', null),
    )
    expect(await findToast('Trader tidak sedang aktif.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Tangguhkan Hidayat?' })).toBeInTheDocument()
  })

  it('shows no actions to staff without the review permission', async () => {
    vi.mocked(tradeShareApi.detail).mockResolvedValue(detail())
    renderSheet({ ...kirana, trade_permissions: ['trade_share.manage'] })

    await screen.findByRole('dialog', { name: 'Hidayat' })
    expect(screen.queryByRole('button', { name: 'Setujui' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tolak' })).not.toBeInTheDocument()
  })

  it('loads subscribers only on request because viewing them is audited', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.detail).mockResolvedValue(
      detail({ status: 'active', subscribers: { active: 1, pending: 0 } }),
    )
    vi.mocked(tradeShareApi.subscribers).mockResolvedValue([
      {
        subscriber: {
          id: other,
          username: 'sari',
          display_name: 'Sari',
          avatar_url: null,
          is_verified: false,
          follower_count: 0,
          created_at: null,
        },
        status: 'active',
        muted: true,
        requested_at: '2026-11-14T05:00:00.000Z',
        decided_at: '2026-11-14T05:00:00.000Z',
        expires_at: null,
        ended_at: null,
        end_reason: null,
      },
    ])
    renderSheet()

    await user.click(await screen.findByRole('button', { name: 'Tampilkan pelanggan' }))
    expect(await screen.findByText('Sari')).toBeInTheDocument()
    expect(tradeShareApi.subscribers).toHaveBeenCalledWith(profileId, 'active', undefined, 50)
    expect(screen.getByText(/dibisukan/)).toBeInTheDocument()
  })
})
