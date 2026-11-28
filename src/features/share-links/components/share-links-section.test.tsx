import type * as RouterModule from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { shareLinksApi } from '../api'
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

  it('points to Komunitas → Analitik for the statistics', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ShareLinksSection />, monitorFixture)
    expect(await screen.findByText(/kini ada di Komunitas → Analitik/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Buka Analitik' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/community', search: { tab: 'analytics' } })
    expect(shareLinksApi.stats).not.toHaveBeenCalled()
  })

  it('without an app scheme the app link example is hidden', async () => {
    vi.mocked(shareLinksApi.status).mockResolvedValue({ ...on, config: { ...on.config, app_scheme: '' } })
    renderWithProviders(<ShareLinksSection />, monitorFixture)

    expect(await screen.findByText(/skema belum ada \(tombol Buka di aplikasi tidak tampil\)/)).toBeVisible()
    expect(screen.queryByText(/:\/\/p\/Ab12Cd34Ef$/)).toBeNull()
  })
})
