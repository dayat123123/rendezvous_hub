import { LockIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { EditButton, LockedForm } from '@/components/locked-form'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Confirm } from '@/features/nasabah/components/confirm'
import { QueryContent, SectionFrame, SettingsCard } from '@/features/settings/components/settings-ui'
import { FieldText } from '@/features/system/components/system-ui'
import { useLockedEdit } from '@/hooks/use-locked-edit'
import { platformErrorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'

import { useClientConfig, useSetMinVersion, useToggleFlag } from '../hooks'
import { featureRows, versionValid } from '../logic'
import { appPlatforms, type ClientConfig, type FeatureRow, type MinVersion } from '../types'
import { KillSwitchCard } from './kill-switch-card'

type FlagChange = { row: FeatureRow; enabled: boolean }

function FeatureItem({
  row,
  locked,
  pending,
  onChange,
}: {
  row: FeatureRow
  locked: boolean
  pending: boolean
  onChange: (change: FlagChange) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <li className="flex items-start gap-4 border-b py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Label htmlFor={`${id}-switch`} className="text-row font-medium">
          {t(`platform.flags.features.${row.key}.label`)}
        </Label>
        <p id={`${id}-text`} className="text-xs text-muted-foreground">
          {t(`platform.flags.features.${row.key}.description`)}
        </p>
        {row.updated_at ? (
          <p className="text-xs text-muted-foreground">
            {row.updated_by?.name
              ? t('platform.versions.changedBy', { time: stamp(row.updated_at), name: row.updated_by.name })
              : t('platform.versions.changed', { time: stamp(row.updated_at) })}
          </p>
        ) : null}
      </div>
      <Switch
        id={`${id}-switch`}
        checked={row.enabled}
        disabled={locked || pending}
        aria-describedby={`${id}-text`}
        onCheckedChange={(enabled) => onChange({ row, enabled })}
      />
    </li>
  )
}

function FlagsCard({ config }: { config: ClientConfig }) {
  const { t } = useTranslation()
  const toggle = useToggleFlag()
  const editButton = useRef<HTMLButtonElement>(null)
  const doneButton = useRef<HTMLButtonElement>(null)
  const [editing, setEditing] = useState(false)
  const [change, setChange] = useState<FlagChange | null>(null)
  const label = change ? t(`platform.flags.features.${change.row.key}.label`) : ''
  const turnOn = change?.enabled === true
  const previous = useRef(editing)

  useEffect(() => {
    if (previous.current === editing) return
    previous.current = editing
    if (editing) doneButton.current?.focus()
    else editButton.current?.focus()
  }, [editing])

  return (
    <SettingsCard title={t('platform.flags.title')} subtitle={t('platform.flags.subtitle')}>
      <div className="flex flex-wrap items-center gap-3">
        {editing ? (
          <Button
            ref={doneButton}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(false)}
          >
            <LockIcon />
            {t('app.done')}
          </Button>
        ) : (
          <EditButton ref={editButton} name={t('platform.flags.title')} onClick={() => setEditing(true)} />
        )}
        <span className="text-xs text-muted-foreground">
          {editing ? t('platform.flags.editingHint') : t('platform.flags.lockedHint')}
        </span>
      </div>
      <ul className="border-y">
        {featureRows(config.flags).map((row) => (
          <FeatureItem
            key={row.key}
            row={row}
            locked={!editing}
            pending={toggle.isPending}
            onChange={setChange}
          />
        ))}
      </ul>
      <Confirm
        open={change !== null}
        title={
          turnOn
            ? t('platform.flags.onTitle', { feature: label })
            : t('platform.flags.offTitle', { feature: label })
        }
        body={turnOn ? t('platform.flags.onBody') : t('platform.flags.offBody')}
        action={turnOn ? t('platform.flags.onAction') : t('platform.flags.offAction')}
        destructive={!turnOn}
        pending={toggle.isPending}
        onClose={() => setChange(null)}
        onConfirm={() =>
          change &&
          toggle
            .mutateAsync({ key: change.row.key, enabled: change.enabled })
            .then(() => {
              toast.success(
                change.enabled
                  ? t('platform.flags.turnedOn', { feature: label })
                  : t('platform.flags.turnedOff', { feature: label }),
              )
              setChange(null)
            })
            .catch((error: unknown) => {
              setChange(null)
              toast.error(platformErrorText(error))
            })
        }
      />
    </SettingsCard>
  )
}

