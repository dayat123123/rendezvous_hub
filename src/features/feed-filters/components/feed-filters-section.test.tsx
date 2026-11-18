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
  feedFiltersApi: { list: vi.fn(), setEnabled: vi.fn() },
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
    key: 'media',
    label_en: 'Chart & Media',
    label_id: 'Grafik & Media',
    content: 'media',
    icon: 'image',
    position: 2,
  }),
  filter({
    key: 'polls',
    label_en: 'Polls',
    label_id: 'Polling',
    content: 'poll',
    icon: 'poll',
    position: 3,
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
  it('lists the four built-in tabs with their rule, state, and last change', async () => {
    renderSection()
    const table = await screen.findByRole('table', { name: 'Daftar tab' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      'TerbaruInggris: Latest',
      'TeratasInggris: Top',
      'Grafik & MediaInggris: Chart & Media',
      'PollingInggris: Polls',
    ])
    const top = within(table).getByRole('row', { name: /Teratas/ })
    expect(within(top).getByText('Urut teratas (suka & komentar)')).toBeVisible()
    expect(within(top).getByText(/oleh Adi/)).toBeVisible()
    const polls = within(table).getByRole('row', { name: /Polling/ })
    expect(within(polls).getByText('Hanya post polling')).toBeVisible()
    expect(within(polls).getByRole('switch', { name: 'Aktifkan tab Polling' })).not.toBeChecked()

    const preview = screen.getByRole('figure', { name: 'Pratinjau tab di aplikasi' })
    expect(
      within(preview)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Terbaru', 'Teratas', 'Grafik & Media'])
  })

  it('offers no way to add, edit, reorder, or delete tabs', async () => {
    renderSection()
    await screen.findByRole('table', { name: 'Daftar tab' })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/tidak bisa ditambah, dihapus, atau diurutkan ulang/)).toBeVisible()
  })

  it('turns a tab on from the table and keeps the returned list', async () => {
    const user = userEvent.setup()
    vi.mocked(feedFiltersApi.setEnabled).mockResolvedValue(
      filters.map((item) => ({ ...item, enabled: true })),
    )
    renderSection()
    await user.click(await screen.findByRole('switch', { name: 'Aktifkan tab Polling' }))
    await waitFor(() => expect(feedFiltersApi.setEnabled).toHaveBeenCalledWith('polls', true))
    expect(await screen.findByText('Tab Polling diaktifkan')).toBeVisible()
    expect(screen.getByRole('switch', { name: 'Aktifkan tab Polling' })).toBeChecked()
  })

  it('turns a tab off and shows server errors', async () => {
    const user = userEvent.setup()
    vi.mocked(feedFiltersApi.setEnabled).mockRejectedValueOnce(new ApiError('filter_not_found', 'x', 404))
    renderSection()
    await user.click(await screen.findByRole('switch', { name: 'Aktifkan tab Teratas' }))
    await waitFor(() => expect(feedFiltersApi.setEnabled).toHaveBeenCalledWith('top', false))
    expect(await screen.findByText('Tab tidak ditemukan. Daftar dimuat ulang.')).toBeVisible()
  })
})
