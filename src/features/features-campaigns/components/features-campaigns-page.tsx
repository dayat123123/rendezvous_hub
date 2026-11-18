import { SectionBoundary } from '@/components/states'
import { BannersSection } from '@/features/client-config/components/banners-section'

export function FeaturesCampaignsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <SectionBoundary label="features:banners">
        <BannersSection />
      </SectionBoundary>
    </div>
  )
}
