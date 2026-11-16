import type * as RouterModule from '@tanstack/react-router'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/nav-config', () => ({ SHOW_SYSTEM_HEALTH_NAV: false, SHOW_TRADE_SHARE: true }))

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

vi.mock('@/features/trade-share/relay/components/relay-settings-section', () => ({
  RelaySettingsSection: () => <p>relay-settings-section</p>,
}))

const router = vi.hoisted(() => {
  const search: { section?: string } = {}
  return { navigate: vi.fn(), search }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  return { ...actual, useNavigate: () => router.navigate, useSearch: () => router.search }
})

beforeEach(() => {
  router.search = {}
  router.navigate.mockReset()
})

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
      'Lampiran chat CS',
      'Penugasan, tiket & alert',
      'Status layanan / gangguan',
      'Survei kepuasan',
    ])
    expect(groupItems('Komunitas')).toEqual(['Aturan persetujuan'])
    expect(groupItems('Integrasi')).toEqual([
      'Integrasi API Nasabah',
      'Integrasi aplikasi',
      'API Notifikasi',
      'Relay Trade',
      'Push notification',
    ])
    expect(groupItems('Sistem')).toEqual(['Kesehatan sistem', 'Backup', 'Alert'])
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

  it('keeps the chosen section in the address', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />, ready)

    const integration = within(screen.getByRole('group', { name: 'Integrasi' }))
    await user.click(integration.getByRole('button', { name: 'Integrasi aplikasi' }))

    expect(router.navigate).toHaveBeenCalledWith({ to: '/settings', search: { section: 'appIntegration' } })
  })

  it('opens the section named in the address', () => {
    router.search = { section: 'appIntegration' }
    renderWithProviders(<SettingsPage />, ready)

    const integration = within(screen.getByRole('group', { name: 'Integrasi' }))
    expect(integration.getByRole('button', { name: 'Integrasi aplikasi' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('app-integration-section')).toBeVisible()
  })

  it('opens Relay Trade from the address used by Sistem → Relay Trade', () => {
    router.search = { section: 'tradeRelay' }
    renderWithProviders(<SettingsPage />, ready)

    expect(screen.getByRole('button', { name: 'Relay Trade' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('relay-settings-section')).toBeVisible()
  })

  it('falls back to Akun CS for an unknown section', () => {
    router.search = { section: 'nope' }
    renderWithProviders(<SettingsPage />, ready)

    expect(screen.getByRole('button', { name: 'Akun CS' })).toHaveAttribute('aria-current', 'page')
  })
})
