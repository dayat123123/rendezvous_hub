import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { appEnv } from '@/lib/supabase'

import { healthCurlExample, healthEndpoints } from '../logic'

function Endpoint({ label, hint, url }: { label: string; hint: string; url: string }) {
  return (
    <li className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex min-w-0 items-start gap-2">
        <code className="min-w-0 flex-1 rounded-md bg-muted px-2 py-1 font-mono text-xs break-all">
          GET {url}
        </code>
        <CopyButton text={url} size="xs" label={label} />
      </div>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </li>
  )
}

export function HealthUsage({ secret }: { secret?: string }) {
  const { t } = useTranslation()
  const base = appEnv().publicApiUrl ?? appEnv().supabaseUrl
  const urls = healthEndpoints(base)
  const example = healthCurlExample(base, secret)
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3" aria-label={t('platform.keys.health.title')}>
        <Endpoint
          label={t('platform.keys.health.healthLabel')}
          hint={t('platform.keys.health.healthHint')}
          url={urls.health}
        />
        <Endpoint
          label={t('platform.keys.health.nodesLabel')}
          hint={t('platform.keys.health.nodesHint')}
          url={urls.nodes}
        />
      </ul>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t('platform.keys.health.example')}</h3>
          <CopyButton text={example} size="xs" label={t('platform.keys.health.example')} />
        </div>
        <pre className="max-w-full overflow-x-auto rounded-md border bg-subtle p-3 font-mono text-xs leading-relaxed">
          {example}
        </pre>
        <p className="text-xs text-muted-foreground">{t('platform.keys.health.privacy')}</p>
        <p className="text-xs text-muted-foreground">{t('platform.keys.health.docs')}</p>
      </div>
    </div>
  )
}
