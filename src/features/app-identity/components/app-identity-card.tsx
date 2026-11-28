import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { LockedForm } from '@/components/locked-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldMessage, QueryContent, SettingsCard } from '@/features/settings/components/settings-ui'
import { useLockedEdit } from '@/hooks/use-locked-edit'
import { errorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'

import { useAppIdentity, useSaveAppIdentity } from '../hooks'
import {
  draftFromIdentity,
  identityFromDraft,
  identityProblems,
  sameIdentity,
  type IdentityProblem,
} from '../logic'
import type { AppIdentityDraft, AppIdentityField, AppIdentityStatus } from '../types'

function useProblemText(problem: IdentityProblem | undefined, touched: boolean) {
  const { t } = useTranslation()
  return touched && problem
    ? t(`settings.identity.errors.${problem.code}`, { line: problem.line })
    : undefined
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
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  problem?: IdentityProblem
  touched: boolean
  placeholder?: string
  maxLength: number
}) {
  const error = useProblemText(problem, touched)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        autoComplete="off"
        spellCheck={false}
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
  problem?: IdentityProblem
  touched: boolean
  placeholder: string
}) {
  const error = useProblemText(problem, touched)
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

function AppIdentityForm({ status }: { status: AppIdentityStatus }) {
  const { t } = useTranslation()
  const save = useSaveAppIdentity()
  const lock = useLockedEdit()
  const [draft, setDraft] = useState<AppIdentityDraft>(() => draftFromIdentity(status.identity))
  const [touched, setTouched] = useState(false)
  const problems = identityProblems(draft)
  const valid = Object.keys(problems).length === 0
  const next = identityFromDraft(draft)
  const unchanged = valid && sameIdentity(next, status.identity)
  const field = (key: AppIdentityField) => ({
    id: `identity-${key}`,
    value: draft[key],
    onChange: (value: string) => setDraft((current) => ({ ...current, [key]: value })),
    problem: problems[key],
    touched,
  })

  return (
    <LockedForm
      lock={lock}
      name={t('settings.identity.title')}
      className="flex flex-col gap-4"
      autoComplete="off"
      confirmTitle={t('settings.identity.confirmTitle')}
      confirmBody={t('settings.identity.confirmBody')}
      saving={save.isPending}
      canSave={!save.isPending && !unchanged}
      onCheck={() => {
        setTouched(true)
        return valid
      }}
      onReset={() => {
        setDraft(draftFromIdentity(status.identity))
        setTouched(false)
      }}
      onSave={() =>
        save.mutateAsync(next).then((saved) => {
          setDraft(draftFromIdentity(saved.identity))
          setTouched(false)
          toast.success(t('settings.identity.saved'))
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
      <div className="max-w-xs">
        <TextField
          {...field('appName')}
          label={t('settings.identity.appName')}
          hint={t('settings.identity.appNameHint')}
          maxLength={40}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListField
          {...field('android')}
          label={t('settings.identity.android')}
          hint={t('settings.identity.androidHint')}
          placeholder="co.perusahaan.app AB:CD:…:EF"
        />
        <ListField
          {...field('ios')}
          label={t('settings.identity.ios')}
          hint={t('settings.identity.iosHint')}
          placeholder="ABCDE12345.co.perusahaan.app"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-row font-medium">{t('settings.identity.downloads')}</h3>
        <p className="text-xs text-muted-foreground">{t('settings.identity.downloadsHint')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextField
          {...field('androidStore')}
          label={t('settings.identity.androidStore')}
          placeholder="https://play.google.com/store/apps/details?id=…"
          maxLength={300}
        />
        <TextField
          {...field('iosStore')}
          label={t('settings.identity.iosStore')}
          placeholder="https://apps.apple.com/…"
          maxLength={300}
        />
        <TextField
          {...field('windowsDownload')}
          label={t('settings.identity.windowsDownload')}
          placeholder="https://…"
          maxLength={300}
        />
        <TextField
          {...field('macDownload')}
          label={t('settings.identity.macDownload')}
          placeholder="https://…"
          maxLength={300}
        />
      </div>
    </LockedForm>
  )
}

export function AppIdentityCard() {
  const { t } = useTranslation()
  const query = useAppIdentity()
  return (
    <SettingsCard title={t('settings.identity.title')} subtitle={t('settings.identity.subtitle')}>
      <QueryContent query={query}>
        {(status) => <AppIdentityForm key={status.version} status={status} />}
      </QueryContent>
    </SettingsCard>
  )
}
