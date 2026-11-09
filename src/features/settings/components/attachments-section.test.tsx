import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { settingsApi } from '../api'
import type { AdminAttachmentPolicy } from '../types'
import { AttachmentsSection } from './attachments-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    settingsApi: { ...actual.settingsApi, attachmentPolicy: vi.fn(), saveAttachmentPolicy: vi.fn() },
  }
})

const doc = (mime: string, ext: string) => ({ mime, ext })

const policy: AdminAttachmentPolicy = {
  policy: {
    documents: { enabled: true, max_mb: 10, formats: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv'] },
    images: { enabled: true, max_mb: 5, formats: ['jpeg', 'png', 'webp', 'gif'] },
    videos: { enabled: true, max_mb: 25, max_seconds: 120, formats: ['mp4', 'mov', 'webm'] },
  },
  catalog: {
    documents: {
      bucket: 'cs-documents',
      ceiling_mb: 10,
      formats: {
        csv: doc('text/csv', 'csv'),
        pdf: doc('application/pdf', 'pdf'),
        txt: doc('text/plain', 'txt'),
        docx: doc('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'),
        pptx: doc('application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx'),
        xlsx: doc('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'),
      },
    },
    images: {
      bucket: 'attachments',
      ceiling_mb: 5,
      formats: {
        gif: doc('image/gif', 'gif'),
        png: doc('image/png', 'png'),
        jpeg: doc('image/jpeg', 'jpg'),
        webp: doc('image/webp', 'webp'),
      },
    },
    videos: {
      bucket: 'cs-videos',
      ceiling_mb: 25,
      ceiling_seconds: 120,
      formats: {
        mp4: doc('video/mp4', 'mp4'),
        mov: doc('video/quicktime', 'mov'),
        webm: doc('video/webm', 'webm'),
      },
    },
  },
  updated_at: '2026-11-08T03:00:00.000Z',
  updated_by: 'Rina',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(settingsApi.attachmentPolicy).mockResolvedValue(policy)
  vi.mocked(settingsApi.saveAttachmentPolicy).mockImplementation((next) =>
    Promise.resolve({ ...policy, policy: next, updated_at: '2026-11-09T03:00:00.000Z' }),
  )
})

describe('AttachmentsSection', () => {
  it('shows every kind locked, with formats in a stable order and who changed it last', async () => {
    renderWithProviders(<AttachmentsSection />, monitorFixture)

    expect(screen.getByRole('heading', { name: 'Lampiran chat CS' })).toBeVisible()
    expect(await screen.findByRole('heading', { name: 'Dokumen' })).toBeVisible()
    for (const kind of ['Dokumen', 'Gambar', 'Video']) {
      expect(screen.getByRole('heading', { name: kind })).toBeVisible()
    }
    const documents = screen.getByRole('group', { name: 'Format dokumen' })
    expect(
      within(documents)
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual([
      'PDF (.pdf)',
      'Word (.docx)',
      'Excel (.xlsx)',
      'PowerPoint (.pptx)',
      'TXT (.txt)',
      'CSV (.csv)',
    ])
    expect(screen.getByLabelText('Ukuran maks. (MB, 1–10)')).toBeDisabled()
    expect(screen.getByLabelText('Durasi maks. (detik, 5–120)')).toHaveValue('120')
    expect(screen.getByRole('switch', { name: 'Terima video' })).toBeDisabled()
    expect(screen.getByText(/oleh Rina/)).toBeVisible()
  })

  it('validates limits and formats, then saves after confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AttachmentsSection />, monitorFixture)

    await user.click(await screen.findByRole('button', { name: 'Ubah Lampiran chat CS' }))
    const documentsMb = screen.getByLabelText('Ukuran maks. (MB, 1–10)')
    await user.clear(documentsMb)
    await user.type(documentsMb, '11')
    const seconds = screen.getByLabelText('Durasi maks. (detik, 5–120)')
    await user.clear(seconds)
    await user.type(seconds, '3')
    const images = screen.getByRole('group', { name: 'Format gambar' })
    for (const box of within(images).getAllByRole('checkbox')) await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(screen.getByText('Isi angka 1–10')).toBeVisible()
    expect(screen.getByText('Isi angka 5–120')).toBeVisible()
    expect(screen.getByText('Pilih minimal satu format')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.clear(documentsMb)
    await user.type(documentsMb, '8')
    await user.clear(seconds)
    await user.type(seconds, '60')
    await user.click(within(images).getByRole('checkbox', { name: 'PNG (.png)' }))
    await user.click(within(images).getByRole('checkbox', { name: 'JPEG (.jpg)' }))
    await user.click(screen.getByRole('switch', { name: 'Terima video' }))
    expect(screen.getByText('Nonaktif: nasabah dan CS tidak bisa mengirim video.')).toBeVisible()
    const documents = screen.getByRole('group', { name: 'Format dokumen' })
    await user.click(within(documents).getByRole('checkbox', { name: 'TXT (.txt)' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Simpan aturan lampiran?' })
    expect(dialog).toHaveTextContent(
      'Dokumen maks. 8 MB (PDF, Word, Excel, PowerPoint, CSV); Gambar maks. 5 MB (JPEG, PNG); Video nonaktif',
    )
    expect(settingsApi.saveAttachmentPolicy).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(settingsApi.saveAttachmentPolicy).toHaveBeenCalledWith({
        documents: { enabled: true, max_mb: 8, formats: ['pdf', 'docx', 'xlsx', 'pptx', 'csv'] },
        images: { enabled: true, max_mb: 5, formats: ['jpeg', 'png'] },
        videos: { enabled: false, max_mb: 25, max_seconds: 60, formats: ['mp4', 'mov', 'webm'] },
      }),
    )
  })
})
