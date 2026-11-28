import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { appIdentityApi } from '../api'
import type { AppIdentityStatus } from '../types'
import { AppIdentityCard } from './app-identity-card'

vi.mock('../api', () => ({ appIdentityApi: { status: vi.fn(), save: vi.fn() } }))

const print = Array.from({ length: 32 }, () => 'AB').join(':')

const empty: AppIdentityStatus = {
  identity: {
    app_name: 'OLT',
    android: [],
    ios_app_ids: [],
    android_store_url: '',
    ios_store_url: '',
    windows_download_url: '',
    macos_download_url: '',
  },
  app_scheme: 'olt',
  version: 1,
  updated_at: null,
  updated_by: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(appIdentityApi.status).mockResolvedValue(empty)
})

async function unlock(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Ubah Identitas aplikasi' }))
}

describe('AppIdentityCard', () => {
  it('shows the identity locked with all four download fields', async () => {
    renderWithProviders(<AppIdentityCard />, monitorFixture)

    expect(await screen.findByLabelText('Nama aplikasi')).toHaveValue('OLT')
    expect(screen.getByLabelText('Nama aplikasi')).toBeDisabled()
    for (const label of ['Google Play', 'App Store', 'Windows', 'Mac']) {
      expect(screen.getByLabelText(label)).toBeDisabled()
    }
    expect(screen.getByLabelText('iOS & Mac (Universal Links)')).toBeDisabled()
  })

  it('shows the Android line that is wrong and does not save', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppIdentityCard />, monitorFixture)
    await unlock(user)

    await user.type(screen.getByLabelText('Android (App Links)'), `co.olt.app ${print}{enter}olt AB`)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText(/Baris 2: package name tidak valid/)).toBeVisible()
    expect(appIdentityApi.save).not.toHaveBeenCalled()
  })

  it('saves the normalized identity after confirmation', async () => {
    vi.mocked(appIdentityApi.save).mockResolvedValue({ ...empty, version: 2 })
    const user = userEvent.setup()
    renderWithProviders(<AppIdentityCard />, monitorFixture)
    await unlock(user)

    await user.type(screen.getByLabelText('Android (App Links)'), `co.olt.app ${'ab'.repeat(32)}`)
    await user.type(screen.getByLabelText('iOS & Mac (Universal Links)'), 'ABCDE12345.co.olt.mac')
    await user.type(screen.getByLabelText('Mac'), 'https://unduh.olt.test/OLT.dmg')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Simpan identitas aplikasi?' })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(appIdentityApi.save).toHaveBeenCalledWith({
        app_name: 'OLT',
        android: [{ package: 'co.olt.app', sha256: [print] }],
        ios_app_ids: ['ABCDE12345.co.olt.mac'],
        android_store_url: '',
        ios_store_url: '',
        windows_download_url: '',
        macos_download_url: 'https://unduh.olt.test/OLT.dmg',
      }),
    )
  })
})
