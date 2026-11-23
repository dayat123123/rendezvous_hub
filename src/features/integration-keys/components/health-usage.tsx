import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { appEnv } from '@/lib/supabase'

import { healthEndpoints, healthExamples } from '../logic'

function Endpoint({ label, hint, url }: { label: string; hint: string; url: string }) {
  return (
    <li className="flex min-w-0 flex-col gap-1">
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

function Example({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton text={text} size="xs" label={label} />
      </div>
      <pre className="max-w-full rounded-md border bg-subtle p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  )
}

export function HealthUsage({ secret }: { secret?: string }) {
  const { t } = useTranslation()
  const env = appEnv()
  const base = env.publicApiUrl ?? env.supabaseUrl
  const urls = healthEndpoints(base)
  const examples = healthExamples(base, secret)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ul className="flex min-w-0 flex-col gap-3" aria-label={t('platform.keys.health.title')}>
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
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-medium">{t('platform.keys.health.example')}</h3>
        <Example label={t('platform.keys.health.exampleShell')} text={examples.shell} />
        <Example label={t('platform.keys.health.examplePowerShell')} text={examples.powershell} />
        <p className="text-xs text-muted-foreground">
          {secret ? t('platform.keys.health.exampleReady') : t('platform.keys.health.exampleHint')}
        </p>
        <p className="text-xs text-muted-foreground">{t('platform.keys.health.privacy')}</p>
        <p className="text-xs text-muted-foreground">{t('platform.keys.health.docs')}</p>
      </div>
    </div>
  )
}
