import { useNavigate, useSearch } from '@tanstack/react-router'
import { PowerOffIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SectionBoundary } from '@/components/states'
import { cn } from '@/lib/utils'

import { useTradeSettings } from '../hooks'
import { KILL_SWITCH_KEY, tradeShareTab } from '../logic'
import { tradeShareTabs, type TradeShareTab } from '../types'
import { ListsTab } from './lists-tab'
import { MonitoringTab } from './monitoring-tab'
import { SettingsTab } from './settings-tab'
import { TraderSheet } from './trader-sheet'
import { TradersTab } from './traders-tab'

function FeatureOff() {
  const { t } = useTranslation()
  const settings = useTradeSettings()
  const enabled = settings.data?.find((item) => item.key === KILL_SWITCH_KEY)?.value
  if (enabled !== false) return null
  return (
    <p role="status" className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-row">
      <PowerOffIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
      {t('trade.share.featureOff')}
    </p>
  )
}

export function TradeSharePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search: { tab?: string; profile?: string } = useSearch({ strict: false })
  const tab = tradeShareTab(search.tab)
  const profile = search.profile ?? null

  const go = (next: { tab: TradeShareTab; profile?: string }) =>
    void navigate({ to: '/compliance/trade-share', search: next })
  const open = (id: string) => go({ tab, profile: id })

  const panels: Record<TradeShareTab, () => React.ReactNode> = {
    applications: () => <TradersTab key="applications" mode="applications" onOpen={open} />,
    traders: () => <TradersTab key="traders" mode="traders" onOpen={open} />,
    monitoring: () => <MonitoringTab onOpen={open} />,
    lists: () => <ListsTab />,
    settings: () => <SettingsTab />,
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-5 lg:px-6">
        <header>
          <h1 className="text-lg font-semibold">{t('trade.share.title')}</h1>
          <p className="max-w-3xl text-row text-muted-foreground">{t('trade.share.subtitle')}</p>
        </header>
        <FeatureOff />
        <div
          role="tablist"
          aria-label={t('trade.share.tabsLabel')}
          className="flex gap-4 overflow-x-auto border-b"
        >
          {tradeShareTabs.map((item) => (
            <button
              key={item}
              id={`trade-tab-${item}`}
              type="button"
              role="tab"
              aria-selected={tab === item}
              aria-controls={`trade-panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                const index = tradeShareTabs.indexOf(item)
                const next =
                  tradeShareTabs[
                    (index + (event.key === 'ArrowRight' ? 1 : tradeShareTabs.length - 1)) %
                      tradeShareTabs.length
                  ]
                if (!next) return
                go({ tab: next })
                document.getElementById(`trade-tab-${next}`)?.focus()
              }}
              onClick={() => go({ tab: item })}
              className={cn(
                'relative inline-flex h-10 shrink-0 items-center text-row whitespace-nowrap transition-colors outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset',
                tab === item
                  ? 'font-medium text-foreground after:bg-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`trade.share.tabs.${item}`)}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`trade-panel-${tab}`} aria-labelledby={`trade-tab-${tab}`}>
          <SectionBoundary key={tab} label={`trade-share:${tab}`}>
            {panels[tab]()}
          </SectionBoundary>
        </div>
      </div>
      <TraderSheet profile={profile} onClose={() => go({ tab })} />
    </div>
  )
}
