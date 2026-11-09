import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LockedForm } from '@/components/locked-form'
import { Checkbox, Switch } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { attachmentKinds, formatLabels, knownFormats } from '@/features/conversation/media'
import { useLockedEdit } from '@/hooks/use-locked-edit'

import { useAdminAttachmentPolicy, useSaveAttachmentPolicy } from '../hooks'
import { inRange } from '../logic'
import type { AdminAttachmentPolicy, AttachmentKindRule, AttachmentPolicyKind } from '../types'
import { ChangedBy, FieldMessage, QueryContent, SectionFrame, SettingsCard } from './settings-ui'

type KindDraft = { enabled: boolean; mb: string; seconds: string; formats: string[] }
type Draft = Record<AttachmentPolicyKind, KindDraft>

export const MIN_VIDEO_SECONDS = 5

function catalogCodes(data: AdminAttachmentPolicy, kind: AttachmentPolicyKind) {
  const codes = Object.keys(data.catalog[kind]?.formats ?? {})
  const ordered = knownFormats.filter((format) => codes.includes(format.code)).map((format) => format.code)
  return [...ordered, ...codes.filter((code) => !ordered.includes(code))]
}

function toDraft(data: AdminAttachmentPolicy): Draft {
  const draft = {} as Draft
  for (const kind of attachmentKinds) {
    const rule = data.policy[kind]
    const catalog = data.catalog[kind]
    draft[kind] = {
      enabled: rule?.enabled ?? false,
      mb: String(rule?.max_mb ?? catalog.ceiling_mb),
      seconds: String(rule?.max_seconds ?? catalog.ceiling_seconds ?? ''),
      formats: catalogCodes(data, kind).filter((code) => rule?.formats.includes(code)),
    }
  }
  return draft
}

function toPolicy(draft: Draft) {
  const policy = {} as Record<AttachmentPolicyKind, AttachmentKindRule>
  for (const kind of attachmentKinds) {
    const item = draft[kind]
    policy[kind] = {
      enabled: item.enabled,
      max_mb: Number(item.mb.trim()),
      formats: item.formats,
      ...(kind === 'videos' ? { max_seconds: Number(item.seconds.trim()) } : {}),
    }
  }
  return policy
}

function problems(draft: Draft, data: AdminAttachmentPolicy) {
  return Object.fromEntries(
    attachmentKinds.map((kind) => {
      const item = draft[kind]
      const catalog = data.catalog[kind]
      return [
        kind,
        {
          mb: !inRange(item.mb, 1, catalog.ceiling_mb),
          seconds:
            kind === 'videos' &&
            !inRange(item.seconds, MIN_VIDEO_SECONDS, catalog.ceiling_seconds ?? MIN_VIDEO_SECONDS),
          formats: item.enabled && item.formats.length === 0,
        },
      ]
    }),
  ) as Record<AttachmentPolicyKind, { mb: boolean; seconds: boolean; formats: boolean }>
}

const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b)

