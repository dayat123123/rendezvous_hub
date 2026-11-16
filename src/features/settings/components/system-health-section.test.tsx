import type * as RouterModule from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/nav-config', () => ({ SHOW_SYSTEM_HEALTH_NAV: false, SHOW_TRADE_SHARE: false }))

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { SystemHealthSection } from './system-health-section'

const router = vi.hoisted(() => {
  const search: { tab?: string } = {}
  return { navigate: vi.fn(), search }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  return { ...actual, useNavigate: () => router.navigate, useSearch: () => router.search }
})

vi.mock('@/features/system/components/map-tab', () => ({ MapTab: () => <p>map-tab</p> }))
vi.mock('@/features/system/components/status-tab', () => ({ StatusTab: () => <p>status-tab</p> }))
vi.mock('@/features/system/components/healer-tab', () => ({ HealerTab: () => <p>healer-tab</p> }))
vi.mock('@/features/system/components/backup-tab', () => ({ BackupTab: () => <p>backup-tab</p> }))
vi.mock('@/features/system/components/alerts-tab', () => ({ AlertsTab: () => <p>alerts-tab</p> }))

beforeEach(() => {
  router.search = {}
  router.navigate.mockClear()
})

describe('SystemHealthSection', () => {
  it('opens on the service map and leaves Backup and Alert to their own settings sections', () => {
    renderWithProviders(<SystemHealthSection />, monitorFixture)

    expect(screen.getByRole('heading', { name: 'Kesehatan sistem' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Peta layanan',
      'Status',
      'Restart otomatis',
    ])
    expect(screen.getByText('map-tab')).toBeVisible()
  })

  it('keeps the chosen tab in the settings address', async () => {
    const user = userEvent.setup()
    router.search = { tab: 'healer' }
    renderWithProviders(<SystemHealthSection />, monitorFixture)

    expect(screen.getByText('healer-tab')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Status' }))
    expect(router.navigate).toHaveBeenCalledWith({
      to: '/settings',
      search: { section: 'systemHealth', tab: 'status' },
    })
  })
})
