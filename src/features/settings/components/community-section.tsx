import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { LockedForm } from '@/components/locked-form'
import { Switch } from '@/components/ui/controls'
import type { FourEyesSetting } from '@/features/compliance/policy-versions/api'
import { usePolicyFourEyes, useSetPolicyFourEyes } from '@/features/compliance/policy-versions/hooks'
import { useLockedEdit } from '@/hooks/use-locked-edit'
import { errorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'

import { findSetting, useSaveSettings, useSettingEntries } from '../hooks'
import type { SettingEntry } from '../types'
import { ChangedBy, QueryContent, SectionFrame, SettingsCard } from './settings-ui'

function ToggleForm({
  label,
  saved,
  saving,
  confirmTitle,
  confirmBody,
  status,
  onSave,
  onError,
}: {
  label: string
  saved: boolean
  saving: boolean
  confirmTitle: (enabled: boolean) => string
  confirmBody: (enabled: boolean) => string
  status: React.ReactNode
  onSave: (enabled: boolean) => Promise<unknown>
  onError?: (error: unknown) => void
}) {
  const { t } = useTranslation()
  const lock = useLockedEdit()
  const [enabled, setEnabled] = useState(saved)
  return (
    <LockedForm
      lock={lock}
      name={label}
      className="flex flex-col gap-3"
      confirmTitle={confirmTitle(enabled)}
      confirmBody={confirmBody(enabled)}
      destructive={!enabled}
      saving={saving}
      canSave={enabled !== saved}
      onReset={() => setEnabled(saved)}
      onSave={() => onSave(enabled)}
      onError={onError}
      status={status}
    >
      <label className="flex h-9 items-center gap-2 text-sm font-medium">
        <Switch checked={enabled} aria-label={label} onCheckedChange={setEnabled} />
        {enabled ? t('app.active') : t('app.inactive')}
      </label>
    </LockedForm>
  )
}

function FourEyesCard({ items }: { items: SettingEntry[] }) {
  const { t } = useTranslation()
  const save = useSaveSettings()
  const entry = findSetting(items, 'community.four_eyes')
  const enabled = entry?.value !== false
  return (
    <SettingsCard title={t('settings.fourEyes')} subtitle={t('settings.fourEyesHint')}>
      <ToggleForm
        key={`${String(enabled)}-${entry?.version ?? 0}`}
        label={t('settings.fourEyes')}
        saved={enabled}
        saving={save.isPending}
        confirmTitle={(next) => t(next ? 'settings.fourEyesOnTitle' : 'settings.fourEyesOffTitle')}
        confirmBody={(next) => t(next ? 'settings.fourEyesOnBody' : 'settings.fourEyesOffBody')}
        status={<ChangedBy entry={entry} />}
        onSave={(next) => save.mutateAsync({ 'community.four_eyes': next })}
      />
    </SettingsCard>
  )
}

function PolicyFourEyesForm({ setting }: { setting: FourEyesSetting }) {
  const { t } = useTranslation()
  const save = useSetPolicyFourEyes()
  return (
    <ToggleForm
      label={t('settings.policyFourEyes')}
      saved={setting.enabled}
      saving={save.isPending}
      confirmTitle={(next) => t(next ? 'settings.policyFourEyesOnTitle' : 'settings.policyFourEyesOffTitle')}
      confirmBody={(next) => t(next ? 'settings.policyFourEyesOnBody' : 'settings.policyFourEyesOffBody')}
      status={
        <p className="text-xs text-muted-foreground">
          {setting.updated_by
            ? t('settings.lastChangedBy', { time: stamp(setting.updated_at), name: setting.updated_by })
            : t('settings.lastChanged', { time: stamp(setting.updated_at) })}
        </p>
      }
      onSave={(next) => save.mutateAsync(next)}
      onError={(caught) => toast.error(errorText(caught))}
    />
  )
}

function PolicyFourEyesCard() {
  const { t } = useTranslation()
  const query = usePolicyFourEyes()
  return (
    <SettingsCard title={t('settings.policyFourEyes')} subtitle={t('settings.policyFourEyesHint')}>
      <QueryContent query={query}>
        {(setting) => (
          <PolicyFourEyesForm key={`${String(setting.enabled)}-${setting.version}`} setting={setting} />
        )}
      </QueryContent>
    </SettingsCard>
  )
}

export function CommunitySection() {
  const { t } = useTranslation()
  const settings = useSettingEntries()
  return (
    <SectionFrame title={t('settings.community')} description={t('settings.communityDescription')}>
      <QueryContent query={settings}>{(items) => <FourEyesCard items={items} />}</QueryContent>
      <PolicyFourEyesCard />
    </SectionFrame>
  )
}
