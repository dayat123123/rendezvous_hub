import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SystemTabs } from '@/features/system/components/system-page'
import { healthTabs, type SystemTab } from '@/features/system/types'

import { SectionFrame } from './settings-ui'

export function SystemHealthSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search: { tab?: string } = useSearch({ strict: false })
  const tab: SystemTab = healthTabs.find((item) => item === search.tab) ?? healthTabs[0] ?? 'map'
  return (
    <SectionFrame title={t('settings.systemHealth')} description={t('settings.systemHealthDescription')}>
      <SystemTabs
        tabs={healthTabs}
        tab={tab}
        onSelect={(next) =>
          void navigate({ to: '/settings', search: { section: 'systemHealth', tab: next } })
        }
      />
    </SectionFrame>
  )
}
