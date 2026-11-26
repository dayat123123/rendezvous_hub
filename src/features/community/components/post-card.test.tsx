import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AgentProfile } from '@/features/presence/types'
import { ApiError } from '@/lib/errors'
import { agentFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { findToast, Toaster } from '@/test/toast'

import type * as ApiModule from '../api'
import { communityApi } from '../api'
import type { CardDocument, CommunityPost, OfficialAccount } from '../types'
import { StreamTab } from './stream-tab'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    communityApi: {
      ...actual.communityApi,
      accounts: vi.fn(),
      posts: vi.fn(),
      savePost: vi.fn(),
      submitPost: vi.fn(),
      reviewPost: vi.fn(),
    },
  }
})

const account: OfficialAccount = {
  id: 'acc-1',
  username: 'olt_research',
  display_name: 'OLT Research',
  avatar_url: null,
  bio: null,
  follower_count: 0,
  post_count: 0,
  created_at: '2026-11-01T02:00:00.000Z',
  created_by: 'Sinta',
  disabled_at: null,
}

const writer: AgentProfile = {
  ...agentFixture,
  id: 'maya',
  display_name: 'Maya',
  roles: ['community'],
  community_permissions: ['community.post'],
}

const publisher: AgentProfile = {
  ...agentFixture,
  id: 'kirana',
  display_name: 'Kirana',
  roles: ['compliance'],
  community_permissions: ['community.post', 'community.publish'],
}

const holiday: CardDocument = {
  version: 1,
  badge: 'Info pasar',
  title: 'Jadwal Libur Bursa',
  headline: 'Bursa libur dua hari',
  disclaimer: 'Informasi dari OLT Research.',
  blocks: [
    { type: 'paragraph', text: 'Bursa libur pada hari berikut.' },
    { type: 'list', style: 'numbered', items: ['25 Desember', '26 Desember'] },
  ],
}

function post(overrides: Partial<CommunityPost>): CommunityPost {
  return {
    id: 'post-1',
    account,
    kind: 'post',
    title: null,
    body: '$BBCA — Jadwal Libur Bursa\n\nBursa libur dua hari',
    attachments: [],
    pin_scope: null,
    pin_stock: null,
    pin_until: null,
    pinned: false,
    notify: false,
    status: 'draft',
    publish_at: null,
    post_id: null,
    post: null,
    campaign: null,
    created_by: { id: 'maya', name: 'Maya' },
    created_at: '2026-11-02T02:00:00.000Z',
    updated_at: '2026-11-02T02:00:00.000Z',
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    published_at: null,
    error: null,
    version: 1,
    ...overrides,
  }
}

function render(agent: AgentProfile) {
  return renderWithProviders(
    <>
      <StreamTab />
      <Toaster />
    </>,
    agent,
  )
}

async function openComposer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Buat postingan' }))
  const dialog = screen.getByRole('dialog', { name: 'Buat postingan' })
  await user.click(within(dialog).getByRole('combobox', { name: 'Akun resmi' }))
  await user.click(await screen.findByRole('option', { name: 'OLT Research' }))
  await user.click(within(dialog).getByRole('radio', { name: 'Kartu' }))
  return dialog
}

const block = (dialog: HTMLElement, name: RegExp) => within(dialog).getByRole('listitem', { name })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(communityApi.accounts).mockResolvedValue([account])
  vi.mocked(communityApi.posts).mockResolvedValue([])
})

