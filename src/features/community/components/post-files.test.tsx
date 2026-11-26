import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AgentProfile } from '@/features/presence/types'
import { ApiError } from '@/lib/errors'
import { agentFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { findToast, Toaster } from '@/test/toast'

import type * as ApiModule from '../api'
import { communityApi } from '../api'
import { postFilesApi } from '../post-files-api'
import type { CommunityPost, OfficialAccount } from '../types'
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

vi.mock('../post-files-api', () => ({ postFilesApi: { uploadPostFile: vi.fn(), postFileUrl: vi.fn() } }))

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

const PDF_PATH = 'acc-1/0b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pdf'

function post(overrides: Partial<CommunityPost>): CommunityPost {
  return {
    id: 'post-1',
    account,
    kind: 'post',
    title: null,
    body: 'Laporan tahunan dan data pendukung $BBCA',
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

const file = (name: string, size: number) => {
  const value = new File(['x'], name, { type: '' })
  Object.defineProperty(value, 'size', { value: size })
  return value
}

const MB = 1024 * 1024

function render(agent: AgentProfile) {
  return renderWithProviders(
    <>
      <StreamTab />
      <Toaster />
    </>,
    agent,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(communityApi.accounts).mockResolvedValue([account])
  vi.mocked(communityApi.posts).mockResolvedValue([])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('post documents', () => {
  it('uploads documents, rejects legacy and oversized files, and saves files next to images', async () => {
    const user = userEvent.setup({ applyAccept: false })
    vi.mocked(postFilesApi.uploadPostFile)
      .mockResolvedValueOnce({ path: PDF_PATH, ext: 'pdf' })
      .mockResolvedValueOnce({ path: 'acc-1/1b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pptx', ext: 'pptx' })
    vi.mocked(communityApi.savePost).mockResolvedValue(post({}))
    vi.mocked(communityApi.submitPost).mockResolvedValue(post({ status: 'pending' }))
    render(writer)

    await user.click(await screen.findByRole('button', { name: 'Buat postingan' }))
    const dialog = screen.getByRole('dialog', { name: 'Buat postingan' })
    await user.upload(within(dialog).getByLabelText('Pilih dokumen'), [file('a.pdf', 100)])
    expect(await findToast('Pilih akun resmi dulu sebelum menambah dokumen.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('combobox', { name: 'Akun resmi' }))
    await user.click(await screen.findByRole('option', { name: 'OLT Research' }))
    await user.type(within(dialog).getByLabelText('Isi'), 'Laporan tahunan dan data pendukung $BBCA')

    const pdf = file('Laporan.pdf', 1.5 * MB)
    const slides = file('Presentasi.pptx', 2 * MB)
    await user.upload(within(dialog).getByLabelText('Pilih dokumen'), [
      pdf,
      file('Data.csv', 11 * MB),
      file('Lama.xls', 1000),
      slides,
    ])

    expect(await findToast('Data.csv: lebih dari 10 MB.')).toBeInTheDocument()
    expect(await findToast(/^Lama\.xls: format lama tidak diterima/)).toBeInTheDocument()
    expect(postFilesApi.uploadPostFile).toHaveBeenCalledTimes(2)
    expect(postFilesApi.uploadPostFile).toHaveBeenCalledWith('acc-1', pdf)
    expect(postFilesApi.uploadPostFile).toHaveBeenCalledWith('acc-1', slides)

    const documents = within(dialog).getByRole('region', { name: 'Dokumen' })
    await waitFor(() => expect(within(documents).getAllByText('Terunggah')).toHaveLength(2))
    expect(within(documents).getByText('PDF · 1,5 MB')).toBeInTheDocument()

    const name = within(documents).getByLabelText('Nama dokumen 1')
    await user.clear(name)
    await user.click(within(dialog).getByRole('button', { name: 'Simpan & ajukan' }))
    expect(within(documents).getByText('Nama dokumen wajib diisi.')).toBeVisible()
    expect(communityApi.savePost).not.toHaveBeenCalled()
    await user.type(name, 'Laporan Tahunan 2025.pdf')
    await user.click(within(documents).getByRole('button', { name: 'Hapus dokumen Presentasi.pptx' }))

    await user.click(within(dialog).getByRole('button', { name: 'Simpan & ajukan' }))
    await waitFor(() => expect(communityApi.submitPost).toHaveBeenCalledWith('post-1', 1))
    expect(communityApi.savePost).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        attachments: [{ type: 'file', file: { path: PDF_PATH, name: 'Laporan Tahunan 2025.pdf' } }],
      }),
      null,
    )
  })

  it('marks a failed upload and maps server document errors to Indonesian', async () => {
    const user = userEvent.setup({ applyAccept: false })
    vi.mocked(communityApi.posts).mockResolvedValue([
      post({
        attachments: [
          {
            type: 'file',
            file: {
              bucket: 'post-files',
              path: PDF_PATH,
              name: 'Laporan.pdf',
              mime: 'application/pdf',
              size: 120000,
            },
          },
        ],
      }),
    ])
    vi.mocked(postFilesApi.uploadPostFile).mockRejectedValue(new ApiError('upload_forbidden', undefined, 403))
    vi.mocked(communityApi.savePost).mockRejectedValue(new ApiError('duplicate_file', undefined, 400))
    render(writer)

    await user.click(await screen.findByRole('button', { name: /Laporan tahunan dan data pendukung/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail postingan resmi' })
    await user.click(within(sheet).getByRole('button', { name: 'Ubah' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah postingan' })
    const documents = within(dialog).getByRole('region', { name: 'Dokumen' })
    expect(within(documents).getByLabelText('Nama dokumen 1')).toHaveValue('Laporan.pdf')

    await user.upload(within(dialog).getByLabelText('Pilih dokumen'), [file('Data.xlsx', 2000)])
    expect(
      await within(documents).findByText(
        /^Gagal: Akun ini tidak punya izin mengunggah dokumen untuk akun resmi tersebut\./,
      ),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan draf' }))
    expect(within(documents).getByText('Hapus dokumen yang gagal diunggah, lalu unggah ulang.')).toBeVisible()
    await user.click(within(documents).getByRole('button', { name: 'Hapus dokumen Data.xlsx' }))

    await user.click(within(dialog).getByRole('button', { name: 'Simpan draf' }))
    expect(await findToast('Dokumen yang sama dipasang dua kali.')).toBeInTheDocument()
    expect(communityApi.savePost).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        attachments: [{ type: 'file', file: { path: PDF_PATH, name: 'Laporan.pdf' } }],
      }),
      1,
    )
  })

  it('shows the documents as chips in the card preview', async () => {
    const user = userEvent.setup({ applyAccept: false })
    vi.mocked(postFilesApi.uploadPostFile).mockResolvedValue({ path: PDF_PATH, ext: 'pdf' })
    render(writer)

    await user.click(await screen.findByRole('button', { name: 'Buat postingan' }))
    const dialog = screen.getByRole('dialog', { name: 'Buat postingan' })
    await user.click(within(dialog).getByRole('combobox', { name: 'Akun resmi' }))
    await user.click(await screen.findByRole('option', { name: 'OLT Research' }))
    await user.click(within(dialog).getByRole('radio', { name: 'Kartu' }))
    await user.upload(within(dialog).getByLabelText('Pilih dokumen'), [file('Laporan.pdf', 2 * MB)])

    const preview = within(dialog).getByRole('region', { name: 'Tampilan di aplikasi' })
    const chips = within(preview).getByRole('list', { name: 'Dokumen' })
    expect(within(chips).getByText('Laporan.pdf')).toBeInTheDocument()
    expect(within(chips).getByText('PDF · 2 MB')).toBeInTheDocument()
  })

  it('lets reviewers open each document through a short-lived signed URL', async () => {
    const user = userEvent.setup()
    vi.mocked(communityApi.posts).mockResolvedValue([
      post({
        status: 'pending',
        submitted_at: '2026-11-02T02:05:00.000Z',
        attachments: [
          {
            type: 'file',
            file: {
              bucket: 'post-files',
              path: PDF_PATH,
              name: 'Laporan Tahunan 2025.pdf',
              mime: 'application/pdf',
              size: 120000,
            },
          },
          {
            type: 'file',
            file: {
              bucket: 'post-files',
              path: 'acc-1/1b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.xlsx',
              name: 'Data.xlsx',
              mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              size: 64000,
            },
          },
        ],
      }),
    ])
    vi.mocked(postFilesApi.postFileUrl).mockResolvedValue(
      'https://api.olt.test/storage/v1/object/sign/x?token=t',
    )
    const target = { opener: {} as unknown, location: { href: 'about:blank' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(target as unknown as Window)
    render(publisher)

    await user.click(await screen.findByRole('button', { name: /Laporan tahunan dan data pendukung/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail postingan resmi' })
    const chips = within(sheet).getByRole('list', { name: 'Dokumen' })
    expect(within(chips).getByText('Laporan Tahunan 2025.pdf')).toBeInTheDocument()
    expect(within(chips).getByText('PDF · 117 KB')).toBeInTheDocument()
    expect(within(chips).getByText('Excel · 62,5 KB')).toBeInTheDocument()

    await user.click(within(chips).getByRole('button', { name: 'Buka Laporan Tahunan 2025.pdf' }))
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(postFilesApi.postFileUrl).toHaveBeenCalledWith(PDF_PATH)
    await waitFor(() =>
      expect(target.location.href).toBe('https://api.olt.test/storage/v1/object/sign/x?token=t'),
    )
    expect(target.opener).toBeNull()
  })
})
