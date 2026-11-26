import { useTranslation } from 'react-i18next'

import { appEnv } from '@/lib/supabase'

import { researchEndpoints, researchExamples } from '../logic'
import { Endpoint, Example } from './health-usage'

export function ResearchUsage({ secret }: { secret?: string }) {
  const { t } = useTranslation()
  const env = appEnv()
  const base = env.publicApiUrl ?? env.supabaseUrl
  const urls = researchEndpoints(base)
  const examples = researchExamples(base, secret)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ul className="flex min-w-0 flex-col gap-3" aria-label={t('platform.keys.research.title')}>
        <Endpoint
          method="POST"
          label={t('platform.keys.research.submitLabel')}
          hint={t('platform.keys.research.submitHint')}
          url={urls.submit}
        />
        <Endpoint
          label={t('platform.keys.research.statusLabel')}
          hint={t('platform.keys.research.statusHint')}
          url={urls.status}
        />
      </ul>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-sm font-medium">{t('platform.keys.research.limitsTitle')}</h3>
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          <li>{t('platform.keys.research.limitSize')}</li>
          <li>{t('platform.keys.research.limitHour')}</li>
          <li>{t('platform.keys.research.limitConcurrent')}</li>
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-medium">{t('platform.keys.research.example')}</h3>
        <Example label={t('platform.keys.health.exampleShell')} text={examples.shell} />
        <Example label={t('platform.keys.health.examplePowerShell')} text={examples.powershell} />
        <p className="text-xs text-muted-foreground">
          {secret ? t('platform.keys.research.exampleReady') : t('platform.keys.research.exampleHint')}
        </p>
        <p className="text-xs text-muted-foreground">{t('platform.keys.research.docs')}</p>
      </div>
    </div>
  )
}
