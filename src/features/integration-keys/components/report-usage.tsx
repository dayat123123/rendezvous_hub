import { useTranslation } from 'react-i18next'

import { appEnv } from '@/lib/supabase'

import { financialReportEndpoints, financialReportExamples } from '../logic'
import { Endpoint, Example } from './health-usage'

export function ReportUsage({ secret }: { secret?: string }) {
  const { t } = useTranslation()
  const env = appEnv()
  const base = env.publicApiUrl ?? env.supabaseUrl
  const urls = financialReportEndpoints(base)
  const examples = financialReportExamples(base, secret)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ul className="flex min-w-0 flex-col gap-3" aria-label={t('platform.keys.reports.title')}>
        <Endpoint
          method="POST"
          label={t('platform.keys.reports.submitLabel')}
          hint={t('platform.keys.reports.submitHint')}
          url={urls.submit}
        />
        <Endpoint
          label={t('platform.keys.reports.statusLabel')}
          hint={t('platform.keys.reports.statusHint')}
          url={urls.status}
        />
      </ul>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-sm font-medium">{t('platform.keys.reports.limitsTitle')}</h3>
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          <li>{t('platform.keys.reports.limitSize')}</li>
          <li>{t('platform.keys.reports.limitHour')}</li>
          <li>{t('platform.keys.reports.limitConcurrent')}</li>
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-medium">{t('platform.keys.reports.example')}</h3>
        <Example label={t('platform.keys.health.exampleShell')} text={examples.shell} />
        <Example label={t('platform.keys.health.examplePowerShell')} text={examples.powershell} />
        <p className="text-xs text-muted-foreground">
          {secret ? t('platform.keys.reports.exampleReady') : t('platform.keys.reports.exampleHint')}
        </p>
        <p className="text-xs text-muted-foreground">{t('platform.keys.reports.docs')}</p>
      </div>
    </div>
  )
}
