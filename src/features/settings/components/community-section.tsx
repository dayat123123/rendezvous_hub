import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { FourEyesSetting } from '@/features/compliance/policy-versions/api'
import { usePolicyFourEyes, useSetPolicyFourEyes } from '@/features/compliance/policy-versions/hooks'
import { errorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'

import { findSetting, useSaveSettings, useSettingEntries } from '../hooks'
import type { SettingEntry } from '../types'
import { ChangedBy, QueryContent, SectionFrame, SettingsCard, ToggleForm } from './settings-ui'

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
