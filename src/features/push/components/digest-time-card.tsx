import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LockedForm } from '@/components/locked-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ChangedBy,
  FieldMessage,
  QueryContent,
  SettingsCard,
} from '@/features/settings/components/settings-ui'
import { findSetting, useSaveSettings, useSettingEntries } from '@/features/settings/hooks'
import type { SettingEntry } from '@/features/settings/types'
import { useLockedEdit } from '@/hooks/use-locked-edit'

import { DIGEST_TIME_KEY, digestTimeSetting, validDigestTime } from '../digest-time'

function DigestTimeForm({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const lock = useLockedEdit()
  const saved = digestTimeSetting(items)
  const [time, setTime] = useState(saved)
  const [touched, setTouched] = useState(false)
  const valid = validDigestTime(time)
  return (
    <LockedForm
      lock={lock}
      name={t('push.digest.title')}
      className="flex flex-col gap-3"
      confirmTitle={t('push.digest.confirmTitle')}
      confirmBody={t('push.digest.confirmBody', { time })}
      saving={save.isPending}
      canSave={!valid || time !== saved}
      onCheck={() => {
        setTouched(true)
        return valid
      }}
      onReset={() => {
        setTime(saved)
        setTouched(false)
      }}
      onSave={() => save.mutateAsync({ [DIGEST_TIME_KEY]: time })}
      status={<ChangedBy entry={findSetting(items, DIGEST_TIME_KEY)} />}
    >
      <div className="flex w-48 flex-col gap-1.5">
        <Label htmlFor="digest-time">{t('push.digest.label')}</Label>
        <Input
          id="digest-time"
          type="time"
          step={60}
          value={time}
          aria-invalid={touched && !valid ? true : undefined}
          onChange={(event) => setTime(event.target.value)}
        />
      </div>
      <FieldMessage
        error={touched && !valid ? t('push.digest.invalid') : undefined}
        hint={t('push.digest.note')}
      />
    </LockedForm>
  )
}

export function DigestTimeCard() {
  const { t } = useTranslation()
  const settings = useSettingEntries()
  return (
    <SettingsCard title={t('push.digest.title')} subtitle={t('push.digest.hint')}>
      <QueryContent query={settings}>
        {(items) => <DigestTimeForm key={findSetting(items, DIGEST_TIME_KEY)?.version ?? 0} items={items} />}
      </QueryContent>
    </SettingsCard>
  )
}
