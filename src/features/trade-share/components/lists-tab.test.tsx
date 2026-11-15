import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { Toaster } from '@/test/toast'

import { tradeShareApi } from '../api'
import { ListsTab } from './lists-tab'

vi.mock('../api', () => ({
  tradeShareApi: {
    excludedAccounts: vi.fn(),
    excludeAccount: vi.fn(),
    unexcludeAccount: vi.fn(),
    excludedStocks: vi.fn(),
    excludeStock: vi.fn(),
    unexcludeStock: vi.fn(),
    pilotInvites: vi.fn(),
    setPilotInvite: vi.fn(),
    findProfiles: vi.fn(),
  },
}))

const profileId = '44444444-4444-4444-8444-444444444444'
const otherId = '55555555-5555-4555-8555-555555555555'
const profile = {
  id: profileId,
  username: 'x',
  display_name: null,
  avatar_url: null,
  is_verified: false,
  follower_count: 0,
  created_at: null,
}

function renderTab(agent = monitorFixture) {
  return renderWithProviders(
    <>
      <ListsTab />
      <Toaster />
    </>,
    agent,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tradeShareApi.excludedAccounts).mockResolvedValue([
    {
      cust_id: 'EMP01',
      reason: 'Karyawan',
      created_by: 'x',
      created_by_name: 'Dewi',
      created_at: '2026-11-10T03:00:00.000Z',
    },
  ])
  vi.mocked(tradeShareApi.excludedStocks).mockResolvedValue([
    {
      stock: 'GOTO',
      reason: 'Papan pemantauan khusus',
      until: null,
      active: true,
      created_by: 'x',
      created_by_name: 'Raka',
      created_at: '2026-11-10T03:00:00.000Z',
    },
  ])
  vi.mocked(tradeShareApi.pilotInvites).mockResolvedValue([])
})

describe('ListsTab', () => {
  it('shows which staff member added each entry', async () => {
    renderTab()

    expect(await screen.findByText(/· Dewi$/)).toBeInTheDocument()
    expect(await screen.findByText('Oleh Raka')).toBeInTheDocument()
  })

  it('excludes an account with a normalized number and a reason', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.excludeAccount).mockResolvedValue([])
    renderTab()

    expect(await screen.findByText('EMP01')).toBeInTheDocument()
    const form = screen.getByRole('region', { name: 'Rekening dikecualikan' })
    await user.type(within(form).getByRole('textbox', { name: 'Nomor rekening' }), ' sls 9')
    await user.click(within(form).getByRole('button', { name: 'Kecualikan' }))
    expect(within(form).getByText(/Nomor rekening 1–32 karakter/)).toBeInTheDocument()
    expect(tradeShareApi.excludeAccount).not.toHaveBeenCalled()

    await user.clear(within(form).getByRole('textbox', { name: 'Nomor rekening' }))
    await user.type(within(form).getByRole('textbox', { name: 'Nomor rekening' }), 'sls09')
    await user.type(within(form).getByRole('textbox', { name: 'Alasan' }), 'Rekening sales')
    await user.click(within(form).getByRole('button', { name: 'Kecualikan' }))
    await waitFor(() => expect(tradeShareApi.excludeAccount).toHaveBeenCalledWith('SLS09', 'Rekening sales'))
  })

  it('removes an excluded stock only with a reason', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.unexcludeStock).mockResolvedValue([])
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Hapus GOTO' }))
    const dialog = await screen.findByRole('dialog', { name: 'Hapus GOTO dari daftar dikecualikan?' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Alasan' }), 'UMA dicabut')
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))
    await waitFor(() => expect(tradeShareApi.unexcludeStock).toHaveBeenCalledWith('GOTO', 'UMA dicabut'))
  })

  it('finds pilot profiles through the trade profile search and invites them', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.findProfiles).mockResolvedValue([
      {
        profile: { ...profile, id: profileId, username: 'hidayat', display_name: 'Hidayat' },
        trader_status: null,
        pilot_invited: false,
        linked_accounts: 2,
      },
      {
        profile: { ...profile, id: otherId, username: 'hidayati', display_name: 'Hidayati' },
        trader_status: 'active',
        pilot_invited: true,
        linked_accounts: 1,
      },
    ])
    vi.mocked(tradeShareApi.setPilotInvite).mockResolvedValue([])
    renderTab({ ...agentFixture, roles: ['compliance'], trade_permissions: ['trade_share.manage'] })

    await user.type(await screen.findByRole('searchbox', { name: 'Cari profil untuk diundang' }), '@hida')
    expect(await screen.findByText('2 rekening tertaut')).toBeInTheDocument()
    expect(screen.getByText('Sudah diundang')).toBeInTheDocument()
    expect(screen.getByText('Aktif')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undang Hidayati' })).not.toBeInTheDocument()
    expect(tradeShareApi.findProfiles).toHaveBeenCalledWith('hida')

    await user.click(screen.getByRole('button', { name: 'Undang Hidayat' }))
    await waitFor(() => expect(tradeShareApi.setPilotInvite).toHaveBeenCalledWith(profileId, true))
  })

  it('does not search until 2 characters are typed', async () => {
    const user = userEvent.setup()
    vi.mocked(tradeShareApi.findProfiles).mockResolvedValue([])
    renderTab()

    await user.type(await screen.findByRole('searchbox', { name: 'Cari profil untuk diundang' }), 'h')
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    expect(tradeShareApi.findProfiles).not.toHaveBeenCalled()
    await user.type(screen.getByRole('searchbox', { name: 'Cari profil untuk diundang' }), 'x')
    expect(await screen.findByText('Tidak ada profil yang cocok.')).toBeInTheDocument()
  })

  it('is read-only for reviewers', async () => {
    renderTab({ ...agentFixture, roles: ['compliance'], trade_permissions: ['trade_share.review'] })

    expect(await screen.findByText('EMP01')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kecualikan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus EMP01' })).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})
