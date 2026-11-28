import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { shareLinksApi } from '../api'
import type { ShareLinksStatus } from '../types'
import { ShareLinksSection } from './share-links-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, shareLinksApi: { status: vi.fn(), save: vi.fn() } }
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
  it('starts inactive with locked fields and asks for a domain', async () => {
    renderWithProviders(<ShareLinksSection />, monitorFixture)

    expect(await screen.findByText('Belum aktif')).toBeVisible()
    expect(screen.getByLabelText('Domain tautan')).toBeDisabled()
    expect(screen.getByLabelText('Skema aplikasi')).toHaveValue('olt')
    expect(screen.getByText('Domain tautan belum diisi.')).toBeVisible()
  })

  it('refuses to enable without a domain and shows the Android line that is wrong', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ShareLinksSection />, monitorFixture)
    await unlock(user)

    await user.click(screen.getByRole('switch', { name: 'Aktifkan tautan berbagi' }))
    await user.type(screen.getByLabelText('Android (App Links)'), `co.olt.app ${print}{enter}olt AB`)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Isi domain tautan sebelum mengaktifkan')).toBeVisible()
    expect(screen.getByText(/Baris 2: package name tidak valid/)).toBeVisible()
    expect(shareLinksApi.save).not.toHaveBeenCalled()
  })

  it('saves the normalized config after confirmation', async () => {
    vi.mocked(shareLinksApi.save).mockResolvedValue(on)
    const user = userEvent.setup()
    renderWithProviders(<ShareLinksSection />, monitorFixture)
    await unlock(user)

    await user.click(screen.getByRole('switch', { name: 'Aktifkan tautan berbagi' }))
    await user.type(screen.getByLabelText('Domain tautan'), 'https://share.olt.test/')
    await user.type(screen.getByLabelText('Android (App Links)'), `co.olt.app ${'ab'.repeat(32)}`)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Simpan pengaturan tautan berbagi?' })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(shareLinksApi.save).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          base_url: 'https://share.olt.test',
          android: [{ package: 'co.olt.app', sha256: [print] }],
        }),
      ),
    )
  })

  it('shows the active status with example links and verification files', async () => {
    vi.mocked(shareLinksApi.status).mockResolvedValue(on)
    renderWithProviders(<ShareLinksSection />, monitorFixture)

    expect(await screen.findByText('Aktif')).toBeVisible()
    expect(screen.getByText('https://share.olt.test/p/Ab12Cd34Ef')).toBeVisible()
    expect(screen.getByText('olt://p/Ab12Cd34Ef')).toBeVisible()
    expect(screen.getByText('https://share.olt.test/.well-known/assetlinks.json')).toBeVisible()
    expect(screen.queryByText(/apple-app-site-association$/)).not.toBeInTheDocument()
    expect(screen.getByText(/postingan sudah punya tautan, 40 dibuat/)).toBeVisible()
  })
})
