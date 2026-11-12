import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/errors'
import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { Toaster } from '@/test/toast'

import { feedFiltersApi } from '../api'
import type { FeedFilter } from '../types'
import { FeedFiltersSection } from './feed-filters-section'

vi.mock('../api', () => ({
  feedFiltersApi: { list: vi.fn(), save: vi.fn(), reorder: vi.fn(), remove: vi.fn() },
}))

function filter(overrides: Partial<FeedFilter> = {}): FeedFilter {
  return {
    key: 'latest',
    label_en: 'Latest',
    label_id: 'Terbaru',
    sort: 'latest',
    content: null,
    icon: 'schedule',
    position: 0,
    enabled: true,
    updated_at: '2026-11-10T03:00:00.000Z',
    updated_by: { id: 'adi', name: 'Adi' },
    ...overrides,
  }
}

const filters = [
  filter(),
  filter({ key: 'top', label_en: 'Top', label_id: 'Teratas', sort: 'top', icon: 'trending_up', position: 1 }),
  filter({
    key: 'polls',
    label_en: 'Polls',
    label_id: 'Polling',
    content: 'poll',
    icon: 'poll',
    position: 2,
    enabled: false,
    updated_by: null,
  }),
]

function renderSection() {
  return renderWithProviders(
    <>
      <FeedFiltersSection />
      <Toaster />
    </>,
    { ...monitorFixture, roles: ['product'] },
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(feedFiltersApi.list).mockResolvedValue(filters)
})