describe('card posts', () => {
  it('builds a card with blocks, previews it live, and saves the card attachment', async () => {
    const user = userEvent.setup()
    vi.mocked(communityApi.savePost).mockResolvedValue(post({}))
    vi.mocked(communityApi.submitPost).mockResolvedValue(post({ status: 'pending' }))
    render(writer)
    const dialog = await openComposer(user)

    expect(within(dialog).queryByLabelText('Isi')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan & ajukan' }))
    expect(within(dialog).getAllByText('Wajib diisi.')).toHaveLength(2)
    expect(within(block(dialog, /^Blok 1: Paragraf/)).getByText('Blok ini masih kosong.')).toBeVisible()
    expect(communityApi.savePost).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText('Kode saham'), 'bbca')
    await user.type(within(dialog).getByLabelText('Label kecil'), 'Info pasar')
    await user.type(within(dialog).getByLabelText('Judul'), 'Jadwal Libur Bursa')
    await user.type(within(dialog).getByLabelText('Kalimat utama'), 'Bursa libur dua hari')
    await user.type(within(block(dialog, /^Blok 1/)).getByLabelText('Teks'), 'Bursa libur pada hari berikut.')

    const add = within(dialog).getByRole('group', { name: 'Tambah blok' })
    await user.click(within(add).getByRole('button', { name: 'Kotak sorotan' }))
    await user.type(within(block(dialog, /^Blok 2/)).getByLabelText('Judul kotak'), 'Catatan')
    await user.type(within(block(dialog, /^Blok 2/)).getByLabelText('Isi kotak'), 'Settlement bergeser.')

    await user.click(within(add).getByRole('button', { name: 'Daftar' }))
    const list = block(dialog, /^Blok 3: Daftar/)
    await user.type(within(list).getByLabelText('Poin 1'), '25 Desember')
    await user.click(within(list).getByRole('button', { name: 'Tambah poin' }))
    await user.type(within(list).getByLabelText('Poin 2'), '26 Desember')

    await user.click(within(add).getByRole('button', { name: 'Deretan angka' }))
    const figures = block(dialog, /^Blok 4: Deretan angka/)
    await user.type(within(figures).getByLabelText('Label angka 1'), 'Hari libur')
    await user.type(within(figures).getByLabelText('Nilai angka 1'), '2 hari')
    await user.type(within(figures).getByLabelText('Perubahan angka 1'), '+1 hari')
    await user.click(within(figures).getByRole('combobox', { name: 'Arah angka 1' }))
    await user.click(await screen.findByRole('option', { name: 'naik' }))

    await user.click(within(add).getByRole('button', { name: 'Paragraf' }))
    expect(block(dialog, /^Blok 5: Paragraf/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Hapus blok 5' }))
    expect(within(dialog).queryByRole('listitem', { name: /^Blok 5/ })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Turunkan blok 2' }))
    await user.click(within(dialog).getByRole('button', { name: 'Turunkan blok 3' }))
    expect(block(dialog, /^Blok 2: Daftar/)).toBeInTheDocument()
    expect(block(dialog, /^Blok 4: Kotak sorotan/)).toBeInTheDocument()

    const preview = within(dialog).getByRole('region', { name: 'Tampilan di aplikasi' })
    const card = within(preview).getByRole('article', { name: 'Jadwal Libur Bursa' })
    expect(within(card).getByText('$BBCA')).toBeInTheDocument()
    expect(within(card).getByText('Bursa libur dua hari')).toBeInTheDocument()
    expect(within(card).getByText('+1 hari').parentElement).toHaveClass('text-success')
    const text =
      '$BBCA — Jadwal Libur Bursa\n\nBursa libur dua hari\n\nBursa libur pada hari berikut.\n\n1. 25 Desember\n2. 26 Desember\n\nHari libur: 2 hari (+1 hari)\n\nCatatan: Settlement bergeser.'
    expect(within(dialog).getByTestId('card-legacy-text').textContent).toBe(text)

    await user.click(within(dialog).getByRole('button', { name: 'Simpan & ajukan' }))
    await waitFor(() => expect(communityApi.submitPost).toHaveBeenCalledWith('post-1', 1))
    expect(communityApi.savePost).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        account_id: 'acc-1',
        body: text,
        attachments: [
          {
            type: 'card',
            stock_code: 'BBCA',
            document: {
              version: 1,
              badge: 'Info pasar',
              title: 'Jadwal Libur Bursa',
              headline: 'Bursa libur dua hari',
              blocks: [
                { type: 'paragraph', text: 'Bursa libur pada hari berikut.' },
                { type: 'list', style: 'numbered', items: ['25 Desember', '26 Desember'] },
                {
                  type: 'metrics',
                  metrics: [{ label: 'Hari libur', value: '2 hari', change: '+1 hari', trend: 'up' }],
                },
                { type: 'callout', title: 'Catatan', text: 'Settlement bergeser.' },
              ],
            },
          },
        ],
      }),
      null,
    )
  })

  it('shows card errors from the server in Indonesian', async () => {
    const user = userEvent.setup()
    vi.mocked(communityApi.savePost).mockRejectedValue(new ApiError('invalid_card', undefined, 400))
    render(writer)
    const dialog = await openComposer(user)
    await user.type(within(dialog).getByLabelText('Judul'), 'Judul')
    await user.type(within(dialog).getByLabelText('Kalimat utama'), 'Utama')
    await user.type(within(block(dialog, /^Blok 1/)).getByLabelText('Teks'), 'Isi')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan draf' }))

    expect(
      await findToast('Kartu tidak lengkap: isi judul, kalimat utama, dan minimal satu blok.'),
    ).toBeInTheDocument()
  })

  it('opens a card draft in card mode, keeps its images, and lets the writer switch it to plain text', async () => {
    const user = userEvent.setup()
    vi.mocked(communityApi.posts).mockResolvedValue([
      post({
        attachments: [
          { path: 'posts/acc-1/a.png' },
          {
            type: 'card',
            source: 'research',
            research_id: 'rep-1',
            kind: 'financial_report',
            stock_code: 'BBCA',
            document: holiday,
          },
        ],
      }),
    ])
    vi.mocked(communityApi.savePost).mockResolvedValue(post({}))
    render(writer)

    await user.click(await screen.findByRole('button', { name: /Jadwal Libur Bursa/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail postingan resmi' })
    await user.click(within(sheet).getByRole('button', { name: 'Ubah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah postingan' })

    expect(within(dialog).getByRole('radio', { name: 'Kartu' })).toBeChecked()
    expect(within(dialog).getByLabelText('Kode saham')).toHaveValue('BBCA')
    expect(within(dialog).getByLabelText('Judul')).toHaveValue('Jadwal Libur Bursa')
    expect(within(dialog).getByLabelText('Disclaimer')).toHaveValue('Informasi dari OLT Research.')
    expect(block(dialog, /^Blok 2: Daftar/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Simpan draf' }))
    await waitFor(() => expect(communityApi.savePost).toHaveBeenCalledTimes(1))
    const [, saved] = vi.mocked(communityApi.savePost).mock.calls[0]!
    expect(saved.attachments).toEqual([
      { path: 'posts/acc-1/a.png' },
      { type: 'card', stock_code: 'BBCA', document: holiday },
    ])
  })

  it('shows reviewers the card the app will show, with the text for older apps', async () => {
    vi.mocked(communityApi.posts).mockResolvedValue([
      post({
        status: 'pending',
        submitted_at: '2026-11-02T02:05:00.000Z',
        attachments: [{ type: 'card', source: 'manual', stock_code: 'BBCA', document: holiday }],
      }),
    ])
    const user = userEvent.setup()
    render(publisher)

    const row = await screen.findByRole('button', { name: /Jadwal Libur Bursa/ })
    expect(within(row).getByText('Kartu')).toBeInTheDocument()
    expect(within(row).getByText('Bursa libur dua hari')).toBeInTheDocument()
    await user.click(row)
    const sheet = await screen.findByRole('dialog', { name: 'Detail postingan resmi' })
    const preview = within(sheet).getByRole('region', { name: 'Tampilan di aplikasi' })
    const card = within(preview).getByRole('article', { name: 'Jadwal Libur Bursa' })
    expect(within(card).getByText('Info pasar')).toBeInTheDocument()
    expect(within(card).getByRole('list')).toHaveTextContent('25 Desember26 Desember')
    const legacy = within(sheet).getByRole('region', { name: 'Teks untuk aplikasi lama' })
    expect(legacy).toHaveTextContent('$BBCA — Jadwal Libur Bursa Bursa libur dua hari')
  })
})
