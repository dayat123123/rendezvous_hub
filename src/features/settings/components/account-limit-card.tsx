import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LockedForm } from '@/components/locked-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLockedEdit } from '@/hooks/use-locked-edit'

import { findSetting, useSaveSettings, useSettingEntries } from '../hooks'
import { inRange, numberSetting } from '../logic'
import type { SettingEntry } from '../types'
import { ChangedBy, FieldMessage, QueryContent, SettingsCard } from './settings-ui'

export const ACCOUNT_LIMIT_KEY = 'accounts.max_per_customer'
const MAX_ACCOUNTS = 200

function AccountLimitForm({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const lock = useLockedEdit()
  const saved = numberSetting(items, ACCOUNT_LIMIT_KEY, MAX_ACCOUNTS)
  const [limit, setLimit] = useState(String(saved))
  const [touched, setTouched] = useState(false)
  const valid = inRange(limit, 1, MAX_ACCOUNTS)
  return (
    <LockedForm
      lock={lock}
      name={t('settings.accountLimit')}
      className="flex flex-col gap-3"
      confirmTitle={t('settings.accountLimitConfirmTitle')}
      confirmBody={t('settings.accountLimitConfirmBody', { count: Number(limit.trim()) })}
      saving={save.isPending}
      canSave={!valid || Number(limit.trim()) !== saved}
      onCheck={() => {
        setTouched(true)
        return valid
      }}
      onReset={() => {
        setLimit(String(saved))
        setTouched(false)
      }}
      onSave={() => save.mutateAsync({ [ACCOUNT_LIMIT_KEY]: Number(limit.trim()) })}
      status={<ChangedBy entry={findSetting(items, ACCOUNT_LIMIT_KEY)} />}
    >
      <div className="flex w-72 flex-col gap-1.5">
        <Label htmlFor="account-limit">{t('settings.accountLimitLabel', { max: MAX_ACCOUNTS })}</Label>
        <Input
          id="account-limit"
          inputMode="numeric"
          maxLength={3}
          value={limit}
          aria-invalid={touched && !valid ? true : undefined}
          onChange={(event) => setLimit(event.target.value)}
        />
      </div>
      <FieldMessage
        error={touched && !valid ? t('settings.numberRange', { min: 1, max: MAX_ACCOUNTS }) : undefined}
      />
    </LockedForm>
  )
}

export function AccountLimitCard() {
  const { t } = useTranslation()
  const settings = useSettingEntries()
  return (
    <SettingsCard title={t('settings.accountLimit')} subtitle={t('settings.accountLimitHint')}>
      <QueryContent query={settings}>
        {(items) => (
          <AccountLimitForm key={findSetting(items, ACCOUNT_LIMIT_KEY)?.version ?? 0} items={items} />
        )}
      </QueryContent>
    </SettingsCard>
  )
}