describe('FeedFiltersSection', () => {
  it('lists the tabs in order with their rule, state, and last change', async () => {
    renderSection()
    const table = await screen.findByRole('table', { name: 'Daftar tab' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[1]?.textContent)).toEqual([
      'TerbaruInggris: Latestlatest',
      'TeratasInggris: Toptop',
      'PollingInggris: Pollspolls',
    ])
    const top = within(table).getByRole('row', { name: /Teratas/ })
    expect(within(top).getByText('Urut teratas (suka & komentar)')).toBeVisible()
    expect(within(top).getByText('Semua post')).toBeVisible()
    expect(within(top).getByText(/oleh Adi/)).toBeVisible()
    const polls = within(table).getByRole('row', { name: /Polling/ })
    expect(within(polls).getByText('Hanya post polling')).toBeVisible()
    expect(within(polls).getByRole('switch', { name: 'Aktifkan tab Polling' })).not.toBeChecked()
    expect(within(table).getByRole('button', { name: 'Naikkan Terbaru' })).toBeDisabled()
    expect(within(table).getByRole('button', { name: 'Turunkan Polling' })).toBeDisabled()

    const preview = screen.getByRole('figure', { name: 'Pratinjau tab di aplikasi' })
    expect(
      within(preview)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Terbaru', 'Teratas'])
  })

  it('validates a new tab and saves it with the chosen sort and content', async () => {
    const user = userEvent.setup()
    vi.mocked(feedFiltersApi.save).mockResolvedValue(filter({ key: 'trending' }))
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Tambah tab' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah tab Stream' })

    await user.type(within(dialog).getByLabelText('Kunci'), 'top')
    await user.type(within(dialog).getByLabelText('Ikon (opsional)'), 'trending up')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(within(dialog).getByText('Kunci ini sudah dipakai tab lain.')).toBeVisible()
    expect(within(dialog).getAllByText('Label wajib diisi.')).toHaveLength(2)
    expect(
      within(dialog).getByText('Ikon berupa nama huruf kecil, angka, atau garis bawah tanpa spasi.'),
    ).toBeVisible()
    expect(feedFiltersApi.save).not.toHaveBeenCalled()

    const key = within(dialog).getByLabelText('Kunci')
    await user.clear(key)
    await user.type(key, 'Trending')
    await user.type(within(dialog).getByLabelText('Label (Indonesia)'), ' Ramai ')
    await user.type(within(dialog).getByLabelText('Label (Inggris)'), 'Hot')
    const icon = within(dialog).getByLabelText('Ikon (opsional)')
    await user.clear(icon)
    await user.type(icon, 'whatshot')
    await user.click(within(dialog).getByRole('combobox', { name: 'Urutan post' }))
    await user.click(await screen.findByRole('option', { name: 'Urut teratas (suka & komentar)' }))
    await user.click(within(dialog).getByRole('combobox', { name: 'Jenis post' }))
    await user.click(await screen.findByRole('option', { name: 'Hanya post bergambar' }))
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(feedFiltersApi.save).toHaveBeenCalledWith({
      key: 'trending',
      label_en: 'Hot',
      label_id: 'Ramai',
      sort: 'top',
      content: 'media',
      icon: 'whatshot',
      enabled: true,
    })
    expect(await screen.findByText('Tab Ramai disimpan')).toBeVisible()
  })

  it('locks the key when editing, can return to all posts, and shows server errors', async () => {
    const user = userEvent.setup()
    vi.mocked(feedFiltersApi.save)
      .mockRejectedValueOnce(new ApiError('invalid_filter_label', 'Label filter wajib diisi', 400))
      .mockResolvedValueOnce(filters[2] as FeedFilter)
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Ubah tab Polling' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah tab Stream' })
    expect(within(dialog).getByLabelText('Kunci')).toBeDisabled()
    expect(within(dialog).getByLabelText('Kunci')).toHaveValue('polls')
    await user.click(within(dialog).getByRole('combobox', { name: 'Jenis post' }))
    await user.click(await screen.findByRole('option', { name: 'Semua post' }))
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Label tab wajib diisi, maksimal 40 karakter.')).toBeVisible()
    expect(screen.getByRole('dialog', { name: 'Ubah tab Stream' })).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(feedFiltersApi.save).toHaveBeenLastCalledWith({
      key: 'polls',
      label_en: 'Polls',
      label_id: 'Polling',
      sort: 'latest',
      content: null,
      icon: 'poll',
      enabled: false,
    })
  })

  it('toggles a tab from the table', async () => {
    const user = userEvent.setup()
    vi.mocked(feedFiltersApi.save).mockResolvedValue(filter({ key: 'polls', enabled: true }))
    renderSection()
    await user.click(await screen.findByRole('switch', { name: 'Aktifkan tab Polling' }))
    await waitFor(() =>
      expect(feedFiltersApi.save).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'polls', enabled: true }),
      ),
    )
    expect(await screen.findByText('Tab Polling diaktifkan')).toBeVisible()
  })

  it('reorders with the full key list and keeps the returned order', async () => {
    const user = userEvent.setup()
    vi.mocked(feedFiltersApi.reorder).mockResolvedValue([
      filters[1] as FeedFilter,
      filters[0] as FeedFilter,
      filters[2] as FeedFilter,
    ])
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Naikkan Teratas' }))
    await waitFor(() => expect(feedFiltersApi.reorder).toHaveBeenCalledWith(['top', 'latest', 'polls']))
    const preview = screen.getByRole('figure', { name: 'Pratinjau tab di aplikasi' })
    await waitFor(() =>
      expect(
        within(preview)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Teratas', 'Terbaru']),
    )

    vi.mocked(feedFiltersApi.reorder).mockRejectedValueOnce(
      new ApiError('invalid_filter_order', 'Urutan harus memuat setiap filter tepat satu kali', 400),
    )
    await user.click(screen.getByRole('button', { name: 'Turunkan Teratas' }))
    expect(await screen.findByText('Urutan tab sudah berubah. Daftar dimuat ulang, coba lagi.')).toBeVisible()
  })

  it('deletes a tab only after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(feedFiltersApi.remove).mockResolvedValue(filters.slice(0, 2))
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Hapus tab Polling' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Hapus tab “Polling”?' })
    expect(feedFiltersApi.remove).not.toHaveBeenCalled()
    await user.click(within(confirm).getByRole('button', { name: 'Hapus' }))
    await waitFor(() => expect(feedFiltersApi.remove).toHaveBeenCalledWith('polls'))
    expect(await screen.findByText('Tab Polling dihapus')).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('row', { name: /Polling/ })).not.toBeInTheDocument())
  })
})
