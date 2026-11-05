import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionBoundary } from '@/components/states'
import { AppIntegrationSection } from '@/features/app-integration/components/app-integration-section'
import { BannersSection } from '@/features/client-config/components/banners-section'
import { FeaturesSection } from '@/features/client-config/components/features-section'
import { cn } from '@/lib/utils'

import { appTabs, isAppTab, type AppTab } from '../types'

const panels: Record<AppTab, () => React.ReactNode> = {
  features: () => <FeaturesSection />,
  banners: () => <BannersSection />,
  connection: () => <AppIntegrationSection />,
}

export function AppPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search: { tab?: unknown } = useSearch({ strict: false })
  const tab = isAppTab(search.tab) ? search.tab : 'features'
  const open = (next: AppTab) => void navigate({ to: '/app', search: { tab: next } })
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-5 lg:px-6">
        <header>
          <h1 className="text-lg font-semibold">{t('appManagement.title')}</h1>
          <p className="max-w-3xl text-row text-muted-foreground">{t('appManagement.subtitle')}</p>
        </header>
        <div
          role="tablist"
          aria-label={t('appManagement.tabsLabel')}
          className="flex gap-4 overflow-x-auto border-b"
        >
          {appTabs.map((item) => (
            <button
              key={item}
              id={`app-tab-${item}`}
              type="button"
              role="tab"
              aria-selected={tab === item}
              aria-controls={`app-panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                const index = appTabs.indexOf(item)
                const next =
                  appTabs[(index + (event.key === 'ArrowRight' ? 1 : appTabs.length - 1)) % appTabs.length]
                if (!next) return
                open(next)
                document.getElementById(`app-tab-${next}`)?.focus()
              }}
              onClick={() => open(item)}
              className={cn(
                'relative inline-flex h-10 shrink-0 items-center text-row whitespace-nowrap transition-colors outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset',
                tab === item
                  ? 'font-medium text-foreground after:bg-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`appManagement.tabs.${item}`)}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`app-panel-${tab}`} aria-labelledby={`app-tab-${tab}`}>
        <SectionBoundary key={tab} label={`app:${tab}`}>
          {panels[tab]()}
        </SectionBoundary>
      </div>
    </div>
  )
}