function VersionRow({ entry }: { entry: MinVersion }) {
  const { t } = useTranslation()
  const id = useId()
  const save = useSetMinVersion()
  const lock = useLockedEdit()
  const [text, setText] = useState(entry.min_version ?? '')
  const [checked, setChecked] = useState(false)
  const value = text.trim() === '' ? null : text.trim()
  const invalid = value !== null && !versionValid(value)
  const dirty = value !== entry.min_version
  const platform = t(`platform.platforms.${entry.platform}`)
  return (
    <li className="flex flex-col gap-2 border-b py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
      <LockedForm
        lock={lock}
        name={platform}
        className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3"
        footerClassName="self-start"
        confirmTitle={
          value
            ? t('platform.versions.confirmTitle', { platform, version: value })
            : t('platform.versions.clearTitle', { platform })
        }
        confirmBody={
          value ? t('platform.versions.confirmBody', { platform }) : t('platform.versions.clearBody')
        }
        saving={save.isPending}
        canSave={dirty}
        onCheck={() => {
          setChecked(true)
          return !invalid && dirty
        }}
        onReset={() => {
          setText(entry.min_version ?? '')
          setChecked(false)
        }}
        onSave={() =>
          save.mutateAsync({ platform: entry.platform, version: value }).then(() => {
            toast.success(
              value
                ? t('platform.versions.saved', { platform, version: value })
                : t('platform.versions.cleared', { platform }),
            )
            setChecked(false)
          })
        }
        onError={(error) => toast.error(platformErrorText(error))}
      >
        <Label htmlFor={`${id}-version`} className="sm:w-24 sm:pt-2">
          {platform}
        </Label>
        <div className="flex min-w-0 flex-col gap-1.5 sm:w-48">
          <Input
            id={`${id}-version`}
            inputMode="decimal"
            placeholder={t('platform.versions.none')}
            value={text}
            aria-invalid={checked && invalid ? true : undefined}
            aria-describedby={`${id}-text`}
            onChange={(event) => setText(event.target.value)}
          />
          <FieldText
            id={`${id}-text`}
            error={checked && invalid ? t('platform.flags.problems.version') : undefined}
            hint={
              entry.min_version
                ? t('platform.versions.current', { version: entry.min_version })
                : t('platform.versions.noMinimum')
            }
          />
        </div>
      </LockedForm>
      <p className="text-xs text-muted-foreground sm:w-48 sm:pt-2">
        {entry.updated_by?.name
          ? t('platform.versions.changedBy', { time: stamp(entry.updated_at), name: entry.updated_by.name })
          : t('platform.versions.changed', { time: stamp(entry.updated_at) })}
      </p>
    </li>
  )
}

function VersionsCard({ config }: { config: ClientConfig }) {
  const { t } = useTranslation()
  return (
    <SettingsCard title={t('platform.versions.title')} subtitle={t('platform.versions.subtitle')}>
      <ul className="border-y">
        {[...config.min_versions]
          .sort((a, b) => appPlatforms.indexOf(a.platform) - appPlatforms.indexOf(b.platform))
          .map((entry) => (
            <VersionRow key={`${entry.platform}:${entry.min_version ?? ''}`} entry={entry} />
          ))}
      </ul>
    </SettingsCard>
  )
}

export function FeaturesSection() {
  const { t } = useTranslation()
  const config = useClientConfig()
  return (
    <SectionFrame title={t('platform.flags.pageTitle')} description={t('platform.flags.pageDescription')}>
      <QueryContent query={config}>
        {(data) => (
          <>
            <KillSwitchCard state={data.kill_switch} />
            <FlagsCard config={data} />
            <VersionsCard config={data} />
          </>
        )}
      </QueryContent>
    </SectionFrame>
  )
}
