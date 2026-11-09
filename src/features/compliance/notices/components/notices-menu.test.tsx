import type * as RouterModule from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTicketUi } from '@/features/tickets/hooks'
import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { noticesApi } from '../api'
import type { ComplianceNotices } from '../types'
import { ComplianceNoticesMenu } from './notices-menu'

const router = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof RouterModule>()),
  useNavigate: () => router.navigate,
}))

vi.mock('../api', () => ({ noticesApi: { list: vi.fn(), seen: vi.fn() } }))

const unseen: ComplianceNotices = {
  unseen: 1,
  last_seen_id: 3,
  items: [
    {
      id: 4,
      ticket_id: '22222222-2222-4222-8222-222222222222',
      ticket_number: 'CS-000123',
      flag: 'fraud',
      reason: 'Mengaku CS dan minta OTP',
      source: 'agent',
      actor_name: 'Rina',
      created_at: '2026-11-09T02:00:00.000Z',
      seen: false,
    },
    {
      id: 3,
      ticket_id: '55555555-5555-4555-8555-555555555555',
      ticket_number: 'CS-000101',
      flag: 'complaint',
      reason: null,
      source: 'customer',
      actor_name: null,
      created_at: '2026-11-08T02:00:00.000Z',
      seen: true,
    },
  ],
}

const compliance = { ...agentFixture, roles: ['compliance'] }

describe('ComplianceNoticesMenu', () => {
  beforeEach(() => {
    router.navigate.mockReset()
    vi.mocked(noticesApi.list).mockReset().mockResolvedValue(unseen)
    vi.mocked(noticesApi.seen)
      .mockReset()
      .mockResolvedValue({
        ...unseen,
        unseen: 0,
        last_seen_id: 4,
        items: unseen.items.map((item) => ({ ...item, seen: true })),
      })
  })

  it('marks notices seen when opened and links compliance staff to the case', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ComplianceNoticesMenu />, compliance)

    await user.click(await screen.findByRole('button', { name: '1 kasus baru belum dilihat' }))
    expect(await screen.findByText('Mengaku CS dan minta OTP')).toBeInTheDocument()
    expect(screen.getByText('Ditandai oleh Rina')).toBeInTheDocument()
    expect(screen.getByText('Dari nasabah')).toBeInTheDocument()
    await waitFor(() => expect(noticesApi.seen).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: 'Kasus baru' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /CS-000123/ }))
    expect(router.navigate).toHaveBeenCalledWith({
      to: '/compliance/cases',
      search: { case: '22222222-2222-4222-8222-222222222222' },
    })
  })

  it('opens the ticket for Super Admins and does not mark anything when all is seen', async () => {
    const user = userEvent.setup()
    vi.mocked(noticesApi.list).mockResolvedValue({ ...unseen, unseen: 0 })
    renderWithProviders(<ComplianceNoticesMenu />, monitorFixture)

    await user.click(await screen.findByRole('button', { name: 'Kasus baru' }))
    await user.click(await screen.findByRole('button', { name: /CS-000101/ }))

    expect(noticesApi.seen).not.toHaveBeenCalled()
    expect(useTicketUi.getState().selectedId).toBe('55555555-5555-4555-8555-555555555555')
    expect(router.navigate).toHaveBeenCalledWith({ to: '/' })
  })
})
