import { useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dot } from '@/components/badges'
import { CopyButton } from '@/components/copy-button'
import { LockedForm } from '@/components/locked-form'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { downloadCount } from '@/features/app-identity/logic'
import {
  FieldMessage,
  QueryContent,
  SectionFrame,
  SettingsCard,
} from '@/features/settings/components/settings-ui'
import { useLockedEdit } from '@/hooks/use-locked-edit'
import { errorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'
import { cn } from '@/lib/utils'

import { useSaveShareLinks, useShareLinks } from '../hooks'
import { draftFromConfig, draftProblems, exampleCode, sameSettings, settingsFromDraft } from '../logic'
import type { ShareLinksDraft, ShareLinksStatus } from '../types'

export function ShareLinksBadge({ ready }: { ready: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-1.5 py-px text-xs font-medium',
        ready ? 'border-success/40 text-success' : 'border-border text-muted-foreground',
      )}
    >
      <Dot tone={ready ? 'ok' : 'neutral'} />
      {ready ? t('settings.share.ready') : t('settings.share.notReady')}
    </span>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <Switch checked={checked} aria-label={label} onCheckedChange={onChange} />
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}

function ShareLinksForm({ status }: { status: ShareLinksStatus }) {
  const { t } = useTranslation()
  const save = useSaveShareLinks()
  const lock = useLockedEdit()
  const [draft, setDraft] = useState<ShareLinksDraft>(() => draftFromConfig(status.config))
  const [touched, setTouched] = useState(false)
  const problem = draftProblems(draft).baseUrl
  const next = settingsFromDraft(draft)
  const unchanged = !problem && sameSettings(next, status.config)
  const error = touched && problem ? t(`settings.share.errors.${problem.code}`) : undefined
  const set =
    <K extends keyof ShareLinksDraft>(key: K) =>
    (value: ShareLinksDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value }))

  return (
    <LockedForm
      lock={lock}
      name={t('settings.shareLinks')}
      className="flex flex-col gap-4"
      autoComplete="off"
      confirmTitle={t('settings.share.confirmTitle')}
      confirmBody={t(draft.enabled ? 'settings.share.confirmOn' : 'settings.share.confirmOff')}
      destructive={status.config.enabled && !draft.enabled}
      saving={save.isPending}
      canSave={!save.isPending && !unchanged}
      onCheck={() => {
        setTouched(true)
        return !problem
      }}
      onReset={() => {
        setDraft(draftFromConfig(status.config))
        setTouched(false)
      }}
      onSave={() =>
        save.mutateAsync(next).then((saved) => {
          setDraft(draftFromConfig(saved.config))
          setTouched(false)
          toast.success(t('settings.share.saved'))
          return true
        })
      }
      onError={(failure) => toast.error(errorText(failure))}
      status={
        status.updated_at ? (
          <p className="text-xs text-muted-foreground">
            {status.updated_by
              ? t('settings.lastChangedBy', { time: stamp(status.updated_at), name: status.updated_by })
              : t('settings.lastChanged', { time: stamp(status.updated_at) })}
          </p>
        ) : null
      }
    >
      <ToggleRow
        label={t('settings.share.enabled')}
        hint={t('settings.share.enabledHint')}
        checked={draft.enabled}
        onChange={set('enabled')}
      />
      <div className="flex max-w-2xl flex-col gap-1.5">
        <Label htmlFor="share-baseUrl">{t('settings.share.baseUrl')}</Label>
        <Input
          id="share-baseUrl"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          maxLength={200}
          placeholder="https://share.perusahaan.co.id"
          value={draft.baseUrl}
          aria-invalid={error ? true : undefined}
          onChange={(event) => set('baseUrl')(event.target.value)}
        />
        <FieldMessage error={error} hint={t('settings.share.baseUrlHint')} />
      </div>
      <ToggleRow
        label={t('settings.share.preview')}
        hint={t('settings.share.previewHint')}
        checked={draft.preview}
        onChange={set('preview')}
      />
    </LockedForm>
  )
}

function IdentityCard({ status }: { status: ShareLinksStatus }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const config = status.config
  return (
    <SettingsCard title={t('settings.share.identityCard')} subtitle={t('settings.share.identityCardHint')}>
      <p className="text-row">
        {t('settings.share.identitySummary', {
          name: config.app_name,
          scheme: config.app_scheme ? `${config.app_scheme}://` : t('settings.share.noScheme'),
          android: config.android.length,
          ios: config.ios_app_ids.length,
          downloads: downloadCount(config),
        })}
      </p>
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void navigate({ to: '/settings', search: { section: 'appIntegration' } })}
        >
          {t('settings.share.editIdentity')}
          <ArrowRightIcon />
        </Button>
      </div>
    </SettingsCard>
  )
}

function CheckRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-48 shrink-0 text-row text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-sm bg-muted px-2 py-1 font-mono text-xs">{url}</code>
      <CopyButton text={url} label={label} size="xs" />
    </div>
  )
}

function StatusCard({ status }: { status: ShareLinksStatus }) {
  const { t } = useTranslation()
  const config = status.config
  const base = config.base_url
  return (
    <SettingsCard title={t('settings.share.statusCard')}>
      <p className="text-row">
        {t('settings.share.codes', {
          total: formatNumber(status.codes),
          week: formatNumber(status.codes_7d),
        })}
      </p>
      {base ? (
        <div className="flex flex-col gap-2">
          <CheckRow label={t('settings.share.example')} url={`${base}/p/${exampleCode}`} />
          {config.app_scheme ? (
            <CheckRow
              label={t('settings.share.appExample')}
              url={`${config.app_scheme}://p/${exampleCode}`}
            />
          ) : null}
          {config.android.length > 0 ? (
            <CheckRow label="assetlinks.json" url={`${base}/.well-known/assetlinks.json`} />
          ) : null}
          {config.ios_app_ids.length > 0 ? (
            <CheckRow
              label="apple-app-site-association"
              url={`${base}/.well-known/apple-app-site-association`}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-row text-warning">{t('settings.share.noBaseUrl')}</p>
      )}
      <p className="text-xs text-muted-foreground">{t('settings.share.httpsNote')}</p>
    </SettingsCard>
  )
}

function StatsLinkCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <SettingsCard title={t('settings.share.stats.title')} subtitle={t('settings.share.stats.moved')}>
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void navigate({ to: '/community', search: { tab: 'analytics' } })}
        >
          {t('settings.share.stats.openAnalytics')}
          <ArrowRightIcon />
        </Button>
      </div>
    </SettingsCard>
  )
}

export function ShareLinksSection() {
  const { t } = useTranslation()
  const query = useShareLinks()
  return (
    <SectionFrame
      title={t('settings.shareLinks')}
      description={t('settings.share.description')}
      action={query.data ? <ShareLinksBadge ready={query.data.ready} /> : undefined}
    >
      <QueryContent query={query}>
        {(status) => (
          <div className="flex flex-col gap-5">
            <SettingsCard title={t('settings.share.linkCard')} subtitle={t('settings.share.linkCardHint')}>
              <ShareLinksForm key={status.version} status={status} />
            </SettingsCard>
            <IdentityCard status={status} />
            <StatusCard status={status} />
            <StatsLinkCard />
          </div>
        )}
      </QueryContent>
    </SectionFrame>
  )
}
