import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as TicketsApiModule from '@/features/tickets/api'
import { ticketFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { customerApi } from '../api'
import { CustomerPanel } from './customer-panel'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, customerApi: { ...actual.customerApi, history: vi.fn(), notes: vi.fn() } }
})

vi.mock('@/features/tickets/api', async (importOriginal) => {
  const actual = await importOriginal<typeof TicketsApiModule>()
  return {
    ...actual,
    ticketsApi: {
      ...actual.ticketsApi,
      topics: vi.fn(() =>
        Promise.resolve([{ code: 'order', name: 'Order & Transaksi', help_url: null, urgent: false }]),
      ),
    },
  }
})

const ticket = ticketFixture()

describe('CustomerPanel', () => {
  beforeEach(() => {
    vi.mocked(customerApi.history).mockResolvedValue([
      {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        topic: 'order',
        status: 'claimed',
        flags: [],
        created_at: '2026-10-30T02:00:00.000Z',
        resolved_at: null,
        closed_at: null,
        outcome: null,
        rating: null,
        agent: 'Rina',
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        ticket_number: 'CS-000101',
        topic: 'order',
        status: 'closed',
        flags: [],
        created_at: '2026-10-01T02:00:00.000Z',
        resolved_at: '2026-10-01T03:00:00.000Z',
        closed_at: '2026-10-02T03:00:00.000Z',
        outcome: 'answered',
        rating: 5,
        agent: 'Bima',
      },
    ])
    vi.mocked(customerApi.notes).mockResolvedValue([
      {
        id: 'n1',
        kind: 'note',
        body: 'Nasabah minta ditelepon balik',
        created_at: '2026-10-30T02:00:00.000Z',
        author: { display_name: 'Bima' },
      },
    ])
  })

  it('shows the identity from the ticket, the other tickets, and the notes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderWithProviders(<CustomerPanel ticket={ticket} />)
    const panel = screen.getByRole('complementary', { name: 'Info nasabah' })

    expect(within(panel).getByText('Budi Santoso')).toBeInTheDocument()
    expect(within(panel).getByText('@budi')).toBeInTheDocument()
    expect(
      within(panel)
        .getAllByRole('heading')
        .map((heading) => heading.textContent),
    ).toEqual(['Riwayat tiket', 'Catatan internal'])

    expect(await within(panel).findByText('CS-000101')).toBeInTheDocument()
    expect(
      await within(panel).findByText('Order & Transaksi · 1 Okt 2026 · Bima · Nilai 5/5'),
    ).toBeInTheDocument()
    expect(within(panel).queryByText(ticket.ticket_number)).not.toBeInTheDocument()
    expect(await within(panel).findByText('Nasabah minta ditelepon balik')).toBeInTheDocument()
    expect(customerApi.history).toHaveBeenCalledWith(ticket.customer?.id)
    expect(customerApi.notes).toHaveBeenCalledWith(ticket.customer?.id)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows the intake answers open and keeps the topic SOP collapsed until asked', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CustomerPanel
        ticket={ticketFixture({
          intake: [
            { key: 'order_no', type: 'text', label: 'Nomor order', value: 'ORD-77', display: 'ORD-77' },
            { key: 'channel', type: 'choice', label: 'Kanal', value: 'app', display: 'Aplikasi' },
          ],
          topic_sop: 'Minta bukti transfer.\nCek status order di back office.',
        })}
      />,
    )
    const panel = screen.getByRole('complementary', { name: 'Info nasabah' })
    expect(
      within(panel)
        .getAllByRole('heading')
        .map((heading) => heading.textContent),
    ).toEqual(['Jawaban awal nasabah', 'SOP topik', 'Riwayat tiket', 'Catatan internal'])
    expect(within(panel).getByText('Nomor order')).toBeInTheDocument()
    expect(within(panel).getByText('ORD-77')).toBeInTheDocument()
    expect(within(panel).getByText('Aplikasi')).toBeInTheDocument()
    expect(within(panel).queryByText(/Minta bukti transfer/)).not.toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'SOP topik' }))
    expect(within(panel).getByText(/Minta bukti transfer/)).toBeInTheDocument()
  })

  it('leaves the intake and SOP sections out when the topic has none', () => {
    renderWithProviders(<CustomerPanel ticket={ticketFixture({ intake: [], topic_sop: null })} />)
    expect(screen.queryByRole('button', { name: 'Jawaban awal nasabah' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'SOP topik' })).not.toBeInTheDocument()
  })

  it('labels a guest as not logged in with the claimed Login ID instead of the username', () => {
    const { unmount } = renderWithProviders(
      <CustomerPanel
        ticket={ticketFixture({
          customer: { id: 'c-guest', display_name: 'Sari', username: 'tamu_abc' },
          guest: { login_id: 'SARI01', problem: 'password', verified: false, recent_24h: 1 },
        })}
      />,
    )
    const panel = screen.getByRole('complementary', { name: 'Info nasabah' })
    expect(within(panel).getByText('Tamu (belum login)')).toBeInTheDocument()
    expect(within(panel).getByText('Login ID disebutkan: SARI01')).toBeInTheDocument()
    expect(within(panel).queryByText('@tamu_abc')).not.toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Riwayat tiket' })).not.toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Catatan internal' })).not.toBeInTheDocument()
    expect(customerApi.history).not.toHaveBeenCalled()
    expect(customerApi.notes).not.toHaveBeenCalled()
    unmount()

    renderWithProviders(
      <CustomerPanel
        ticket={ticketFixture({
          customer: { id: 'c-guest', display_name: 'Sari', username: 'tamu_abc' },
          guest: { problem: 'other', verified: false, recent_24h: 0 },
        })}
      />,
    )
    expect(screen.getByText('Login ID yang disebutkan: tidak diisi')).toBeInTheDocument()
  })
})
