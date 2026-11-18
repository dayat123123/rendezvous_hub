import { LoaderCircleIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePolicyState } from '@/features/compliance/policy-versions/hooks'
import type { PolicyDiff } from '@/features/compliance/policy-versions/types'
import { QueryContent } from '@/features/settings/components/settings-ui'
import { FieldText } from '@/features/system/components/system-ui'
import { policyErrorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'

import { useContentRules, useSetContentRule, useSetNewAccountDays, useSetRejoinCooldownHours } from '../hooks'
import { sortRules } from '../logic'
import {
  contentActions,
  contentScopes,
  NEW_ACCOUNT_DAYS_MAX,
  REJOIN_COOLDOWN_HOURS_MAX,
  type ContentAction,
  type ContentRule,
  type ContentRules,
  type ContentScope,
} from '../types'
import { PolicyCard } from './policy-ui'

function RuleRow({ rule }: { rule: ContentRule }) {
  const { t } = useTranslation()
  const save = useSetContentRule()
  const name = t(`policy.categories.${rule.category}`)
  const change = (action: ContentAction, scope: ContentScope) =>
    save
      .mutateAsync({ category: rule.category, action, scope })
      .then(() =>
        toast.success(
          t('policy.rules.changed', {
            category: name,
            action: t(`policy.actions.${action}`),
            scope: t(`policy.scopes.${scope}`),
          }),
        ),
      )
      .catch((error: unknown) => toast.error(policyErrorText(error)))
  return (
    <TableRow className="align-top">
      <TableCell className="py-2 whitespace-normal">
        <p className="font-medium">{name}</p>
        <p className="max-w-md text-xs text-muted-foreground">{t(`policy.categoryHints.${rule.category}`)}</p>
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={rule.action}
          disabled={save.isPending}
          onValueChange={(value) => void change(value as ContentAction, rule.scope)}
        >
          <SelectTrigger className="h-8 w-32" aria-label={t('policy.rules.actionFor', { category: name })}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {contentActions.map((action) => (
              <SelectItem key={action} value={action}>
                {t(`policy.actions.${action}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={rule.scope}
          disabled={save.isPending}
          onValueChange={(value) => void change(rule.action, value as ContentScope)}
        >
          <SelectTrigger className="h-8 w-40" aria-label={t('policy.rules.scopeFor', { category: name })}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {contentScopes.map((scope) => (
              <SelectItem key={scope} value={scope}>
                {t(`policy.scopes.${scope}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2 text-xs whitespace-normal text-muted-foreground">
        {stamp(rule.updated_at)}
        {rule.updated_by?.name ? <span className="block">{rule.updated_by.name}</span> : null}
      </TableCell>
    </TableRow>
  )
}

type NumberSettingProps = {
  value: number
  max: number
  i18nKey: 'newAccount' | 'rejoinCooldown'
  settingKey: string
  presets: readonly number[]
  pending: boolean
  onSave: (value: number) => Promise<unknown>
}

function NumberSettingCard({
  value: current,
  max,
  i18nKey,
  settingKey,
  presets,
  pending,
  onSave,
}: NumberSettingProps) {
  const { t } = useTranslation()
  const id = useId()
  const state = usePolicyState()
  const [text, setText] = useState(String(current))
  const [checked, setChecked] = useState(false)
  const value = Number(text.trim())
  const valid = /^\d{1,4}$/.test(text.trim()) && value >= 0 && value <= max
  const amount = (count: number) => {
    if (count === 0) return t(`policy.${i18nKey}.none`)
    if (i18nKey === 'rejoinCooldown' && count % 24 === 0) {
      return t('policy.rejoinCooldown.amountDays', { count, days: count / 24 })
    }
    return t(`policy.${i18nKey}.amount`, { count })
  }
  const drafted = draftSetting(state.data?.draft?.diff, settingKey)
  const live = drafted ? Number(drafted.from) : current
  const points = (['one', 'two', 'three', 'four'] as const).map((key) => t(`policy.${i18nKey}.points.${key}`))
  const save = (next: number) =>
    onSave(next)
      .then(() => {
        toast.success(
          t(state.data?.four_eyes ? 'policy.setting.savedDraftFourEyes' : 'policy.setting.savedDraft', {
            value: amount(next),
          }),
        )
        setChecked(false)
      })
      .catch((error: unknown) => toast.error(policyErrorText(error)))
  return (
    <PolicyCard title={t(`policy.${i18nKey}.title`)} subtitle={t(`policy.${i18nKey}.subtitle`)}>
      <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-row text-muted-foreground">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="text-row">
        {t('policy.setting.live', { value: amount(live) })}
        {drafted ? (
          <span className="ml-1 font-medium text-warning">
            {t(state.data?.four_eyes ? 'policy.setting.draftFourEyes' : 'policy.setting.draft', {
              value: amount(current),
            })}
          </span>
        ) : null}
      </p>
      <form
        className="flex flex-wrap items-start gap-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setChecked(true)
          if (!valid || value === current) return
          void save(value)
        }}
      >
        <div className="flex w-40 flex-col gap-1.5">
          <Label htmlFor={`${id}-value`}>{t(`policy.${i18nKey}.label`)}</Label>
          <Input
            id={`${id}-value`}
            inputMode="numeric"
            value={text}
            aria-invalid={checked && !valid ? true : undefined}
            aria-describedby={`${id}-value-text`}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <Button type="submit" size="sm" className="mt-6" disabled={pending || (valid && value === current)}>
          {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t('app.save')}
        </Button>
        <FieldText
          id={`${id}-value-text`}
          error={checked && !valid ? t(`policy.${i18nKey}.problem`, { max }) : undefined}
          hint={
            valid
              ? `${t(`policy.${i18nKey}.meaning`, { value: amount(value), count: value })} ${t(`policy.${i18nKey}.hint`)}`
              : t(`policy.${i18nKey}.hint`)
          }
        />
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t('policy.setting.presets')}</span>
        {presets.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="outline"
            size="xs"
            aria-pressed={value === preset}
            disabled={pending}
            onClick={() => setText(String(preset))}
          >
            {amount(preset)}
          </Button>
        ))}
      </div>
    </PolicyCard>
  )
}

function draftSetting(diff: PolicyDiff | undefined, key: string) {
  return diff?.sections.settings?.items?.find((item) => item.key === key)
}

function NewAccountCard({ days }: { days: number }) {
  const save = useSetNewAccountDays()
  return (
    <NumberSettingCard
      value={days}
      max={NEW_ACCOUNT_DAYS_MAX}
      i18nKey="newAccount"
      settingKey="safety.new_account_days"
      presets={[0, 1, 3, 7, 14]}
      pending={save.isPending}
      onSave={(value) => save.mutateAsync(value)}
    />
  )
}

function RejoinCooldownCard({ hours }: { hours: number }) {
  const save = useSetRejoinCooldownHours()
  return (
    <NumberSettingCard
      value={hours}
      max={REJOIN_COOLDOWN_HOURS_MAX}
      i18nKey="rejoinCooldown"
      settingKey="account.rejoin_cooldown_hours"
      presets={[0, 24, 72, 168, 720]}
      pending={save.isPending}
      onSave={(value) => save.mutateAsync(value)}
    />
  )
}

function RulesBody({ rules }: { rules: ContentRules }) {
  const { t } = useTranslation()
  return (
    <>
      <PolicyCard title={t('policy.rules.title')} subtitle={t('policy.rules.subtitle')}>
        <Table>
          <caption className="sr-only">{t('policy.rules.title')}</caption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('policy.rules.category')}</TableHead>
              <TableHead>{t('policy.rules.action')}</TableHead>
              <TableHead>{t('policy.rules.scope')}</TableHead>
              <TableHead>{t('policy.rules.updated')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRules(rules.categories).map((rule) => (
              <RuleRow key={rule.category} rule={rule} />
            ))}
          </TableBody>
        </Table>
        <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-xs text-muted-foreground">
          <li>{t('policy.rules.noteActions')}</li>
          <li>{t('policy.rules.noteScope')}</li>
          <li>{t('policy.rules.noteExempt')}</li>
        </ul>
      </PolicyCard>
      <NewAccountCard key={rules.new_account_days} days={rules.new_account_days} />
      {rules.rejoin_cooldown_hours == null ? null : (
        <RejoinCooldownCard key={rules.rejoin_cooldown_hours} hours={rules.rejoin_cooldown_hours} />
      )}
    </>
  )
}

export function RulesTab() {
  const rules = useContentRules()
  return <QueryContent query={rules}>{(data) => <RulesBody rules={data} />}</QueryContent>
}
