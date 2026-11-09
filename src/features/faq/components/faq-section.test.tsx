import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SettingsApiModule from '@/features/settings/api'
import { settingsApi } from '@/features/settings/api'
import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { Toaster } from '@/test/toast'

import { faqApi } from '../api'
import type { FaqArticle, FaqCategory } from '../types'
import { FaqSection } from './faq-section'

vi.mock('../api', () => ({
  faqApi: {
    overview: vi.fn(),
    saveCategory: vi.fn(),
    saveArticle: vi.fn(),
    setStatus: vi.fn(),
    versions: vi.fn(),
    restore: vi.fn(),
    comments: vi.fn(),
    misses: vi.fn(),
    uploadImage: vi.fn(),
  },
}))

vi.mock('@/features/settings/api', async (importOriginal) => {
  const actual = await importOriginal<typeof SettingsApiModule>()
  return { ...actual, settingsApi: { ...actual.settingsApi, topics: vi.fn() } }
})

const category: FaqCategory = {
  id: 'cat-account',
  code: 'account',
  name_id: 'Akun dan login',
  name_en: 'Account and login',
  icon: 'account',
  sort_order: 10,
  active: true,
  updated_at: '2026-11-09T03:00:00.000Z',
  article_count: 2,
}

const article = (patch: Partial<FaqArticle> = {}): FaqArticle => ({
  id: 'art-pin',
  category_id: 'cat-account',
  question_id: 'Bagaimana cara mengganti PIN?',
  question_en: 'How do I change my PIN?',
  answer_id: 'Buka **Profil** lalu pilih *Ganti PIN*.',
  answer_en: 'Open **Profile** and choose *Change PIN*.',
  keywords: ['pin'],
  topic_code: 'account',
  sort_order: 10,
  status: 'published',
  version: 2,
  views: 120,
  readers: 80,
  helpful: 30,
  not_helpful: 10,
  tickets_after: 4,
  created_at: '2026-11-01T03:00:00.000Z',
  updated_at: '2026-11-08T03:00:00.000Z',
  updated_by_name: 'Laras',
  published_at: '2026-11-02T03:00:00.000Z',
  ...patch,
})

const articles = [
  article(),
  article({
    id: 'art-email',
    question_id: 'Bagaimana cara mengganti email?',
    question_en: 'How do I change my email?',
    keywords: ['email'],
    status: 'draft',
    views: 0,
    helpful: 0,
    not_helpful: 0,
    sort_order: 20,
  }),
  article({ id: 'art-old', question_id: 'Pertanyaan lama yang diarsip', status: 'archived', sort_order: 30 }),
]

function setup() {
  const user = userEvent.setup()
  renderWithProviders(
    <>
      <FaqSection />
      <Toaster />
    </>,
    monitorFixture,
  )
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(faqApi.overview).mockResolvedValue({ categories: [category], articles })
  vi.mocked(faqApi.misses).mockResolvedValue([
    { query: 'rekening # @', language: 'id', count: 3, last_at: '2026-11-09T02:00:00.000Z' },
  ])
  vi.mocked(settingsApi.topics).mockResolvedValue([])
})

