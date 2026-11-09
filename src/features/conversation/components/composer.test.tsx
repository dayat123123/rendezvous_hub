import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/features/auth/hooks'
import type * as PresenceApiModule from '@/features/presence/api'
import { presenceApi } from '@/features/presence/api'
import type { AgentProfile } from '@/features/presence/types'
import { agentFixture, attachmentPolicyFixture, messageFixture, ticketFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { dismissToasts, findToast, Toaster } from '@/test/toast'

import type * as FaqApiModule from '@/features/faq/api'
import { faqApi } from '@/features/faq/api'

import type * as ApiModule from '../api'
import { conversationApi } from '../api'
import type { SendRequest } from '../hooks'
import type { SendResult } from '../types'
import { Composer } from './composer'

vi.mock('@/features/presence/api', async (importOriginal) => {
  const actual = await importOriginal<typeof PresenceApiModule>()
  return { ...actual, presenceApi: { ...actual.presenceApi, setStatus: vi.fn() } }
})

vi.mock('@/features/faq/api', async (importOriginal) => {
  const actual = await importOriginal<typeof FaqApiModule>()
  return { ...actual, faqApi: { ...actual.faqApi, agentSearch: vi.fn(), agentFlag: vi.fn() } }
})

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    conversationApi: {
      ...actual.conversationApi,
      quickReplies: vi.fn(() =>
        Promise.resolve([
          {
            id: 'q1',
            scope: 'global',
            shortcut: 'salam',
            title: 'Salam pembuka',
            body: 'Halo {nama}, saya {nama_cs}. Tiket {nomor_tiket}.',
          },
        ]),
      ),
      addNote: vi.fn(() => Promise.resolve({})),
      attachmentPolicy: vi.fn(),
    },
  }
})

function setup(agent: AgentProfile = agentFixture) {
  const send = vi.fn<(request: SendRequest) => Promise<SendResult>>(() =>
    Promise.resolve({ status: 'sent', message: messageFixture() }),
  )
  const onNoteSaved = vi.fn()
  const user = userEvent.setup()
  renderWithProviders(
    <>
      <Composer
        ticket={ticketFixture()}
        agent={agent}
        replyTo={null}
        onCancelReply={vi.fn()}
        send={send}
        onTyping={vi.fn()}
        onStopTyping={vi.fn()}
        onNoteSaved={onNoteSaved}
      />
      <Toaster />
    </>,
    agent,
  )
  return { send, user, onNoteSaved, box: screen.getByRole('textbox', { name: 'Balas' }) }
}

const offlineAgent: AgentProfile = { ...agentFixture, status: 'offline' }

