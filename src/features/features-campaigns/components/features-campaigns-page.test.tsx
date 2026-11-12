import type * as RouterModule from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { FeaturesCampaignsPage } from './features-campaigns-page'

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

vi.mock('@/features/feed-filters/components/feed-filters-section', () => ({
  FeedFiltersSection: () => <p>feed-filters-section</p>,
}))

beforeEach(() => {
  router.navigate.mockClear()
  router.search = {}
})

describe('FeaturesCampaignsPage', () => {
  it('shows the three tabs and opens Fitur & versi by default', () => {
    renderWithProviders(<FeaturesCampaignsPage />, monitorFixture)

    expect(screen.getByRole('heading', { name: 'Fitur & Kampanye', level: 1 })).toBeVisible()
    expect(
      screen.getByText(
        'Fitur sosial, kill switch, versi minimum aplikasi, serta kampanye banner dan popup untuk nasabah.',
      ),
    ).toBeVisible()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Fitur & versi', 'Banner & popup', 'Tab Stream'])
    expect(screen.getByRole('tab', { name: 'Fitur & versi' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Fitur & versi' })).toHaveTextContent('features-section')
    expect(screen.queryByRole('tab', { name: /Koneksi aplikasi/ })).not.toBeInTheDocument()
  })

  it('renders the tab named in the search param', () => {
    router.search = { tab: 'banners' }
    renderWithProviders(<FeaturesCampaignsPage />, monitorFixture)

    expect(screen.getByRole('tab', { name: 'Banner & popup' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Banner & popup' })).toHaveTextContent('banners-section')
    expect(screen.queryByText('features-section')).not.toBeInTheDocument()
  })

  it('falls back to Fitur & versi for an unknown or removed tab in the address', () => {
    for (const tab of ['backup', 'connection']) {
      router.search = { tab }
      const view = renderWithProviders(<FeaturesCampaignsPage />, monitorFixture)

      expect(screen.getByRole('tab', { name: 'Fitur & versi' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tabpanel', { name: 'Fitur & versi' })).toHaveTextContent('features-section')
      view.unmount()
    }
  })

  it('switches tabs through the search param on click and with the arrow keys', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FeaturesCampaignsPage />, monitorFixture)

    await user.click(screen.getByRole('tab', { name: 'Banner & popup' }))
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/features', search: { tab: 'banners' } })

    screen.getByRole('tab', { name: 'Fitur & versi' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/features', search: { tab: 'banners' } })
    expect(screen.getByRole('tab', { name: 'Banner & popup' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/features', search: { tab: 'stream' } })
    expect(screen.getByRole('tab', { name: 'Tab Stream' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/features', search: { tab: 'features' } })
    expect(screen.getByRole('tab', { name: 'Fitur & versi' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/features', search: { tab: 'stream' } })
  })

  it('opens the Stream tabs section from the search param', () => {
    router.search = { tab: 'stream' }
    renderWithProviders(<FeaturesCampaignsPage />, monitorFixture)

    expect(screen.getByRole('tab', { name: 'Tab Stream' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Tab Stream' })).toHaveTextContent('feed-filters-section')
  })
})
