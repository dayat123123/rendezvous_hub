import type * as RouterModule from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { AppPage } from './app-page'

const router = vi.hoisted(() => {
  const search: { tab?: string } = {}
  return { navigate: vi.fn(), search }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  return { ...actual, useNavigate: () => router.navigate, useSearch: () => router.search }
})

vi.mock('@/features/client-config/components/features-section', () => ({
  FeaturesSection: () => <p>features-section</p>,
}))

vi.mock('@/features/client-config/components/banners-section', () => ({
  BannersSection: () => <p>banners-section</p>,
}))

vi.mock('@/features/app-integration/components/app-integration-section', () => ({
  AppIntegrationSection: () => <p>app-integration-section</p>,
}))

beforeEach(() => {
  router.navigate.mockClear()
  router.search = {}
})

describe('AppPage', () => {
  it('shows the three app tabs and opens Fitur & versi by default', () => {
    renderWithProviders(<AppPage />, monitorFixture)

    expect(screen.getByRole('heading', { name: 'Aplikasi', level: 1 })).toBeVisible()
    expect(screen.getByText('Atur apa yang tampil dan berjalan di aplikasi nasabah.')).toBeVisible()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Fitur & versi',
      'Banner & popup',
      'Koneksi aplikasi',
    ])
    expect(screen.getByRole('tab', { name: 'Fitur & versi' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Fitur & versi' })).toHaveTextContent('features-section')
  })

  it('renders the tab named in the search param', () => {
    router.search = { tab: 'connection' }
    renderWithProviders(<AppPage />, monitorFixture)

    expect(screen.getByRole('tab', { name: 'Koneksi aplikasi' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Koneksi aplikasi' })).toHaveTextContent(
      'app-integration-section',
    )
    expect(screen.queryByText('features-section')).not.toBeInTheDocument()
  })

  it('falls back to Fitur & versi for an unknown tab in the address', () => {
    router.search = { tab: 'backup' }
    renderWithProviders(<AppPage />, monitorFixture)

    expect(screen.getByRole('tab', { name: 'Fitur & versi' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Fitur & versi' })).toHaveTextContent('features-section')
  })

  it('switches tabs through the search param on click and with the arrow keys', async () => {
    const user = userEvent.setup()
    router.search = { tab: 'banners' }
    renderWithProviders(<AppPage />, monitorFixture)

    expect(screen.getByRole('tabpanel', { name: 'Banner & popup' })).toHaveTextContent('banners-section')

    await user.click(screen.getByRole('tab', { name: 'Koneksi aplikasi' }))
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/app', search: { tab: 'connection' } })

    screen.getByRole('tab', { name: 'Banner & popup' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/app', search: { tab: 'connection' } })
    expect(screen.getByRole('tab', { name: 'Koneksi aplikasi' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/app', search: { tab: 'features' } })
    expect(screen.getByRole('tab', { name: 'Fitur & versi' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/app', search: { tab: 'connection' } })
  })
})
