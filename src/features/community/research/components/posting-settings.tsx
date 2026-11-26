import { LoaderCircleIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui/controls'
import { Label } from '@/components/ui/label'
import { useAgent } from '@/features/auth/hooks'
import { isSuperAdmin } from '@/features/presence/types'
import { QueryContent, SettingsCard } from '@/features/settings/components/settings-ui'
import { FieldText } from '@/features/system/components/system-ui'

import { useOfficialAccounts } from '../../hooks'
import type { AccountRef } from '../../types'
import { useResearchConfig, useSaveResearchConfig } from '../hooks'
import { researchErrorText } from '../logic'
import type { ResearchConfig } from '../types'
import { useReportText } from './report-text'

const NONE = 'none'

const accountName = (account: AccountRef) =>
  `${account.display_name ?? account.username} (@${account.username})`

function ChangedLine({ config }: { config: ResearchConfig }) {
  const { t, stamp } = useReportText()
  return (
    <p className="text-xs text-muted-foreground">
      {config.updated_by?.name
        ? t('moderation.research.settings.changedBy', {
            time: stamp(config.updated_at),
            name: config.updated_by.name,
          })
        : t('moderation.research.settings.changed', { time: stamp(config.updated_at) })}
    </p>
  )
}

function SettingsView({ config }: { config: ResearchConfig }) {
  const { t } = useReportText()
  const account = config.official_account
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{t('moderation.research.settings.account')}</dt>
          <dd className="text-row">
            {account
              ? config.official_active
                ? accountName(account)
                : t('moderation.research.settings.accountInactive', { name: accountName(account) })
              : t('moderation.research.settings.accountNone')}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{t('moderation.research.settings.autoPublish')}</dt>
          <dd className="text-row">
            {config.auto_publish
              ? t('moderation.research.settings.on')
              : t('moderation.research.settings.off')}
          </dd>
        </div>
      </dl>
      <p className="max-w-3xl text-xs text-muted-foreground">
        {t('moderation.research.settings.autoPublishHint')}
      </p>
      <ChangedLine config={config} />
      <p className="text-xs text-muted-foreground">{t('moderation.research.settings.readOnly')}</p>
    </div>
  )
}

function SettingsForm({ config }: { config: ResearchConfig }) {
  const { t } = useReportText()
  const id = useId()
  const accounts = useOfficialAccounts()
  const save = useSaveResearchConfig()
  const [account, setAccount] = useState<string | null>(config.official_account?.id ?? null)
  const [auto, setAuto] = useState(config.auto_publish)
  const active = (accounts.data ?? []).filter((item) => item.disabled_at === null)
  const current = config.official_account
  const kept = current && !active.some((item) => item.id === current.id) ? current : null
  const changed = account !== (current?.id ?? null) || auto !== config.auto_publish

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(
          { account, autoPublish: auto },
          {
            onSuccess: () => toast.success(t('moderation.research.settings.saved')),
            onError: (error) => toast.error(researchErrorText(error)),
          },
        )
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-account`}>{t('moderation.research.settings.account')}</Label>
        <Select value={account ?? NONE} onValueChange={(value) => setAccount(value === NONE ? null : value)}>
          <SelectTrigger
            id={`${id}-account`}
            className="w-full sm:w-96"
            aria-describedby={`${id}-account-text`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t('moderation.research.settings.accountNone')}</SelectItem>
            {kept ? (
              <SelectItem value={kept.id}>
                {t('moderation.research.settings.accountInactive', { name: accountName(kept) })}
              </SelectItem>
            ) : null}
            {active.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {accountName(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldText
          id={`${id}-account-text`}
          error={accounts.isError ? t('moderation.research.settings.accountsFailed') : undefined}
          hint={
            accounts.isPending
              ? t('moderation.research.settings.accountsLoading')
              : t('moderation.research.settings.accountHint')
          }
        />
      </div>
      <label className="flex items-start gap-2 text-row">
        <Switch className="mt-0.5" checked={auto} onCheckedChange={setAuto} />
        <span>
          <span className="block font-medium">{t('moderation.research.settings.autoPublish')}</span>
          <span className="block text-xs text-muted-foreground">
            {t('moderation.research.settings.autoPublishHint')}
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={!changed || save.isPending}>
          {save.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t('moderation.research.settings.save')}
        </Button>
        <ChangedLine config={config} />
      </div>
    </form>
  )
}

export function PostingSettings() {
  const { t } = useReportText()
  const agent = useAgent()
  const config = useResearchConfig()
  const editable = isSuperAdmin(agent)
  return (
    <SettingsCard
      title={t('moderation.research.settings.title')}
      subtitle={t('moderation.research.settings.subtitle')}
    >
      <QueryContent query={config}>
        {(data) =>
          editable ? <SettingsForm key={data.updated_at} config={data} /> : <SettingsView config={data} />
        }
      </QueryContent>
    </SettingsCard>
  )
}
