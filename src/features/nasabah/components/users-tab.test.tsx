import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agentFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { nasabahApi } from '../api'
import type { Duplicates, OnlineUser } from '../types'
import { UsersTab } from './users-tab'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    nasabahApi: { ...actual.nasabahApi, users: vi.fn(), duplicates: vi.fn(), linkedAccounts: vi.fn() },
  }
})

const user = (LoginId: string, Email: string, PhoneNumber: string): OnlineUser => ({
  LoginId,
  LoginType: 1,
  Email,
  Status: 1,
  ErrorPwdRetry: 0,
  ErrorPinRetry: 0,
  AccountExpired: '',
  SalesId: '',
  Permissions: 0,
  Created: '2023-11-04 16:52:00',
  BirthDate: '1990-01-01 00:00:00',
  PhoneNumber,
  IsPhoneNumberApproved: 1,
  PhoneNumberApprovedAt: '',
  IsEmailApproved: 1,
  EmailApprovedAt: '',
})

const hidayat = user('Hidayat', 'hidayat@gmail.com', '081212121212')
const hidayat2 = user('Hidayat2', 'hidayat@gmail.com', '082388623670')
const budi = user('Budi', 'budi@olt.test', '081111111111')
const zaki = user('Zaki', 'zaki@olt.test', '082388623670')

const duplicates: Duplicates = {
  email: [{ value: 'hidayat@gmail.com', loginIds: ['Hidayat', 'Hidayat2'] }],
  phone: [{ value: '082388623670', loginIds: ['Hidayat2', 'Zaki'] }],
  users: [hidayat, hidayat2, zaki],
  scanned: 120,
  complete: true,
  checkedAt: '2026-11-07T03:00:00Z',
}

const viewer = { ...agentFixture, nasabah_permissions: ['online_user.view'] }

describe('UsersTab duplicates', () => {
  beforeEach(() => {
    vi.mocked(nasabahApi.users)
      .mockReset()
      .mockResolvedValue({ rows: [budi, hidayat, hidayat2], total: 3, page: 1, perPage: 30, totalPages: 1 })
    vi.mocked(nasabahApi.duplicates).mockReset().mockResolvedValue(duplicates)
    vi.mocked(nasabahApi.linkedAccounts).mockReset().mockResolvedValue([])
  })

  it('marks rows whose email or phone is used by another Online ID', async () => {
    renderWithProviders(<UsersTab />, viewer)

    expect(
      await screen.findByRole('img', { name: 'Data duplikat: email sama dengan Hidayat2' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Data duplikat: email sama dengan Hidayat; nomor HP sama dengan Zaki',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Budi|budi/ })).not.toBeInTheDocument()
    expect(nasabahApi.duplicates).toHaveBeenCalledTimes(1)
  })

  it('lists every duplicate across all pages when the switch is on', async () => {
    const actor = userEvent.setup()
    renderWithProviders(<UsersTab />, viewer)
    await screen.findByText('Budi')

    await actor.click(screen.getByRole('switch', { name: 'Hanya data duplikat' }))

    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('button', { name: /^Buka/ })
        .map((b) => b.textContent),
    ).toEqual(['Hidayat', 'Hidayat2', 'Zaki'])
    expect(screen.getByText(/Diperiksa dari 120 Online ID/)).toBeInTheDocument()
    expect(nasabahApi.users).toHaveBeenCalledTimes(1)
  })

  it('filters the duplicate list with the search box', async () => {
    const actor = userEvent.setup()
    renderWithProviders(<UsersTab />, viewer)
    await screen.findByText('Budi')
    await actor.click(screen.getByRole('switch', { name: 'Hanya data duplikat' }))
    await actor.type(screen.getByRole('searchbox', { name: 'Cari LoginId atau email…' }), 'zaki')

    expect(await screen.findByText('Zaki')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.queryByText('Hidayat2')).not.toBeInTheDocument())
  })

  it('says so when no email or phone is shared', async () => {
    const actor = userEvent.setup()
    vi.mocked(nasabahApi.duplicates).mockResolvedValue({ ...duplicates, email: [], phone: [], users: [] })
    renderWithProviders(<UsersTab />, viewer)
    await screen.findByText('Budi')
    await actor.click(screen.getByRole('switch', { name: 'Hanya data duplikat' }))

    expect(
      screen.getByText('Tidak ada email atau nomor HP yang dipakai lebih dari satu Online ID.'),
    ).toBeInTheDocument()
  })

  it('explains the duplicate in the detail panel', async () => {
    const actor = userEvent.setup()
    renderWithProviders(<UsersTab />, viewer)
    await actor.click(await screen.findByRole('button', { name: 'Buka Hidayat2' }))

    const panel = await screen.findByRole('region', { name: 'Data duplikat' })
    expect(within(panel).getByText('Email sama dengan Online ID: Hidayat')).toBeInTheDocument()
    expect(within(panel).getByText('Nomor HP sama dengan Online ID: Zaki')).toBeInTheDocument()
  })
})
