import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LockedForm } from '@/components/locked-form'
import { RadioGroup, RadioGroupItem, Switch } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLockedEdit } from '@/hooks/use-locked-edit'

import { findSetting, useSaveSettings, useSettingEntries } from '../hooks'
import { inRange, numberSetting } from '../logic'
import type { SettingEntry } from '../types'
import { ChangedBy, FieldMessage, QueryContent, SectionFrame, SettingsCard } from './settings-ui'

function ModeCard({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const lock = useLockedEdit()
  const entry = findSetting(items, 'assignment.mode')
  const current = typeof entry?.value === 'string' ? entry.value : 'claim'
  const [mode, setMode] = useState(current)
  const options = [
    { value: 'claim', label: t('settings.modeClaim'), hint: t('settings.modeClaimHint') },
    { value: 'auto_assign', label: t('settings.modeAuto'), hint: t('settings.modeAutoHint') },
  ]
  const chosen = options.find((option) => option.value === mode)
  return (
    <SettingsCard title={t('settings.assignmentMode')}>
      <LockedForm
        lock={lock}
        name={t('settings.assignmentMode')}
        className="flex flex-col gap-3"
        confirmTitle={t('settings.modeConfirmTitle', { mode: chosen?.label ?? mode })}
        confirmBody={t(mode === 'auto_assign' ? 'settings.modeConfirmAuto' : 'settings.modeConfirmClaim')}
        saving={save.isPending}
        canSave={mode !== current}
        onReset={() => setMode(current)}
        onSave={() => save.mutateAsync({ 'assignment.mode': mode })}
        status={<ChangedBy entry={entry} />}
      >
        <RadioGroup
          value={mode}
          disabled={!lock.editing}
          onValueChange={setMode}
          className="flex flex-col gap-3"
        >
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:disabled]:cursor-default has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </LockedForm>
    </SettingsCard>
  )
}

