import type * as RouterModule from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
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
})
