import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LockedForm } from '@/components/locked-form'
import { Checkbox } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLockedEdit } from '@/hooks/use-locked-edit'

import { findSetting, useSaveSettings, useSettingEntries } from '../hooks'
import { inRange, numberSetting } from '../logic'
import { type SettingEntry, staffRoles } from '../types'
import { ChangedBy, FieldMessage, QueryContent, SectionFrame, SettingsCard } from './settings-ui'

export const MFA_ROLES_KEY = 'security.mfa_required_roles'
export const MAX_FAILURES_KEY = 'security.login_max_failures'
export const LOCK_MINUTES_KEY = 'security.login_lock_minutes'

const ALWAYS_MFA = 'cs_super_admin'

function savedRoles(items: SettingEntry[]): string[] {
  const value = findSetting(items, MFA_ROLES_KEY)?.value
  const roles = Array.isArray(value) ? value.filter((role): role is string => typeof role === 'string') : []
  return roles.includes(ALWAYS_MFA) ? roles : [ALWAYS_MFA, ...roles]
}

function MfaRolesForm({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const lock = useLockedEdit()
  const saved = savedRoles(items)
  const [roles, setRoles] = useState(saved)
  const ordered = staffRoles.filter((role) => roles.includes(role))
  const changed = ordered.length !== saved.length || ordered.some((role) => !saved.includes(role))
  return (
    <LockedForm
      lock={lock}
      name={t('settings.mfaRoles')}
      className="flex flex-col gap-3"
      confirmTitle={t('settings.mfaRolesConfirmTitle')}
      confirmBody={t('settings.mfaRolesConfirmBody')}
      saving={save.isPending}
      canSave={changed}
      onReset={() => setRoles(saved)}
      onSave={() => save.mutateAsync({ [MFA_ROLES_KEY]: ordered })}
      status={<ChangedBy entry={findSetting(items, MFA_ROLES_KEY)} />}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {staffRoles.map((role) => (
          <label key={role} className="flex items-center gap-2 text-row">
            <Checkbox
              checked={roles.includes(role)}
              disabled={role === ALWAYS_MFA}
              onCheckedChange={(value) =>
                setRoles((current) =>
                  value === true ? [...current, role] : current.filter((item) => item !== role),
                )
              }
            />
            <span>
              {t(`roles.${role}`)}
              {role === ALWAYS_MFA ? (
                <span className="text-muted-foreground"> · {t('settings.mfaAlways')}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </LockedForm>
  )
}

function LoginLockForm({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const lock = useLockedEdit()
  const savedFailures = numberSetting(items, MAX_FAILURES_KEY, 5)
  const savedMinutes = numberSetting(items, LOCK_MINUTES_KEY, 15)
  const [failures, setFailures] = useState(String(savedFailures))
  const [minutes, setMinutes] = useState(String(savedMinutes))
  const [touched, setTouched] = useState(false)
  const failuresValid = inRange(failures, 3, 20)
  const minutesValid = inRange(minutes, 1, 1440)
  const nextFailures = Number(failures.trim())
  const nextMinutes = Number(minutes.trim())
  return (
    <LockedForm
      lock={lock}
      name={t('settings.loginLock')}
      className="flex flex-col gap-3"
      confirmTitle={t('settings.loginLockConfirmTitle')}
      confirmBody={t('settings.loginLockConfirmBody', { count: nextFailures, minutes: nextMinutes })}
      saving={save.isPending}
      canSave={
        !failuresValid || !minutesValid || nextFailures !== savedFailures || nextMinutes !== savedMinutes
      }
      onCheck={() => {
        setTouched(true)
        return failuresValid && minutesValid
      }}
      onReset={() => {
        setFailures(String(savedFailures))
        setMinutes(String(savedMinutes))
        setTouched(false)
      }}
      onSave={() => save.mutateAsync({ [MAX_FAILURES_KEY]: nextFailures, [LOCK_MINUTES_KEY]: nextMinutes })}
      status={<ChangedBy entry={findSetting(items, MAX_FAILURES_KEY)} />}
    >
      <div className="flex flex-wrap gap-4">
        <div className="flex w-60 flex-col gap-1.5">
          <Label htmlFor="login-max-failures">{t('settings.loginMaxFailures')}</Label>
          <Input
            id="login-max-failures"
            inputMode="numeric"
            maxLength={2}
            value={failures}
            aria-invalid={touched && !failuresValid ? true : undefined}
            onChange={(event) => setFailures(event.target.value)}
          />
          <FieldMessage
            error={touched && !failuresValid ? t('settings.numberRange', { min: 3, max: 20 }) : undefined}
          />
        </div>
        <div className="flex w-60 flex-col gap-1.5">
          <Label htmlFor="login-lock-minutes">{t('settings.loginLockMinutes')}</Label>
          <Input
            id="login-lock-minutes"
            inputMode="numeric"
            maxLength={4}
            value={minutes}
            aria-invalid={touched && !minutesValid ? true : undefined}
            onChange={(event) => setMinutes(event.target.value)}
          />
          <FieldMessage
            error={touched && !minutesValid ? t('settings.numberRange', { min: 1, max: 1440 }) : undefined}
          />
        </div>
      </div>
    </LockedForm>
  )
}

export function SecuritySection() {
  const { t } = useTranslation()
  const settings = useSettingEntries()
  const version = (items: SettingEntry[], key: string) => findSetting(items, key)?.version ?? 0
  return (
    <SectionFrame title={t('settings.security')} description={t('settings.securityDescription')}>
      <SettingsCard title={t('settings.mfaRoles')} subtitle={t('settings.mfaRolesHint')}>
        <QueryContent query={settings}>
          {(items) => <MfaRolesForm key={version(items, MFA_ROLES_KEY)} items={items} />}
        </QueryContent>
      </SettingsCard>
      <SettingsCard title={t('settings.loginLock')} subtitle={t('settings.loginLockHint')}>
        <QueryContent query={settings}>
          {(items) => (
            <LoginLockForm
              key={`${version(items, MAX_FAILURES_KEY)}-${version(items, LOCK_MINUTES_KEY)}`}
              items={items}
            />
          )}
        </QueryContent>
      </SettingsCard>
    </SectionFrame>
  )
}