function ReleaseCard({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const lock = useLockedEdit()
  const saved = numberSetting(items, 'ticket.auto_release_offline_minutes', 0)
  const [enabled, setEnabled] = useState(saved > 0)
  const [minutes, setMinutes] = useState(String(saved > 0 ? saved : 30))
  const [touched, setTouched] = useState(false)
  const valid = !enabled || inRange(minutes, 1, 1440)
  return (
    <SettingsCard title={t('settings.autoRelease')} subtitle={t('settings.autoReleaseHint')}>
      <LockedForm
        lock={lock}
        name={t('settings.autoRelease')}
        className="flex flex-col gap-3"
        confirmTitle={t('settings.autoReleaseConfirmTitle')}
        confirmBody={
          enabled
            ? t('settings.autoReleaseConfirmOn', { minutes: minutes.trim() })
            : t('settings.autoReleaseConfirmOff')
        }
        saving={save.isPending}
        onCheck={() => {
          setTouched(true)
          return valid
        }}
        onReset={() => {
          setEnabled(saved > 0)
          setMinutes(String(saved > 0 ? saved : 30))
          setTouched(false)
        }}
        onSave={() =>
          save.mutateAsync({ 'ticket.auto_release_offline_minutes': enabled ? Number(minutes.trim()) : 0 })
        }
        status={<ChangedBy entry={findSetting(items, 'ticket.auto_release_offline_minutes')} />}
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex h-9 items-center gap-2 text-sm font-medium">
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={t('settings.autoRelease')} />
            {enabled ? t('app.active') : t('app.inactive')}
          </label>
          <div className="flex w-64 flex-col gap-1.5">
            <Label htmlFor="release-minutes">{t('settings.autoReleaseMinutes')}</Label>
            <Input
              id="release-minutes"
              inputMode="numeric"
              maxLength={4}
              disabled={!enabled}
              value={minutes}
              aria-invalid={touched && !valid ? true : undefined}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </div>
        </div>
        <FieldMessage
          error={touched && !valid ? t('settings.numberRange', { min: 1, max: 1440 }) : undefined}
        />
      </LockedForm>
    </SettingsCard>
  )
}

function CloseCard({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const lock = useLockedEdit()
  const saved = numberSetting(items, 'ticket.auto_close_days', 3)
  const [days, setDays] = useState(String(saved))
  const [touched, setTouched] = useState(false)
  const valid = inRange(days, 1, 30)
  return (
    <SettingsCard title={t('settings.autoClose')} subtitle={t('settings.autoCloseHint')}>
      <LockedForm
        lock={lock}
        name={t('settings.autoClose')}
        className="flex flex-col gap-3"
        confirmTitle={t('settings.autoCloseConfirmTitle')}
        confirmBody={t('settings.autoCloseConfirmBody', { days: days.trim() })}
        saving={save.isPending}
        canSave={!valid || Number(days.trim()) !== saved}
        onCheck={() => {
          setTouched(true)
          return valid
        }}
        onReset={() => {
          setDays(String(saved))
          setTouched(false)
        }}
        onSave={() => save.mutateAsync({ 'ticket.auto_close_days': Number(days.trim()) })}
        status={<ChangedBy entry={findSetting(items, 'ticket.auto_close_days')} />}
      >
        <div className="flex w-72 flex-col gap-1.5">
          <Label htmlFor="close-days">{t('settings.autoCloseDays')}</Label>
          <Input
            id="close-days"
            inputMode="numeric"
            maxLength={2}
            value={days}
            aria-invalid={touched && !valid ? true : undefined}
            onChange={(event) => setDays(event.target.value)}
          />
        </div>
        <FieldMessage
          error={touched && !valid ? t('settings.numberRange', { min: 1, max: 30 }) : undefined}
        />
      </LockedForm>
    </SettingsCard>
  )
}

function AlertsCard({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const lock = useLockedEdit()
  const savedUnclaimed = String(numberSetting(items, 'alerts.unclaimed_minutes', 10))
  const savedP1 = String(numberSetting(items, 'alerts.p1_unclaimed_minutes', 2))
  const [unclaimed, setUnclaimed] = useState(savedUnclaimed)
  const [p1, setP1] = useState(savedP1)
  const [touched, setTouched] = useState(false)
  const fields = [
    { id: 'alert-unclaimed', label: t('settings.alertUnclaimed'), value: unclaimed, set: setUnclaimed },
    { id: 'alert-p1', label: t('settings.alertP1'), value: p1, set: setP1 },
  ]
  const valid = fields.every((field) => inRange(field.value, 1, 240))
  return (
    <SettingsCard title={t('settings.superAdminAlerts')}>
      <LockedForm
        lock={lock}
        name={t('settings.superAdminAlerts')}
        className="flex flex-col gap-3"
        confirmTitle={t('settings.superAdminAlertsConfirmTitle')}
        confirmBody={t('settings.superAdminAlertsConfirmBody', {
          unclaimed: unclaimed.trim(),
          p1: p1.trim(),
        })}
        saving={save.isPending}
        onCheck={() => {
          setTouched(true)
          return valid
        }}
        onReset={() => {
          setUnclaimed(savedUnclaimed)
          setP1(savedP1)
          setTouched(false)
        }}
        onSave={() =>
          save.mutateAsync({
            'alerts.unclaimed_minutes': Number(unclaimed.trim()),
            'alerts.p1_unclaimed_minutes': Number(p1.trim()),
          })
        }
        status={<ChangedBy entry={findSetting(items, 'alerts.unclaimed_minutes')} />}
      >
        <div className="flex flex-wrap items-end gap-4">
          {fields.map((field) => (
            <div key={field.id} className="flex w-72 flex-col gap-1.5">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                inputMode="numeric"
                maxLength={3}
                value={field.value}
                aria-invalid={touched && !inRange(field.value, 1, 240) ? true : undefined}
                onChange={(event) => field.set(event.target.value)}
              />
            </div>
          ))}
        </div>
        <FieldMessage
          error={touched && !valid ? t('settings.numberRange', { min: 1, max: 240 }) : undefined}
        />
      </LockedForm>
    </SettingsCard>
  )
}

export function AssignmentSection() {
  const { t } = useTranslation()
  const settings = useSettingEntries()
  return (
    <SectionFrame title={t('settings.assignment')} description={t('settings.assignmentDescription')}>
      <QueryContent query={settings}>
        {(items) => (
          <div className="flex flex-col gap-4">
            <ModeCard key={`mode-${findSetting(items, 'assignment.mode')?.version ?? 0}`} items={items} />
            <ReleaseCard
              key={`release-${findSetting(items, 'ticket.auto_release_offline_minutes')?.version ?? 0}`}
              items={items}
            />
            <CloseCard
              key={`close-${findSetting(items, 'ticket.auto_close_days')?.version ?? 0}`}
              items={items}
            />
            <AlertsCard
              key={`alerts-${findSetting(items, 'alerts.unclaimed_minutes')?.version ?? 0}-${findSetting(items, 'alerts.p1_unclaimed_minutes')?.version ?? 0}`}
              items={items}
            />
          </div>
        )}
      </QueryContent>
    </SectionFrame>
  )
}
