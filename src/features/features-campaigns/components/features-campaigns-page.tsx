import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionBoundary } from '@/components/states'
import { BannersSection } from '@/features/client-config/components/banners-section'
import { FeaturesSection } from '@/features/client-config/components/features-section'
import { cn } from '@/lib/utils'

import { featuresCampaignsTabs, isFeaturesCampaignsTab, type FeaturesCampaignsTab } from '../types'

const panels: Record<FeaturesCampaignsTab, () => React.ReactNode> = {
  features: () => <FeaturesSection />,
  banners: () => <BannersSection />,
}

export function FeaturesCampaignsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search: { tab?: unknown } = useSearch({ strict: false })
  const tab = isFeaturesCampaignsTab(search.tab) ? search.tab : 'features'
  const open = (next: FeaturesCampaignsTab) => void navigate({ to: '/features', search: { tab: next } })
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-5 lg:px-6">
        <header>
          <h1 className="text-lg font-semibold">{t('featuresCampaigns.title')}</h1>
          <p className="max-w-3xl text-row text-muted-foreground">{t('featuresCampaigns.subtitle')}</p>
        </header>
        <div
          role="tablist"
          aria-label={t('featuresCampaigns.tabsLabel')}
          className="flex gap-4 overflow-x-auto border-b"
        >
          {featuresCampaignsTabs.map((item) => (
            <button
              key={item}
              id={`features-tab-${item}`}
              type="button"
              role="tab"
              aria-selected={tab === item}
              aria-controls={`features-panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                const index = featuresCampaignsTabs.indexOf(item)
                const step = event.key === 'ArrowRight' ? 1 : featuresCampaignsTabs.length - 1
                const next = featuresCampaignsTabs[(index + step) % featuresCampaignsTabs.length]
                if (!next) return
                open(next)
                document.getElementById(`features-tab-${next}`)?.focus()
              }}
              onClick={() => open(item)}
              className={cn(
                'relative inline-flex h-10 shrink-0 items-center text-row whitespace-nowrap transition-colors outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset',
                tab === item
                  ? 'font-medium text-foreground after:bg-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`featuresCampaigns.tabs.${item}`)}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`features-panel-${tab}`} aria-labelledby={`features-tab-${tab}`}>
        <SectionBoundary key={tab} label={`features:${tab}`}>
          {panels[tab]()}
        </SectionBoundary>
      </div>
    </div>
  )
}