function screenshot(name = 'image.png') {
  const file = new File(['png'], name, { type: 'image/png' })
  const clipboardData = { items: [{ kind: 'file', type: file.type, getAsFile: () => file }] }
  return { file, clipboardData }
}

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(conversationApi.attachmentPolicy).mockResolvedValue(attachmentPolicyFixture())
  })
  afterEach(dismissToasts)

  it('sends on Enter and clears the box', async () => {
    const { send, user, box } = setup()
    await user.type(box, 'Halo kak')
    expect(screen.getByText('8/4000')).toBeInTheDocument()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(send.mock.calls[0]?.[0]).toMatchObject({ body: 'Halo kak', files: [], replyTo: null })
    expect(box).toHaveValue('')
  })

  it('adds a new line on Shift+Enter without sending', async () => {
    const { send, user, box } = setup()
    await user.type(box, 'Baris satu{Shift>}{Enter}{/Shift}Baris dua')
    expect(box).toHaveValue('Baris satu\nBaris dua')
    expect(send).not.toHaveBeenCalled()
  })

  it('blocks requests for OTP, PIN or passwords before sending', async () => {
    const { send, user, box } = setup()
    await user.type(box, 'Mohon kirimkan kode OTP Anda')
    expect(screen.getByRole('alert')).toHaveTextContent('CS tidak boleh meminta OTP')
    expect(screen.getByRole('button', { name: 'Kirim' })).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(send).not.toHaveBeenCalled()
  })

  it('inserts a quick reply with variables filled in', async () => {
    const { user, box } = setup()
    await user.type(box, '/sal')
    const option = await screen.findByRole('option', { name: /salam/i })
    expect(option).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    expect(box).toHaveValue('Halo Budi Santoso, saya Rina. Tiket CS-000123.')
  })

  it('saves internal notes through the note endpoint', async () => {
    const { send, user, onNoteSaved } = setup()
    await user.click(screen.getByRole('tab', { name: /Catatan internal/ }))
    expect(screen.getByText('Tidak terlihat nasabah')).toBeInTheDocument()
    const note = screen.getByRole('textbox', { name: 'Catatan internal' })
    await user.type(note, 'Nasabah minta ditelepon balik')
    await user.keyboard('{Enter}')
    await waitFor(() =>
      expect(conversationApi.addNote).toHaveBeenCalledWith('Nasabah minta ditelepon balik', {
        ticketId: ticketFixture().id,
      }),
    )
    await waitFor(() => expect(onNoteSaved).toHaveBeenCalledTimes(1))
    expect(send).not.toHaveBeenCalled()
  })

  it('offers help links, quick options and FAQ articles from the more menu', async () => {
    const { send, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Kirim lainnya' }))
    const items = await screen.findAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Tautan bantuan',
      'Pilihan cepat',
      'Sisipkan artikel FAQ',
    ])
    await user.click(screen.getByRole('menuitem', { name: 'Pilihan cepat' }))
    const dialog = await screen.findByRole('dialog', { name: 'Kirim pilihan cepat' })
    await user.type(within(dialog).getByLabelText('Pertanyaan'), 'Dana sudah masuk?')
    await user.type(within(dialog).getByRole('textbox', { name: 'Pilihan 1' }), 'Sudah')
    await user.type(within(dialog).getByRole('textbox', { name: 'Pilihan 2' }), 'Belum')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim' }))
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith({
        body: 'Dana sudah masuk?',
        kind: 'quick_reply',
        payload: { options: ['Sudah', 'Belum'] },
      }),
    )
  })

  it('inserts a FAQ article as plain text in the ticket language after the current draft', async () => {
    vi.mocked(faqApi.agentSearch).mockResolvedValue([
      {
        id: 'a1',
        category: 'akun',
        question: 'Lupa PIN?',
        answer: 'Pilih **Lupa PIN** lalu ikuti [panduan](https://help.example.com/pin).',
        topic: null,
        updated_at: '2026-11-01T00:00:00.000Z',
        open_flags: 0,
      },
    ])
    const { send, user, box } = setup()
    await user.type(box, 'Halo Budi,')
    await user.click(screen.getByRole('button', { name: 'Kirim lainnya' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sisipkan artikel FAQ' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sisipkan artikel FAQ' }, { timeout: 5000 })
    await user.click(await within(dialog).findByRole('button', { name: 'Sisipkan' }, { timeout: 5000 }))

    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(faqApi.agentSearch).toHaveBeenCalledWith('', 'id')
    expect(box).toHaveValue(
      'Halo Budi,\n\nLupa PIN?\n\nPilih Lupa PIN lalu ikuti panduan (https://help.example.com/pin).',
    )
    expect(send).not.toHaveBeenCalled()
  })

  it('locks the reply box while Offline but keeps the draft and offers to go Online', async () => {
    window.localStorage.setItem(
      `cs-console.draft.${offlineAgent.id}.${ticketFixture().id}.reply`,
      'Draf sebelum Offline',
    )
    const { send, user, box } = setup(offlineAgent)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Anda sedang Offline. Ubah ke Online untuk mengetik dan mengirim balasan.',
    )
    expect(box).toBeDisabled()
    expect(box).toHaveValue('Draf sebelum Offline')
    for (const name of ['Lampirkan file', 'Sisipkan balasan cepat', 'Kirim lainnya', 'Kirim']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }

    await user.type(box, 'tambahan')
    expect(box).toHaveValue('Draf sebelum Offline')
    expect(send).not.toHaveBeenCalled()
  })

  it('unlocks the reply box after going Online from the hint', async () => {
    vi.mocked(presenceApi.setStatus).mockResolvedValue({ ...agentFixture, status: 'online' })
    const { user, box } = setup(offlineAgent)

    await user.click(screen.getByRole('button', { name: 'Ubah ke Online' }))

    expect(presenceApi.setStatus).toHaveBeenCalledWith('online', undefined)
    await waitFor(() => expect(box).toBeEnabled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('guards special messages if the agent goes Offline while the dialog is open', async () => {
    const { send, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Kirim lainnya' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Pilihan cepat' }))
    const dialog = await screen.findByRole('dialog', { name: 'Kirim pilihan cepat' })
    await user.type(within(dialog).getByLabelText('Pertanyaan'), 'Dana sudah masuk?')
    await user.type(within(dialog).getByRole('textbox', { name: 'Pilihan 1' }), 'Sudah')
    await user.type(within(dialog).getByRole('textbox', { name: 'Pilihan 2' }), 'Belum')
    act(() => useAuth.getState().updateAgent(offlineAgent))
    await user.click(within(dialog).getByRole('button', { name: 'Kirim' }))

    await findToast('Anda sedang Offline. Ubah ke Online dulu untuk membalas nasabah.')
    expect(send).not.toHaveBeenCalled()
  })

  it('still saves internal notes while Offline', async () => {
    const { user } = setup(offlineAgent)
    await user.click(screen.getByRole('tab', { name: /Catatan internal/ }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Catatan internal' }), 'Telepon balik besok')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(conversationApi.addNote).toHaveBeenCalledTimes(1))
  })

  it('accepts the formats from the server policy and sends documents and videos', async () => {
    const { send, user } = setup()
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await waitFor(() => expect(input.accept).toContain('.docx'))
    for (const item of [
      'application/pdf',
      '.xlsx',
      '.pptx',
      '.txt',
      '.csv',
      'video/mp4',
      '.mov',
      '.webm',
      'image/png',
    ])
      expect(input.accept).toContain(item)

    const sheet = new File([new Uint8Array(2048)], 'Mutasi Oktober.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const clip = new File([new Uint8Array(4096)], 'Rekaman layar.mp4', { type: 'video/mp4' })
    fireEvent.change(input, { target: { files: [sheet, clip] } })
    expect(await screen.findByText('Mutasi Oktober.xlsx')).toBeVisible()
    expect(screen.getByText('Excel · 2 KB')).toBeVisible()
    expect(screen.getByText('Video · 4 KB')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Kirim' }))
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(send.mock.calls[0]?.[0]?.files?.map((item) => item.file)).toEqual([sheet, clip])
  })

  it('refuses macro, legacy and too large files with a clear reason', async () => {
    setup()
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await waitFor(() => expect(input.accept).toContain('.docx'))

    fireEvent.change(input, {
      target: {
        files: [
          new File(['x'], 'Laporan.docm', { type: 'application/vnd.ms-word.document.macroEnabled.12' }),
        ],
      },
    })
    const refused = await findToast(/^Laporan\.docm tidak didukung/)
    expect(refused).toHaveTextContent(
      'Format yang diterima: PDF, Word, Excel, PowerPoint, TXT, CSV, JPEG, PNG, WebP, GIF, MP4, MOV, WebM.',
    )
    dismissToasts()

    fireEvent.change(input, {
      target: { files: [new File(['x'], 'arsip.zip', { type: 'application/zip' })] },
    })
    expect(await findToast(/^arsip\.zip tidak didukung/)).toBeVisible()
    dismissToasts()

    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'Besar.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    fireEvent.change(input, { target: { files: [big] } })
    expect(await findToast('Besar.pptx lebih dari 10 MB.')).toBeVisible()
    expect(screen.queryByText('Besar.pptx')).not.toBeInTheDocument()
  })

  it('names the kind a Super Admin turned off and keeps the accept list in step', async () => {
    vi.mocked(conversationApi.attachmentPolicy).mockResolvedValue(
      attachmentPolicyFixture({
        videos: { enabled: false, bucket: 'cs-videos', max_bytes: 0, max_seconds: 120, formats: [] },
      }),
    )
    setup()
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await waitFor(() => expect(input.accept).toContain('.docx'))
    expect(input.accept).not.toContain('video/mp4')
    fireEvent.change(input, { target: { files: [new File(['x'], 'rekaman.mp4', { type: 'video/mp4' })] } })
    expect(
      await findToast('rekaman.mp4 tidak bisa dikirim: lampiran video sedang dinonaktifkan.'),
    ).toBeVisible()
  })

  it('attaches documents that are pasted or dropped', async () => {
    const { box } = setup()
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await waitFor(() => expect(input.accept).toContain('.csv'))
    const report = new File(['a,b'], 'mutasi.csv', { type: 'text/csv' })
    fireEvent.paste(box, {
      clipboardData: { items: [{ kind: 'file', type: report.type, getAsFile: () => report }] },
    })
    expect(await screen.findByText('mutasi.csv')).toBeVisible()

    const note = new File(['halo'], 'catatan.txt', { type: 'text/plain' })
    const composer = box.closest('.border-t') as HTMLElement
    fireEvent.drop(composer, { dataTransfer: { files: [note], types: ['Files'] } })
    expect(await screen.findByText('catatan.txt')).toBeVisible()
    expect(screen.getByText('Teks · 4 B')).toBeVisible()
  })

  it('explains why the server refused an upload', async () => {
    const { ApiError } = await import('@/lib/errors')
    const { send, user } = setup()
    send.mockRejectedValueOnce(new ApiError('office_macro', 'macro', 422))
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await waitFor(() => expect(input.accept).toContain('.docx'))
    fireEvent.change(input, {
      target: {
        files: [
          new File(['x'], 'Surat.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ],
      },
    })
    await screen.findByText('Surat.docx')
    await user.click(screen.getByRole('button', { name: 'Kirim' }))
    expect(await findToast(/^File Office berisi makro dan ditolak/)).toBeVisible()
  })

  it('attaches a screenshot pasted anywhere in the conversation, like WhatsApp', async () => {
    const { box } = setup()
    fireEvent.paste(document.body, { clipboardData: screenshot().clipboardData })
    expect(await screen.findByRole('button', { name: 'Lihat image.png' })).toBeVisible()
    expect(box).toHaveFocus()
  })

  it('shows a large preview of a pasted image before it is sent', async () => {
    const { send, user, box } = setup()
    const shot = screenshot()
    fireEvent.paste(box, { clipboardData: shot.clipboardData })
    await user.click(await screen.findByRole('button', { name: 'Lihat image.png' }))
    const preview = screen.getByRole('dialog', { name: 'Pratinjau lampiran' })
    expect(within(preview).getByRole('img', { name: 'image.png' })).toBeVisible()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Kirim' }))
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(send.mock.calls[0]?.[0]?.files?.map((item) => item.file)).toEqual([shot.file])
  })

  it('leaves pasted images alone in other fields and in internal notes', async () => {
    const { user } = setup()
    const search = document.createElement('input')
    document.body.append(search)
    fireEvent.paste(search, { clipboardData: screenshot().clipboardData })
    await user.click(screen.getByRole('tab', { name: /Catatan internal/ }))
    fireEvent.paste(document.body, { clipboardData: screenshot().clipboardData })
    await act(() => Promise.resolve())
    expect(screen.queryByRole('button', { name: /^Lihat / })).not.toBeInTheDocument()
    search.remove()
  })

  it('keeps a draft per ticket', async () => {
    const { user, box } = setup()
    await user.type(box, 'Draf belum dikirim')
    expect(
      window.localStorage.getItem(`cs-console.draft.${agentFixture.id}.${ticketFixture().id}.reply`),
    ).toBe('Draf belum dikirim')
  })
})
