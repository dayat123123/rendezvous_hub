import type * as RouterModule from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { shareLinksApi } from '../api'
import { normalizeStats } from '../logic'
import type { ShareLinksStatus } from '../types'
import { ShareLinksSection } from './share-links-section'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, shareLinksApi: { status: vi.fn(), save: vi.fn(), stats: vi.fn() } }
})

const print = Array.from({ length: 32 }, () => 'AB').join(':')

const off: ShareLinksStatus = {
  config: {
    enabled: false,
    base_url: '',
    preview: true,
    app_name: 'OLT',
    app_scheme: 'olt',
    android: [],
    ios_app_ids: [],
    android_store_url: '',
    ios_store_url: '',
    windows_download_url: '',
    macos_download_url: '',
  },
  ready: false,
  version: 1,
  updated_at: null,
  updated_by: null,
  codes: 0,
  codes_7d: 0,
}

const on: ShareLinksStatus = {
  ...off,
  config: {
    ...off.config,
    enabled: true,
    base_url: 'https://share.olt.test',
    android: [{ package: 'co.olt.app', sha256: [print] }],
    macos_download_url: 'https://unduh.olt.test/OLT.dmg',
  },
  ready: true,
  version: 2,
  updated_at: '2026-11-28T03:00:00.000Z',
  updated_by: 'Sinta',
  codes: 1250,
  codes_7d: 40,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(shareLinksApi.status).mockResolvedValue(off)
  vi.mocked(shareLinksApi.stats).mockResolvedValue(normalizeStats(null))
})

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

async function unlock(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Ubah Tautan berbagi' }))
}

describe('ShareLinksSection', () => {
  it('starts inactive with only the share fields and points to App integration for the rest', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ShareLinksSection />, monitorFixture)

    expect(await screen.findByText('Belum aktif')).toBeVisible()
    expect(screen.getByLabelText('Domain tautan')).toBeDisabled()
    expect(screen.queryByLabelText('Skema aplikasi')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Android (App Links)')).not.toBeInTheDocument()
    expect(
      screen.getByText(/Nama OLT · skema olt:\/\/ · Android 0 · iOS & Mac 0 · tautan unduh 0/),
    ).toBeVisible()
    expect(screen.getByText('Domain tautan belum diisi.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Atur di Integrasi aplikasi' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/settings', search: { section: 'appIntegration' } })
  })

  it('refuses to enable without a domain', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ShareLinksSection />, monitorFixture)
    await unlock(user)

    await user.click(screen.getByRole('switch', { name: 'Aktifkan tautan berbagi' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Isi domain tautan sebelum mengaktifkan')).toBeVisible()
    expect(shareLinksApi.save).not.toHaveBeenCalled()
  })

  it('saves only enabled, domain, and preview after confirmation', async () => {
    vi.mocked(shareLinksApi.save).mockResolvedValue(on)
    const user = userEvent.setup()
    renderWithProviders(<ShareLinksSection />, monitorFixture)
    await unlock(user)

    await user.click(screen.getByRole('switch', { name: 'Aktifkan tautan berbagi' }))
    await user.type(screen.getByLabelText('Domain tautan'), 'https://share.olt.test/')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Simpan pengaturan tautan berbagi?' })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(shareLinksApi.save).toHaveBeenCalledWith({
        enabled: true,
        base_url: 'https://share.olt.test',
        preview: true,
      }),
    )
  })

  it('shows the active status with example links and verification files', async () => {
    vi.mocked(shareLinksApi.status).mockResolvedValue(on)
    renderWithProviders(<ShareLinksSection />, monitorFixture)

    expect(await screen.findByText('Aktif')).toBeVisible()
    expect(screen.getByText(/Android 1 · iOS & Mac 0 · tautan unduh 1/)).toBeVisible()
    expect(screen.getByText('https://share.olt.test/p/Ab12Cd34Ef')).toBeVisible()
    expect(screen.getByText('olt://p/Ab12Cd34Ef')).toBeVisible()
    expect(screen.getByText('https://share.olt.test/.well-known/assetlinks.json')).toBeVisible()
    expect(screen.queryByText(/apple-app-site-association$/)).not.toBeInTheDocument()
    expect(screen.getByText(/postingan sudah punya tautan, 40 dibuat/)).toBeVisible()
  })

  it('shows an empty statistics state before anyone opens a link', async () => {
    renderWithProviders(<ShareLinksSection />, monitorFixture)
    expect(await screen.findByText('Belum ada yang membuka tautan berbagi di rentang ini.')).toBeVisible()
    expect(shareLinksApi.stats).toHaveBeenCalledWith(30)
  })

  it('shows totals and the most opened posts, and switches the range', async () => {
    vi.mocked(shareLinksApi.stats).mockResolvedValue(stats)
    const user = userEvent.setup()
    renderWithProviders(<ShareLinksSection />, monitorFixture)

    expect(await screen.findByText('1.200')).toBeVisible()
    expect(screen.getByText('+45 pratinjau WhatsApp, Telegram, dan bot')).toBeVisible()
    expect(screen.getByText('Android 20 · iPhone 5 · Windows 7 · Mac 1')).toBeVisible()
    expect(screen.getByText('Cek $BBCA hari ini')).toBeVisible()
    expect(screen.getByText('(tanpa teks)')).toBeVisible()
    expect(screen.getByText(/Ani · @ani · sudah tidak tersedia/)).toBeVisible()

    await user.click(screen.getByRole('radio', { name: '7 hari' }))
    await waitFor(() => expect(shareLinksApi.stats).toHaveBeenCalledWith(7))
  })

  it('without an app scheme the app link example is hidden', async () => {
    vi.mocked(shareLinksApi.status).mockResolvedValue({ ...on, config: { ...on.config, app_scheme: '' } })
    renderWithProviders(<ShareLinksSection />, monitorFixture)

    expect(await screen.findByText(/skema belum ada \(tombol Buka di aplikasi tidak tampil\)/)).toBeVisible()
    expect(screen.queryByText(/:\/\/p\/Ab12Cd34Ef$/)).toBeNull()
  })
})
