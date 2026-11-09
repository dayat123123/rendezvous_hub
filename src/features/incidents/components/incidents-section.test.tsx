import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as FaqApiModule from '@/features/faq/api'
import { faqApi } from '@/features/faq/api'
import type { FaqArticle } from '@/features/faq/types'
import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { incidentsApi } from '../api'
import type { Incident } from '../types'
import { IncidentsSection } from './incidents-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, incidentsApi: { list: vi.fn(), save: vi.fn(), end: vi.fn() } }
})

vi.mock('@/features/faq/api', async (importOriginal) => {
  const actual = await importOriginal<typeof FaqApiModule>()
  return { ...actual, faqApi: { ...actual.faqApi, overview: vi.fn() } }
})

const outage: Incident = {
  id: 'inc-1',
  title_id: 'Gangguan transfer antarbank',
  title_en: 'Interbank transfer outage',
  body_id: 'Transfer antarbank tertunda.',
  body_en: 'Interbank transfers are delayed.',
  level: 'critical',
  starts_at: '2026-11-09T01:00:00.000Z',
  ends_at: null,
  faq_article_id: null,
  created_at: '2026-11-09T01:00:00.000Z',
  updated_at: '2026-11-09T01:00:00.000Z',
  updated_by_name: 'Sinta',
  active: true,
  tickets: 12,
}

const article = (id: string, status: FaqArticle['status'], question: string) =>
  ({ id, status, question_id: question }) as FaqArticle

describe('IncidentsSection', () => {
  beforeEach(() => {
    vi.mocked(incidentsApi.list).mockReset().mockResolvedValue([outage])
    vi.mocked(incidentsApi.save).mockReset()
    vi.mocked(incidentsApi.end).mockReset()
    vi.mocked(faqApi.overview)
      .mockReset()
      .mockResolvedValue({
        categories: [],
        articles: [
          article('a1', 'published', 'Cara cek status transfer'),
          article('a2', 'draft', 'Draf artikel'),
        ],
      })
  })

  it('lists notices with level, status and ticket count', async () => {
    renderWithProviders(<IncidentsSection />, monitorFixture)

    const row = (await screen.findByText('Gangguan transfer antarbank')).closest('tr')
    expect(row).not.toBeNull()
    const cells = within(row as HTMLElement)
    expect(cells.getByText('Kritis')).toBeInTheDocument()
    expect(cells.getByText('Aktif')).toBeInTheDocument()
    expect(cells.getByText('12')).toBeInTheDocument()
    expect(cells.getByText(/sampai diakhiri/)).toBeInTheDocument()
  })

  it('validates and creates a notice with a WIB window and a published article', async () => {
    const user = userEvent.setup()
    vi.mocked(incidentsApi.save).mockResolvedValue({ ...outage, id: 'inc-2', title_id: 'Aplikasi lambat' })
    renderWithProviders(<IncidentsSection />, monitorFixture)

    await user.click(await screen.findByRole('button', { name: 'Buat pengumuman' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(within(dialog).getAllByText('Judul 3–100 karakter')).toHaveLength(2)
    expect(incidentsApi.save).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText('Judul (Indonesia)'), 'Aplikasi lambat')
    await user.type(within(dialog).getByLabelText('Judul (Inggris)'), 'App is slow')
    await user.type(within(dialog).getByLabelText('Isi (Indonesia)'), 'Kami sedang memperbaiki.')
    await user.type(within(dialog).getByLabelText('Isi (Inggris)'), 'We are fixing it.')
    await user.click(within(dialog).getByRole('radio', { name: 'Info' }))
    await user.type(within(dialog).getByLabelText('Mulai (WIB)'), '2026-11-10T09:00')
    await user.type(within(dialog).getByLabelText('Selesai (WIB)'), '2026-11-10T08:00')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(within(dialog).getByText('Waktu selesai harus setelah waktu mulai')).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('Selesai (WIB)'))
    await user.type(within(dialog).getByLabelText('Selesai (WIB)'), '2026-11-10T12:30')
    await user.click(within(dialog).getByRole('combobox', { name: 'Artikel FAQ terkait' }))
    expect(screen.queryByRole('option', { name: 'Draf artikel' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: 'Cara cek status transfer' }))
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(incidentsApi.save).toHaveBeenCalledWith({
        id: null,
        title_id: 'Aplikasi lambat',
        title_en: 'App is slow',
        body_id: 'Kami sedang memperbaiki.',
        body_en: 'We are fixing it.',
        level: 'info',
        starts_at: '2026-11-10T02:00:00.000Z',
        ends_at: '2026-11-10T05:30:00.000Z',
        faq_article_id: 'a1',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Aplikasi lambat')).toBeInTheDocument()
  })

  it('ends an active notice only after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(incidentsApi.end).mockResolvedValue({
      ...outage,
      active: false,
      ends_at: '2026-11-09T03:00:00.000Z',
    })
    renderWithProviders(<IncidentsSection />, monitorFixture)

    await user.click(
      await screen.findByRole('button', { name: 'Akhiri pengumuman Gangguan transfer antarbank' }),
    )
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText(/langsung hilang dari aplikasi nasabah/)).toBeInTheDocument()
    expect(incidentsApi.end).not.toHaveBeenCalled()
    await user.click(within(confirm).getByRole('button', { name: 'Akhiri sekarang' }))

    await waitFor(() => expect(incidentsApi.end).toHaveBeenCalledWith('inc-1'))
    expect(await screen.findByText('Selesai')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Akhiri pengumuman Gangguan transfer antarbank' }),
    ).not.toBeInTheDocument()
  })
})
