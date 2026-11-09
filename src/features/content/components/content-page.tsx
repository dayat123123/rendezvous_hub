import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionBoundary } from '@/components/states'
import { FaqSection } from '@/features/faq/components/faq-section'
import { TopicsSection } from '@/features/settings/components/topics-section'
import { cn } from '@/lib/utils'

import { contentTabs, isContentTab, type ContentTab } from '../types'

const panels: Record<ContentTab, () => React.ReactNode> = {
  topics: () => <TopicsSection />,
  faq: () => <FaqSection />,
}

export function ContentPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search: { tab?: unknown } = useSearch({ strict: false })
  const tab = isContentTab(search.tab) ? search.tab : 'topics'
  const open = (next: ContentTab) => void navigate({ to: '/content', search: { tab: next } })
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-5 lg:px-6">
        <header>
          <h1 className="text-lg font-semibold">{t('content.title')}</h1>
          <p className="max-w-3xl text-row text-muted-foreground">{t('content.subtitle')}</p>
        </header>
        <div
          role="tablist"
          aria-label={t('content.tabsLabel')}
          className="flex gap-4 overflow-x-auto border-b"
        >
          {contentTabs.map((item) => (
            <button
              key={item}
              id={`content-tab-${item}`}
              type="button"
              role="tab"
              aria-selected={tab === item}
              aria-controls={`content-panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                const index = contentTabs.indexOf(item)
                const step = event.key === 'ArrowRight' ? 1 : contentTabs.length - 1
                const next = contentTabs[(index + step) % contentTabs.length]
                if (!next) return
                open(next)
                document.getElementById(`content-tab-${next}`)?.focus()
              }}
              onClick={() => open(item)}
              className={cn(
                'relative inline-flex h-10 shrink-0 items-center text-row whitespace-nowrap transition-colors outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset',
                tab === item
                  ? 'font-medium text-foreground after:bg-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`content.tabs.${item}`)}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`content-panel-${tab}`} aria-labelledby={`content-tab-${tab}`}>
        <SectionBoundary key={tab} label={`content:${tab}`}>
          {panels[tab]()}
        </SectionBoundary>
      </div>
    </div>
  )
}
