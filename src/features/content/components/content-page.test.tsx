import type * as RouterModule from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { canManageContent } from '@/features/presence/types'
import { settingsSections, staffRoles } from '@/features/settings/types'
import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { ContentPage } from './content-page'

const router = vi.hoisted(() => {
  const search: { tab?: string } = {}
  return { navigate: vi.fn(), search }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  return { ...actual, useNavigate: () => router.navigate, useSearch: () => router.search }
})

vi.mock('@/features/settings/components/topics-section', () => ({
  TopicsSection: () => <p>topics-section</p>,
}))

beforeEach(() => {
  router.navigate.mockClear()
  router.search = {}
})

const content = { ...agentFixture, roles: ['cs_content' as const] }

describe('ContentPage', () => {
  it('opens the Topik tab for the service content role', () => {
    renderWithProviders(<ContentPage />, content)

    expect(screen.getByRole('heading', { name: 'Konten Layanan', level: 1 })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Topik chat CS' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Topik chat CS' })).toHaveTextContent('topics-section')
  })

  it('falls back to Topik for an unknown tab in the address', () => {
    router.search = { tab: 'nope' }
    renderWithProviders(<ContentPage />, monitorFixture)

    expect(screen.getByRole('tabpanel', { name: 'Topik chat CS' })).toHaveTextContent('topics-section')
  })
})

describe('service content role', () => {
  it('lets Super Admins and the content role manage content, nobody else', () => {
    expect(canManageContent(content)).toBe(true)
    expect(canManageContent(monitorFixture)).toBe(true)
    expect(canManageContent(agentFixture)).toBe(false)
    expect(canManageContent({ roles: ['product'] })).toBe(false)
  })

  it('offers the role in the account form and moves topics out of Settings', () => {
    expect(staffRoles).toContain('cs_content')
    expect(settingsSections).not.toContain('topics')
  })
})