function AttachmentsForm({ data }: { data: AdminAttachmentPolicy }) {
  const { t } = useTranslation()
  const save = useSaveAttachmentPolicy()
  const lock = useLockedEdit()
  const saved = toDraft(data)
  const [draft, setDraft] = useState(saved)
  const [touched, setTouched] = useState(false)
  const issues = problems(draft, data)
  const valid = attachmentKinds.every((kind) => !Object.values(issues[kind]).some(Boolean))

  const set = (kind: AttachmentPolicyKind, patch: Partial<KindDraft>) =>
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }))

  const summary = attachmentKinds
    .map((kind) => {
      const item = draft[kind]
      const name = t(`settings.attachmentsKinds.${kind}`)
      if (!item.enabled) return t('settings.attachmentsSummaryOff', { kind: name })
      const formats = item.formats.map((code) => formatLabels[code] ?? code).join(', ')
      return kind === 'videos'
        ? t('settings.attachmentsSummaryVideo', {
            kind: name,
            mb: item.mb.trim(),
            seconds: item.seconds.trim(),
            formats,
          })
        : t('settings.attachmentsSummary', { kind: name, mb: item.mb.trim(), formats })
    })
    .join('; ')

  return (
    <LockedForm
      lock={lock}
      name={t('settings.attachments')}
      className="flex flex-col gap-4"
      confirmTitle={t('settings.attachmentsConfirmTitle')}
      confirmBody={t('settings.attachmentsConfirmBody', { summary })}
      saving={save.isPending}
      canSave={!valid || !same(draft, saved)}
      onCheck={() => {
        setTouched(true)
        return valid
      }}
      onReset={() => {
        setDraft(saved)
        setTouched(false)
      }}
      onSave={() => save.mutateAsync(toPolicy(draft))}
      status={
        <ChangedBy
          entry={{
            key: 'attachments.cs',
            value: null,
            description: null,
            version: 0,
            updated_at: data.updated_at,
            updated_by: data.updated_by,
          }}
        />
      }
    >
      {attachmentKinds.map((kind) => {
        const item = draft[kind]
        const catalog = data.catalog[kind]
        const name = t(`settings.attachmentsKinds.${kind}`)
        const lower = t(`attachments.kinds.${kind}`)
        const issue = issues[kind]
        return (
          <SettingsCard key={kind} title={name}>
            <div className="flex items-center gap-2">
              <Switch
                id={`attachments-${kind}-enabled`}
                checked={item.enabled}
                onCheckedChange={(enabled) => set(kind, { enabled })}
              />
              <Label htmlFor={`attachments-${kind}-enabled`}>
                {t('settings.attachmentsEnabled', { kind: lower })}
              </Label>
            </div>
            {item.enabled ? null : (
              <p className="text-xs text-muted-foreground">{t('settings.attachmentsOff', { kind: lower })}</p>
            )}
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex w-56 flex-col gap-1.5">
                <Label htmlFor={`attachments-${kind}-mb`}>
                  {t('settings.attachmentsMaxMb', { max: catalog.ceiling_mb })}
                </Label>
                <Input
                  id={`attachments-${kind}-mb`}
                  inputMode="numeric"
                  maxLength={3}
                  value={item.mb}
                  aria-invalid={touched && issue.mb ? true : undefined}
                  onChange={(event) => set(kind, { mb: event.target.value })}
                />
                <FieldMessage
                  error={
                    touched && issue.mb
                      ? t('settings.numberRange', { min: 1, max: catalog.ceiling_mb })
                      : undefined
                  }
                />
              </div>
              {kind === 'videos' ? (
                <div className="flex w-56 flex-col gap-1.5">
                  <Label htmlFor="attachments-videos-seconds">
                    {t('settings.attachmentsMaxSeconds', { max: catalog.ceiling_seconds })}
                  </Label>
                  <Input
                    id="attachments-videos-seconds"
                    inputMode="numeric"
                    maxLength={3}
                    value={item.seconds}
                    aria-invalid={touched && issue.seconds ? true : undefined}
                    onChange={(event) => set(kind, { seconds: event.target.value })}
                  />
                  <FieldMessage
                    error={
                      touched && issue.seconds
                        ? t('settings.numberRange', {
                            min: MIN_VIDEO_SECONDS,
                            max: catalog.ceiling_seconds,
                          })
                        : undefined
                    }
                  />
                </div>
              ) : null}
            </div>
            <div role="group" aria-label={t('settings.attachmentsFormats', { kind: lower })}>
              <p className="mb-1.5 text-row font-medium">
                {t('settings.attachmentsFormats', { kind: lower })}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {catalogCodes(data, kind).map((code) => (
                  <label key={code} className="flex items-center gap-2 text-row">
                    <Checkbox
                      checked={item.formats.includes(code)}
                      onCheckedChange={(value) =>
                        set(kind, {
                          formats:
                            value === true
                              ? catalogCodes(data, kind).filter(
                                  (other) => other === code || item.formats.includes(other),
                                )
                              : item.formats.filter((other) => other !== code),
                        })
                      }
                    />
                    {formatLabels[code] ?? code}{' '}
                    <span className="text-xs text-muted-foreground">
                      (.{catalog.formats[code]?.ext ?? code})
                    </span>
                  </label>
                ))}
              </div>
              <FieldMessage
                error={touched && issue.formats ? t('settings.attachmentsNeedFormat') : undefined}
              />
            </div>
          </SettingsCard>
        )
      })}
    </LockedForm>
  )
}

export function AttachmentsSection() {
  const { t } = useTranslation()
  const query = useAdminAttachmentPolicy()
  return (
    <SectionFrame title={t('settings.attachments')} description={t('settings.attachmentsDescription')}>
      <QueryContent query={query}>
        {(data) => <AttachmentsForm key={data.updated_at ?? 'default'} data={data} />}
      </QueryContent>
    </SectionFrame>
  )
}
