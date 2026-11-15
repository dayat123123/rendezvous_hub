import type * as RouterModule from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/nav-config', () => ({ SHOW_SYSTEM_HEALTH_NAV: false, SHOW_TRADE_SHARE: true }))

import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { SystemPage } from './system-page'

const router = vi.hoisted(() => {
  const search: { tab?: string } = {}
  return { navigate: vi.fn(), search }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  return { ...actual, useNavigate: () => router.navigate, useSearch: () => router.search }
})

vi.mock('./status-tab', () => ({ StatusTab: () => <p>status-tab</p> }))
vi.mock('./healer-tab', () => ({ HealerTab: () => <p>healer-tab</p> }))
vi.mock('./backup-tab', () => ({ BackupTab: () => <p>backup-tab</p> }))
vi.mock('./alerts-tab', () => ({ AlertsTab: () => <p>alerts-tab</p> }))
vi.mock('@/features/trade-share/relay/components/relay-tab', () => ({ RelayTab: () => <p>relay-tab</p> }))

beforeEach(() => {
  router.search = {}
})

describe('SystemPage', () => {
  it('renders the tab named in the search param', () => {
    router.search = { tab: 'backup' }
    renderWithProviders(<SystemPage />, monitorFixture)
    expect(screen.getByText('backup-tab')).toBeVisible()
  })

  it('falls back to the status tab for an unknown tab', () => {
    router.search = { tab: 'nope' }
    renderWithProviders(<SystemPage />, monitorFixture)
    expect(screen.getByText('status-tab')).toBeVisible()
  })

  it('lists Relay Trade among the Super Admin tabs', () => {
    router.search = { tab: 'relay' }
    renderWithProviders(<SystemPage />, monitorFixture)
    expect(screen.getByText('relay-tab')).toBeVisible()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
  })

  it('shows relay operators only the Relay Trade tab', () => {
    router.search = { tab: 'backup' }
    renderWithProviders(<SystemPage />, {
      ...agentFixture,
      roles: ['community'],
      trade_permissions: ['trade_relay.operate'],
    })
    expect(screen.getByText('relay-tab')).toBeVisible()
    expect(screen.queryByText('backup-tab')).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Relay Trade'])
  })
})
