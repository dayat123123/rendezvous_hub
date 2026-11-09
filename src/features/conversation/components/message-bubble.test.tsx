import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { messageFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { conversationApi } from '../api'
import { MessageBubble, PendingBubble } from './message-bubble'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    conversationApi: {
      ...actual.conversationApi,
      signedUrl: vi.fn((path: string, bucket: string, options?: { download?: string; expiresIn?: number }) =>
        Promise.resolve(
          `https://cs.test/${bucket}/${path}${options?.download ? `?download=${options.download}` : ''}`,
        ),
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
    expect(screen.getByRole('button', { name: 'Unduh Bukti Transfer.pdf' })).toBeVisible()
  })

  it('shows Office, CSV and text files as cards with a type icon and a download button', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const user = userEvent.setup()
    const documents = [
      ['Mutasi.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'excel', 'Excel'],
      [
        'Surat.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'word',
        'Word',
      ],
      [
        'Paparan.pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'powerpoint',
        'PowerPoint',
      ],
      ['data.csv', 'text/csv', 'csv', 'CSV'],
      ['catatan.txt', 'text/plain', 'text', 'Teks'],
    ] as const
    renderWithProviders(
      <MessageBubble
        message={messageFixture({
          id: 'd2',
          body: '',
          attachments: documents.map(([name, mime], index) => ({
            bucket: 'cs-documents',
            path: `rooms/r1/u1/f${index}.${name.split('.')[1]}`,
            mime,
            name,
            size: 2048,
          })),
        })}
        staff={false}
        first
        last
        read={false}
        trustedHost={() => false}
      />,
    )
    for (const [name, , type, label] of documents) {
      const card = screen.getByRole('group', { name })
      expect(within(card).getByText(`${label} · 2 KB`)).toBeVisible()
      expect(card.querySelector(`svg[data-type="${type}"]`)).not.toBeNull()
      expect(within(card).queryByRole('link')).not.toBeInTheDocument()
    }
    await user.click(screen.getByRole('button', { name: 'Unduh Mutasi.xlsx' }))
    await vi.waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(conversationApi.signedUrl).toHaveBeenCalledWith('rooms/r1/u1/f0.xlsx', 'cs-documents', {
      download: 'Mutasi.xlsx',
    })
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.href).toBe('https://cs.test/cs-documents/rooms/r1/u1/f0.xlsx?download=Mutasi.xlsx')
    expect(link.download).toBe('Mutasi.xlsx')
    click.mockRestore()
  })

  it('shows a video with its thumbnail and length, and plays it from a signed URL', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <MessageBubble
        message={messageFixture({
          id: 'v1',
          body: 'Ini errornya',
          attachments: [
            {
              bucket: 'cs-videos',
              path: 'rooms/r1/u1/v.mp4',
              mime: 'video/mp4',
              name: 'Rekaman layar.mp4',
              size: 3_145_728,
              duration: 65.2,
              width: 1280,
              height: 720,
              thumbnail: 'rooms/r1/u1/v.jpg',
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
    const play = screen.getByRole('button', { name: 'Putar video Rekaman layar.mp4' })
    await vi.waitFor(() =>
      expect(play.querySelector('img')).toHaveAttribute('src', 'https://cs.test/cs-videos/rooms/r1/u1/v.jpg'),
    )
    expect(within(play).getByText('1:05')).toBeVisible()
    expect(screen.getByText('Video · 1:05 · 3 MB')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Unduh Rekaman layar.mp4' })).toBeVisible()
    expect(conversationApi.signedUrl).not.toHaveBeenCalledWith('rooms/r1/u1/v.mp4', 'cs-videos', {
      expiresIn: 3600,
    })

    await user.click(play)
    const video = await screen.findByLabelText('Rekaman layar.mp4', { selector: 'video' })
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video).toHaveAttribute('src', 'https://cs.test/cs-videos/rooms/r1/u1/v.mp4')
    expect(video).toHaveAttribute('poster', 'https://cs.test/cs-videos/rooms/r1/u1/v.jpg')
    expect(conversationApi.signedUrl).toHaveBeenCalledWith('rooms/r1/u1/v.mp4', 'cs-videos', {
      expiresIn: 3600,
    })
  })

  it('says the file is being checked while a document or video uploads', () => {
    renderWithProviders(
      <PendingBubble
        pending={{
          clientId: 'p1',
          roomId: 'r1',
          ticketId: 't1',
          body: '',
          files: [
            {
              id: 'f1',
              file: new File(['x'], 'Rekaman.mov', { type: 'video/quicktime' }),
              preview: '',
            },
          ],
          replyTo: null,
          status: 'sending',
          checking: true,
          createdAt: '2026-11-09T03:00:00.000Z',
        }}
        onResend={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )
    expect(screen.getByText('Memeriksa file…')).toBeVisible()
    expect(screen.getByText('Video · 1 B')).toBeVisible()
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

  describe('swipe to reply', () => {
    function swipeBubble(onReply = vi.fn()) {
      renderWithProviders(
        <MessageBubble
          message={messageFixture({ id: 's1', body: 'Geser saya' })}
          staff={false}
          first
          last
          read={false}
          trustedHost={() => false}
          onReply={onReply}
        />,
      )
      const row = screen.getByText('Geser saya').closest('.group') as HTMLElement
      return { onReply, row }
    }

    function drag(row: HTMLElement, pointerType: string, dx: number, dy = 0) {
      fireEvent.pointerDown(row, { pointerId: 1, pointerType, isPrimary: true, clientX: 10, clientY: 10 })
      fireEvent.pointerMove(row, {
        pointerId: 1,
        pointerType,
        isPrimary: true,
        clientX: 10 + dx / 2,
        clientY: 10 + dy / 2,
      })
      fireEvent.pointerMove(row, {
        pointerId: 1,
        pointerType,
        isPrimary: true,
        clientX: 10 + dx,
        clientY: 10 + dy,
      })
    }

    it('replies after a touch swipe past the threshold and vibrates once', () => {
      const vibrate = vi.fn(() => true)
      Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate })
      const { onReply, row } = swipeBubble()
      drag(row, 'touch', 80)
      expect(screen.getByTestId('swipe-reply-indicator')).toBeInTheDocument()
      fireEvent.pointerUp(row, {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 90,
        clientY: 10,
      })
      expect(onReply).toHaveBeenCalledTimes(1)
      expect(vibrate).toHaveBeenCalledTimes(1)
      expect(screen.queryByTestId('swipe-reply-indicator')).not.toBeInTheDocument()
      Reflect.deleteProperty(navigator, 'vibrate')
    })

    it('does nothing for a short swipe, a vertical scroll or a mouse drag', () => {
      const { onReply, row } = swipeBubble()
      drag(row, 'touch', 30)
      fireEvent.pointerUp(row, { pointerId: 1, pointerType: 'touch', isPrimary: true })
      drag(row, 'touch', 20, 120)
      fireEvent.pointerUp(row, { pointerId: 1, pointerType: 'touch', isPrimary: true })
      drag(row, 'mouse', 120)
      fireEvent.pointerUp(row, { pointerId: 1, pointerType: 'mouse', isPrimary: true })
      expect(onReply).not.toHaveBeenCalled()
    })
  })
})
