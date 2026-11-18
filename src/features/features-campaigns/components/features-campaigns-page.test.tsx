import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { FeaturesCampaignsPage } from './features-campaigns-page'

vi.mock('@/features/client-config/components/banners-section', () => ({
  BannersSection: () => <p>banners-section</p>,
}))

describe('FeaturesCampaignsPage', () => {
  it('shows only the banner and popup campaigns, and points to Komunitas for the moved tabs', () => {
    renderWithProviders(<FeaturesCampaignsPage />, monitorFixture)

    expect(screen.getByRole('heading', { name: 'Banner & Popup', level: 1 })).toBeVisible()
    expect(screen.getByText(/Fitur & versi serta Tab Stream ada di menu Komunitas/)).toBeVisible()
    expect(screen.getByText('banners-section')).toBeVisible()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
})