describe('FaqSection', () => {
  it('lists articles with their stats, hides archived ones, and filters by search', async () => {
    const user = setup()
    const table = await screen.findByRole('table')
    const pin = within(table).getByText('Bagaimana cara mengganti PIN?').closest('tr') as HTMLElement
    expect(within(pin).getByText('Terbit')).toBeInTheDocument()
    expect(within(pin).getByText('120')).toBeInTheDocument()
    expect(within(pin).getByText('75%')).toBeInTheDocument()
    expect(within(pin).getByText('4')).toBeInTheDocument()
    expect(within(table).getByText('Draf')).toBeInTheDocument()
    expect(within(table).queryByText('Pertanyaan lama yang diarsip')).not.toBeInTheDocument()

    await user.type(
      screen.getByRole('textbox', { name: 'Cari pertanyaan, jawaban, atau kata kunci' }),
      'email',
    )
    expect(within(table).queryByText('Bagaimana cara mengganti PIN?')).not.toBeInTheDocument()
    expect(within(table).getByText('Bagaimana cara mengganti email?')).toBeInTheDocument()

    expect(screen.getByText('rekening # @')).toBeInTheDocument()
  })

  it('validates a new article, shows the app preview, and saves it as a draft', async () => {
    vi.mocked(faqApi.saveArticle).mockImplementation((draft) =>
      Promise.resolve(article({ ...draft, id: 'art-new', status: 'draft', version: 1 })),
    )
    const user = setup()
    await user.click(await screen.findByRole('button', { name: 'Tambah artikel' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah artikel' })

    await user.type(within(dialog).getByLabelText('Pertanyaan (ID)'), 'Kapan saldo masuk?')
    await user.type(within(dialog).getByLabelText('Pertanyaan (EN)'), 'When does my balance arrive?')
    await user.type(within(dialog).getByLabelText('Jawaban (ID)'), '<b>Segera</b>')
    await user.click(within(dialog).getByLabelText('Jawaban (EN)'))
    await user.paste('Right away, see [guide](https://olt.co.id/saldo).')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan draf' }))
    expect(await within(dialog).findByText('Jawaban tidak boleh memuat tag HTML')).toBeInTheDocument()
    expect(faqApi.saveArticle).not.toHaveBeenCalled()

    await user.clear(within(dialog).getByLabelText('Jawaban (ID)'))
    await user.type(within(dialog).getByLabelText('Jawaban (ID)'), 'Biasanya **1 hari kerja**.')
    const preview = within(dialog).getByRole('region', { name: 'Pratinjau di aplikasi' })
    expect(within(preview).getByText('Kapan saldo masuk?')).toBeInTheDocument()
    expect(within(preview).getByText('1 hari kerja').tagName).toBe('STRONG')
    await user.click(within(preview).getByRole('button', { name: 'EN' }))
    expect(within(preview).getByRole('link', { name: 'guide' })).toHaveAttribute(
      'href',
      'https://olt.co.id/saldo',
    )

    await user.type(within(dialog).getByLabelText('Kata kunci'), 'Saldo, saldo, transfer ')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan draf' }))
    await waitFor(() =>
      expect(faqApi.saveArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: null,
          version: null,
          category_id: 'cat-account',
          topic_code: null,
          question_id: 'Kapan saldo masuk?',
          answer_id: 'Biasanya **1 hari kerja**.',
          keywords: ['saldo', 'transfer'],
        }),
      ),
    )
    expect(await screen.findByText('Draf disimpan. Terbitkan agar tampil di aplikasi.')).toBeInTheDocument()
  })

  it('publishes a draft from the row menu and sends the version when editing', async () => {
    vi.mocked(faqApi.setStatus).mockImplementation((id, status) =>
      Promise.resolve(article({ ...articles[1], id, status })),
    )
    vi.mocked(faqApi.saveArticle).mockImplementation((draft) =>
      Promise.resolve(article({ ...draft, id: 'art-pin', version: 3 })),
    )
    const user = setup()
    await user.click(
      await screen.findByRole('button', { name: 'Aksi untuk Bagaimana cara mengganti email?' }),
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Terbitkan' }))
    await waitFor(() => expect(faqApi.setStatus).toHaveBeenCalledWith('art-email', 'published'))
    expect(await screen.findByText('Artikel diterbitkan')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Aksi untuk Bagaimana cara mengganti PIN?' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Ubah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah artikel' })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() =>
      expect(faqApi.saveArticle).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'art-pin', version: 2, topic_code: 'account' }),
      ),
    )
  })

  it('uploads an image into the answer and rejects images from other sites', async () => {
    vi.mocked(faqApi.uploadImage).mockResolvedValue(
      'https://api.olt.test/storage/v1/object/public/faq-images/0b6c1a52-3f4e-4c1d-9a7e-2f1b3c4d5e6f.png',
    )
    const user = setup()
    await user.click(await screen.findByRole('button', { name: 'Tambah artikel' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah artikel' })
    const answer = within(dialog).getByLabelText('Jawaban (ID)')
    await user.type(answer, 'Buka menu profil.')
    await user.click(within(dialog).getByRole('button', { name: 'Sisipkan gambar (ID)' }))
    await user.upload(
      within(dialog).getByTestId('faq-image-input'),
      new File(['x'], 'menu-profil.png', { type: 'image/png' }),
    )
    await waitFor(() =>
      expect(answer).toHaveValue(
        'Buka menu profil.\n\n![menu-profil](https://api.olt.test/storage/v1/object/public/faq-images/0b6c1a52-3f4e-4c1d-9a7e-2f1b3c4d5e6f.png)',
      ),
    )
    const preview = within(dialog).getByRole('region', { name: 'Pratinjau di aplikasi' })
    expect(within(preview).getByRole('img', { name: 'menu-profil' })).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Pertanyaan (ID)'), 'Di mana menu profil?')
    await user.type(within(dialog).getByLabelText('Pertanyaan (EN)'), 'Where is the profile menu?')
    await user.click(within(dialog).getByLabelText('Jawaban (EN)'))
    await user.paste('![x](https://contoh.id/pixel.png)')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan draf' }))
    expect(
      await within(dialog).findByText('Gambar harus diunggah dengan tombol Sisipkan gambar'),
    ).toBeInTheDocument()
    expect(faqApi.saveArticle).not.toHaveBeenCalled()
  })

  it('restores an older version only after confirmation', async () => {
    vi.mocked(faqApi.versions).mockResolvedValue([
      {
        version: 2,
        content: articles[0]!,
        created_at: '2026-11-08T03:00:00.000Z',
        created_by_name: 'Laras',
      },
      {
        version: 1,
        content: { ...articles[0]!, question_id: 'Bagaimana cara reset PIN?' },
        created_at: '2026-11-01T03:00:00.000Z',
        created_by_name: 'Laras',
      },
    ])
    vi.mocked(faqApi.restore).mockResolvedValue(
      article({ version: 3, question_id: 'Bagaimana cara reset PIN?' }),
    )
    const user = setup()
    await user.click(await screen.findByRole('button', { name: 'Aksi untuk Bagaimana cara mengganti PIN?' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Riwayat versi' }))
    const dialog = await screen.findByRole('dialog', { name: /Riwayat versi/ })
    expect(within(dialog).getByText('(versi sekarang)')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Pulihkan' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Pulihkan versi 1?' })
    expect(faqApi.restore).not.toHaveBeenCalled()
    await user.click(within(confirm).getByRole('button', { name: 'Pulihkan' }))
    await waitFor(() => expect(faqApi.restore).toHaveBeenCalledWith('art-pin', 1))
    expect(await screen.findByText('Versi 1 dipulihkan')).toBeInTheDocument()
  })
})
