import { useTranslation } from 'react-i18next'

import { SectionBoundary } from '@/components/states'
import { BannersSection } from '@/features/client-config/components/banners-section'

export function FeaturesCampaignsPage() {
  const { t } = useTranslation()
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-5 lg:px-6">
        <header>
          <h1 className="text-lg font-semibold">{t('featuresCampaigns.title')}</h1>
          <p className="max-w-3xl text-row text-muted-foreground">{t('featuresCampaigns.subtitle')}</p>
        </header>
      </div>
      <SectionBoundary label="features:banners">
        <BannersSection />
      </SectionBoundary>
    </div>
  )
}
