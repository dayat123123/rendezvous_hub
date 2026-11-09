import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { SettingsPage } from './settings-page'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    settingsApi: {
      ...actual.settingsApi,
      accounts: vi.fn(() => Promise.resolve([])),
      options: vi.fn(() => Promise.resolve({ teams: [], skills: [] })),
    },
  }
})

vi.mock('@/features/app-integration/components/app-integration-section', () => ({
  AppIntegrationSection: () => <p>app-integration-section</p>,
}))

const ready = {
  ...monitorFixture,
  settings: { ...monitorFixture.settings, nasabah_ready: true, community_push_ready: true },
}

function groupItems(name: string) {
  return within(screen.getByRole('group', { name }))
    .getAllByRole('button')
    .map((button) => button.textContent)
}

describe('SettingsPage', () => {
  it('groups the sections under four headings in the side menu', () => {
    renderWithProviders(<SettingsPage />, ready)

    const nav = screen.getByRole('navigation', { name: 'Pengaturan' })
    expect(
      within(nav)
        .getAllByRole('group')
        .map((group) => within(group).getByRole('heading').textContent),
    ).toEqual(['Layanan CS', 'Komunitas', 'Integrasi', 'Sistem'])
    expect(groupItems('Layanan CS')).toEqual([
      'Akun CS',
      'Quick reply',
      'Label tiket',
      'Jam layanan & libur',
      'Pesan otomatis',
      'Penugasan, tiket & alert',
    ])
    expect(groupItems('Komunitas')).toEqual(['Aturan persetujuan'])
    expect(groupItems('Integrasi')).toEqual([
      'Integrasi API Nasabah',
      'Integrasi aplikasi',
      'API Notifikasi',
      'Push notification',
    ])
    expect(groupItems('Sistem')).toEqual(['Backup', 'Alert'])
    expect(screen.getByRole('button', { name: 'Akun CS' })).toHaveAttribute('aria-current', 'page')
  })

  it('no longer offers the sections that moved to Fitur & Kampanye', () => {
    renderWithProviders(<SettingsPage />, ready)

    const nav = screen.getByRole('navigation', { name: 'Pengaturan' })
    for (const name of [/Fitur & versi/, /Banner/, /Koneksi aplikasi/]) {
      expect(within(nav).queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('keeps the setup badges on their items', () => {
    renderWithProviders(<SettingsPage />, {
      ...monitorFixture,
      settings: { ...monitorFixture.settings, nasabah_ready: false, community_push_ready: false },
    })

    const integration = within(screen.getByRole('group', { name: 'Integrasi' }))
    expect(integration.getByRole('button', { name: 'Integrasi API Nasabah Belum diatur' })).toBeVisible()
    expect(integration.getByRole('button', { name: /^Push notification .+/ })).toBeVisible()
  })

  it('opens Integrasi aplikasi from the Integrasi group', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />, ready)

    const integration = within(screen.getByRole('group', { name: 'Integrasi' }))
    await user.click(integration.getByRole('button', { name: 'Integrasi aplikasi' }))

    expect(integration.getByRole('button', { name: 'Integrasi aplikasi' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('app-integration-section')).toBeVisible()
  })
})
