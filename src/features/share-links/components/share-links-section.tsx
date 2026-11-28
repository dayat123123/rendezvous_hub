import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dot } from '@/components/badges'
import { CopyButton } from '@/components/copy-button'
import { LockedForm } from '@/components/locked-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/controls'
import { Textarea } from '@/components/ui/textarea'
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
import {
  configFromDraft,
  draftFromConfig,
  draftProblems,
  exampleCode,
  sameConfig,
  type DraftProblem,
} from '../logic'
import type { ShareLinksDraft, ShareLinksField, ShareLinksStatus } from '../types'

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

function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  problem,
  touched,
  placeholder,
  maxLength,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  problem?: DraftProblem
  touched: boolean
  placeholder?: string
  maxLength: number
  inputMode?: 'url' | 'text'
}) {
  const { t } = useTranslation()
  const error =
    touched && problem ? t(`settings.share.errors.${problem.code}`, { line: problem.line }) : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        autoComplete="off"
        spellCheck={false}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldMessage error={error} hint={hint} />
    </div>
  )
}

function ListField({
  id,
  label,
  value,
  onChange,
  hint,
  problem,
  touched,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint: string
  problem?: DraftProblem
  touched: boolean
  placeholder: string
}) {
  const { t } = useTranslation()
  const error =
    touched && problem ? t(`settings.share.errors.${problem.code}`, { line: problem.line }) : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={3}
        spellCheck={false}
        autoComplete="off"
        className="font-mono text-xs"
        placeholder={placeholder}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldMessage error={error} hint={hint} />
    </div>
  )
}

function ShareLinksForm({ status }: { status: ShareLinksStatus }) {
  const { t } = useTranslation()
  const save = useSaveShareLinks()
  const lock = useLockedEdit()
  const [draft, setDraft] = useState<ShareLinksDraft>(() => draftFromConfig(status.config))
  const [touched, setTouched] = useState(false)
  const problems = draftProblems(draft)
  const valid = Object.keys(problems).length === 0
  const next = configFromDraft(draft)
  const unchanged = valid && sameConfig(next, status.config)
  const set =
    <K extends keyof ShareLinksDraft>(key: K) =>
    (value: ShareLinksDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value }))
  const field = (key: ShareLinksField) => ({
    id: `share-${key}`,
    value: draft[key],
    onChange: set(key),
    problem: problems[key],
    touched,
  })

  return (
    <LockedForm
      lock={lock}
      name={t('settings.shareLinks')}
      className="flex flex-col gap-5"
      autoComplete="off"
      confirmTitle={t('settings.share.confirmTitle')}
      confirmBody={t(draft.enabled ? 'settings.share.confirmOn' : 'settings.share.confirmOff')}
      destructive={status.config.enabled && !draft.enabled}
      saving={save.isPending}
      canSave={!save.isPending && !unchanged}
      onCheck={() => {
        setTouched(true)
        return valid
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
      onError={(error) => toast.error(errorText(error))}
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
      <SettingsCard title={t('settings.share.linkCard')} subtitle={t('settings.share.linkCardHint')}>
        <div className="flex flex-col gap-4">
          <label className="flex items-start gap-2 text-sm">
            <Switch
              checked={draft.enabled}
              aria-label={t('settings.share.enabled')}
              onCheckedChange={set('enabled')}
            />
            <span className="flex flex-col">
              <span className="font-medium">{t('settings.share.enabled')}</span>
              <span className="text-xs text-muted-foreground">{t('settings.share.enabledHint')}</span>
            </span>
          </label>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_10rem]">
            <TextField
              {...field('baseUrl')}
              label={t('settings.share.baseUrl')}
              hint={t('settings.share.baseUrlHint')}
              placeholder="https://share.perusahaan.co.id"
              maxLength={200}
              inputMode="url"
            />
            <TextField
              {...field('appName')}
              label={t('settings.share.appName')}
              hint={t('settings.share.appNameHint')}
              maxLength={40}
            />
            <TextField
              {...field('appScheme')}
              label={t('settings.share.appScheme')}
              hint={t('settings.share.appSchemeHint')}
              placeholder="olt"
              maxLength={31}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Switch
              checked={draft.preview}
              aria-label={t('settings.share.preview')}
              onCheckedChange={set('preview')}
            />
            <span className="flex flex-col">
              <span className="font-medium">{t('settings.share.preview')}</span>
              <span className="text-xs text-muted-foreground">{t('settings.share.previewHint')}</span>
            </span>
          </label>
        </div>
      </SettingsCard>
      <SettingsCard title={t('settings.share.appsCard')} subtitle={t('settings.share.appsCardHint')}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ListField
            {...field('android')}
            label={t('settings.share.android')}
            hint={t('settings.share.androidHint')}
            placeholder="co.perusahaan.app AB:CD:…:EF"
          />
          <ListField
            {...field('ios')}
            label={t('settings.share.ios')}
            hint={t('settings.share.iosHint')}
            placeholder="ABCDE12345.co.perusahaan.app"
          />
        </div>
      </SettingsCard>
      <SettingsCard
        title={t('settings.share.downloadsCard')}
        subtitle={t('settings.share.downloadsCardHint')}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField
            {...field('androidStore')}
            label={t('settings.share.androidStore')}
            placeholder="https://play.google.com/store/apps/details?id=…"
            maxLength={300}
            inputMode="url"
          />
          <TextField
            {...field('iosStore')}
            label={t('settings.share.iosStore')}
            placeholder="https://apps.apple.com/…"
            maxLength={300}
            inputMode="url"
          />
          <TextField
            {...field('windowsDownload')}
            label={t('settings.share.windowsDownload')}
            placeholder="https://…"
            maxLength={300}
            inputMode="url"
          />
          <TextField
            {...field('macDownload')}
            label={t('settings.share.macDownload')}
            placeholder="https://…"
            maxLength={300}
            inputMode="url"
          />
        </div>
      </SettingsCard>
    </LockedForm>
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
  const base = status.config.base_url
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
          <CheckRow
            label={t('settings.share.appExample')}
            url={`${status.config.app_scheme}://p/${exampleCode}`}
          />
          {status.config.android.length > 0 ? (
            <CheckRow label="assetlinks.json" url={`${base}/.well-known/assetlinks.json`} />
          ) : null}
          {status.config.ios_app_ids.length > 0 ? (
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
            <ShareLinksForm key={status.version} status={status} />
            <StatusCard status={status} />
          </div>
        )}
      </QueryContent>
    </SectionFrame>
  )
}
