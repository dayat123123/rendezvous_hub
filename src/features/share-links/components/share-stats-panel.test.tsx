import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { shareLinksApi } from '../api'
import { normalizeStats } from '../logic'
import { ShareStatsPanel } from './share-stats-card'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, shareLinksApi: { status: vi.fn(), save: vi.fn(), stats: vi.fn() } }
})

const range = { from: '2026-10-30', to: '2026-11-28' }

const stats = normalizeStats({
  days: 30,
  totals: {
    views: 1200,
    previews: 45,
    opens: 300,
    app_opens: 80,
    android: 20,
    ios: 5,
    windows: 7,
    mac: 1,
    posts: 2,
  },
  daily: [
    { day: '2026-11-27', views: 700, opens: 100, app_opens: 30, downloads: 10 },
    { day: '2026-11-28', views: 500, opens: 200, app_opens: 50, downloads: 23 },
  ],
  top: [
    {
      code: 'Ab12Cd34Ef',
      post_id: 'p1',
      author_username: 'olt_research',
      author_name: 'OLT Research',
      body: 'Cek $BBCA hari ini',
      available: true,
      views: 1000,
      previews: 40,
      opens: 250,
      app_opens: 70,
      downloads: 30,
    },
    {
      code: 'Zz12Cd34Ef',
      post_id: 'p2',
      author_username: 'ani',
      author_name: 'Ani',
      body: '',
      available: false,
      views: 200,
      previews: 5,
      opens: 50,
      app_opens: 10,
      downloads: 3,
    },
  ],
})

beforeEach(() => vi.clearAllMocks())

describe('ShareStatsPanel', () => {
  it('reads the page range and shows totals and the most opened posts', async () => {
    vi.mocked(shareLinksApi.stats).mockResolvedValue(stats)
    renderWithProviders(<ShareStatsPanel range={range} />, monitorFixture)

    expect(await screen.findByText('1.200')).toBeVisible()
    expect(shareLinksApi.stats).toHaveBeenCalledWith(range)
    expect(screen.getByText('+45 pratinjau WhatsApp, Telegram, dan bot')).toBeVisible()
    expect(screen.getByText('Android 20 · iPhone 5 · Windows 7 · Mac 1')).toBeVisible()
    expect(screen.getByText('Cek $BBCA hari ini')).toBeVisible()
    expect(screen.getByText('(tanpa teks)')).toBeVisible()
    expect(screen.getByText(/Ani · @ani · sudah tidak tersedia/)).toBeVisible()
  })

  it('shows an empty state before anyone opens a link', async () => {
    vi.mocked(shareLinksApi.stats).mockResolvedValue(normalizeStats(null))
    renderWithProviders(<ShareStatsPanel range={range} />, monitorFixture)
    await waitFor(() => expect(shareLinksApi.stats).toHaveBeenCalled())
    expect(await screen.findByText('Belum ada yang membuka tautan berbagi di rentang ini.')).toBeVisible()
  })
})
