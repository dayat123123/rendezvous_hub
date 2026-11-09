import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as TicketsApiModule from '@/features/tickets/api'
import { ticketsApi } from '@/features/tickets/api'
import type { Ticket } from '@/features/tickets/types'
import { ApiError } from '@/lib/errors'
import { agentFixture, monitorFixture, ticketFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { dismissToasts, findToast, Toaster } from '@/test/toast'

import { ConversationHeader } from './conversation-header'

vi.mock('@/features/tickets/api', async (importOriginal) => {
  const actual = await importOriginal<typeof TicketsApiModule>()
  return {
    ...actual,
    ticketsApi: { ...actual.ticketsApi, flag: vi.fn(), topics: vi.fn(() => Promise.resolve([])) },
  }
})

function renderHeader(ticket: Ticket, { owner = true, superAdmin = false } = {}) {
  return renderWithProviders(
    <>
      <Toaster />
      <ConversationHeader
        ticket={ticket}
        meId={agentFixture.id}
        owner={owner}
        superAdmin={superAdmin}
        customerOnline={false}
        infoOpen
        busy={false}
        onToggleInfo={vi.fn()}
        onAction={vi.fn()}
        onWait={vi.fn()}
        onPriority={vi.fn()}
      />
    </>,
    superAdmin ? monitorFixture : agentFixture,
  )
}

describe('ConversationHeader flags', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.flag).mockReset()
    dismissToasts()
  })

  it('lets the owner flag a complaint with a required reason and hides a flag already set', async () => {
    const user = userEvent.setup()
    const ticket = ticketFixture({ flags: ['fraud'] })
    vi.mocked(ticketsApi.flag).mockResolvedValue({ ...ticket, flags: ['complaint', 'fraud'] })
    renderHeader(ticket)

    await user.click(screen.getByRole('button', { name: 'Aksi lainnya' }))
    expect(screen.queryByRole('menuitem', { name: 'Tandai penipuan' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Tandai pengaduan' }))

    const dialog = await screen.findByRole('dialog', { name: 'Tandai sebagai pengaduan' })
    await user.click(screen.getByRole('button', { name: 'Tandai pengaduan' }))
    expect(screen.getByLabelText('Alasan')).toHaveAttribute('aria-invalid', 'true')
    expect(ticketsApi.flag).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Alasan'), '  Nasabah keberatan atas biaya admin ')
    await user.click(screen.getByRole('button', { name: 'Tandai pengaduan' }))

    await waitFor(() =>
      expect(ticketsApi.flag).toHaveBeenCalledWith(
        ticket.id,
        'complaint',
        'Nasabah keberatan atas biaya admin',
      ),
    )
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(await findToast('Tiket ditandai sebagai pengaduan')).toBeInTheDocument()
  })

  it('offers Super Admins both flags on a handled ticket and explains a server refusal', async () => {
    const user = userEvent.setup()
    const ticket = ticketFixture({
      owner: { id: 'other', display_name: 'Bima', agent_code: 'CS02', status: 'online' },
    })
    vi.mocked(ticketsApi.flag).mockRejectedValue(
      new ApiError('already_flagged', 'Tiket sudah bertanda ini', 409),
    )
    renderHeader(ticket, { owner: false, superAdmin: true })

    await user.click(screen.getByRole('button', { name: 'Aksi lainnya' }))
    expect(screen.getByRole('menuitem', { name: 'Tandai pengaduan' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Tandai penipuan' }))
    await user.type(await screen.findByLabelText('Alasan'), 'Mengaku CS dan minta OTP')
    await user.click(screen.getByRole('button', { name: 'Tandai penipuan' }))

    expect(await findToast('Tiket sudah memiliki tanda ini.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Tandai sebagai penipuan' })).toBeInTheDocument()
  })

  it('hides flag actions on tickets that are no longer active', () => {
    renderHeader(ticketFixture({ status: 'resolved' }), { owner: false, superAdmin: true })
    expect(screen.queryByRole('button', { name: 'Aksi lainnya' })).not.toBeInTheDocument()
  })
})

describe('ConversationHeader guest badge', () => {
  it('marks guest tickets next to the customer name and leaves normal tickets unmarked', () => {
    const { unmount } = renderHeader(
      ticketFixture({ guest: { login_id: 'BUDI01', problem: 'pin', verified: false, recent_24h: 1 } }),
    )
    const heading = screen.getByRole('heading', { name: 'Budi Santoso' })
    expect(heading.parentElement).toHaveTextContent('Tamu')
    unmount()

    renderHeader(ticketFixture({ guest: null }))
    expect(screen.queryByText('Tamu')).not.toBeInTheDocument()
  })
})
