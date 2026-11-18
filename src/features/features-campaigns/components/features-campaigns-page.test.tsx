import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { FeaturesCampaignsPage } from './features-campaigns-page'

vi.mock('@/features/client-config/components/banners-section', () => ({
  BannersSection: () => <p>banners-section</p>,
}))

describe('FeaturesCampaignsPage', () => {
  it('leaves the page title to the banner section so it is not shown twice', () => {
    renderWithProviders(<FeaturesCampaignsPage />, monitorFixture)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('banners-section')).toBeVisible()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
})
