import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { messageFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { conversationApi } from '../api'
import { MessageBubble } from './message-bubble'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    conversationApi: {
      ...actual.conversationApi,
      signedUrl: vi.fn((path: string, bucket: string) =>
        Promise.resolve(`https://cs.test/${bucket}/${path}`),
      ),
    },
  }
})

describe('MessageBubble', () => {
  it('renders legacy card and unknown kinds as plain text', () => {
    renderWithProviders(
      <>
        <MessageBubble
          message={messageFixture({
            id: 'c1',
            kind: 'card',
            body: 'Order ORD-20261030-88412',
            payload: { card: 'order', ref: 'ORD-20261030-88412' },
            sender_role: 'agent',
          })}
          staff
          first
          last
          read={false}
          trustedHost={() => false}
        />
        <MessageBubble
          message={messageFixture({ id: 'u1', kind: 'sticker', body: 'Terima kasih kak' })}
          staff={false}
          first
          last
          read={false}
          trustedHost={() => false}
        />
      </>,
    )
    expect(screen.getByText('Order ORD-20261030-88412')).toBeInTheDocument()
    expect(screen.getByText('Terima kasih kak')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows PDFs as a file card that opens in a new tab', async () => {
    renderWithProviders(
      <MessageBubble
        message={messageFixture({
          id: 'd1',
          body: 'Bukti transfer',
          attachments: [
            {
              bucket: 'cs-documents',
              path: 'rooms/r1/u1/a.pdf',
              mime: 'application/pdf',
              name: 'Bukti Transfer.pdf',
              size: 182000,
            },
          ],
        })}
        staff={false}
        first
        last
        read={false}
        trustedHost={() => false}
      />,
    )
    const link = await screen.findByRole('link', { name: 'Buka Bukti Transfer.pdf' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    await vi.waitFor(() =>
      expect(link).toHaveAttribute('href', 'https://cs.test/cs-documents/rooms/r1/u1/a.pdf'),
    )
    expect(screen.getByText('PDF · 178 KB')).toBeInTheDocument()
    expect(conversationApi.signedUrl).toHaveBeenCalledWith('rooms/r1/u1/a.pdf', 'cs-documents')
  })

  it('turns https links in the text into links, asks before opening an unknown site, and leaves http as text', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = userEvent.setup()
    renderWithProviders(
      <MessageBubble
        message={messageFixture({
          body: 'Kalo connect ke MME bisa pake koneksi ini https://greenvest.evergreensekuritas.co.id:29001. Panduan: https://help.olt.test/akun, lama http://old.olt.test',
          sender_role: 'agent',
        })}
        staff
        first
        last
        read={false}
        trustedHost={(host) => host === 'help.olt.test'}
      />,
    )

    expect(screen.getByText(/Kalo connect ke MME/)).toBeInTheDocument()
    const mme = screen.getByRole('link', { name: 'https://greenvest.evergreensekuritas.co.id:29001' })
    expect(mme).toHaveAttribute('href', 'https://greenvest.evergreensekuritas.co.id:29001')
    expect(mme).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'https://help.olt.test/akun' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /old\.olt\.test/ })).not.toBeInTheDocument()
    expect(screen.getByText(/lama http:\/\/old\.olt\.test/)).toBeInTheDocument()

    await user.click(mme)
    expect(await screen.findByRole('alertdialog', { name: 'Buka tautan luar?' })).toBeInTheDocument()
    expect(open).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Buka tautan' }))
    expect(open).toHaveBeenCalledWith(
      'https://greenvest.evergreensekuritas.co.id:29001',
      '_blank',
      'noopener,noreferrer',
    )
    open.mockRestore()
  })

  it('makes emails mailto links, phone numbers tel links and www addresses guarded links', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <MessageBubble
        message={messageFixture({
          body: 'Email cs@olt.test, telepon 0812-3456-7890, situs www.olt.co.id',
          sender_role: 'customer',
        })}
        staff={false}
        first
        last
        read={false}
        trustedHost={() => false}
      />,
    )

    expect(screen.getByRole('link', { name: 'cs@olt.test' })).toHaveAttribute('href', 'mailto:cs@olt.test')
    expect(screen.getByRole('link', { name: '0812-3456-7890' })).toHaveAttribute('href', 'tel:081234567890')
    const site = screen.getByRole('link', { name: 'www.olt.co.id' })
    expect(site).toHaveAttribute('href', 'https://www.olt.co.id')
    await user.click(site)
    expect(await screen.findByRole('alertdialog', { name: 'Buka tautan luar?' })).toBeInTheDocument()
  })
})
