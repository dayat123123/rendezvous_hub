import { LoaderCircleIcon, PowerIcon, PowerOffIcon, ShieldAlertIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox, Switch } from '@/components/ui/controls'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAgent } from '@/features/auth/hooks'
import { canManageTradeShare } from '@/features/presence/types'
import { QueryContent } from '@/features/settings/components/settings-ui'
import { ToneBadge } from '@/features/system/components/system-ui'
import { tradeErrorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'
import { cn } from '@/lib/utils'

import { useTradeSettings, useUpdateTradeSetting } from '../hooks'
import {
  KILL_SWITCH_KEY,
  parseSetting,
  reasonValid,
  sameSettingValue,
  settingDraft,
  settingKind,
  settingName,
  type SettingDraft,
} from '../logic'
import {
  boards,
  REASON_MAX,
  REASON_MIN,
  type SettingKind,
  type TradeSetting,
  type TradeSettingName,
} from '../types'

function useValueText() {
  const { t } = useTranslation()
  return (kind: SettingKind, value: unknown) => {
    switch (kind.type) {
      case 'boolean':
        return value === true ? t('app.active') : t('app.inactive')
      case 'integer':
        return typeof value === 'number'
          ? t(`trade.settings.units.${kind.unit}`, { count: value, value: formatNumber(value) })
          : '–'
      case 'time':
        return typeof value === 'string' ? t('trade.settings.timeValue', { time: value }) : '–'
      case 'boards':
        return Array.isArray(value) && value.length > 0 ? value.join(', ') : '–'
    }
  }
}

function KillSwitch({ setting, manage }: { setting: TradeSetting | undefined; manage: boolean }) {
  const { t } = useTranslation()
  const update = useUpdateTradeSetting()
  const [asking, setAsking] = useState(false)
  const enabled = setting?.value === true
  const next = !enabled
  return (
    <section
      aria-labelledby="trade-kill-switch"
      className={cn(
        'flex flex-col gap-3 rounded-lg border-2 p-4 sm:flex-row sm:items-center',
        enabled ? 'border-success/40' : 'border-destructive/50',
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <ShieldAlertIcon
          className={cn('mt-0.5 size-5 shrink-0', enabled ? 'text-success' : 'text-destructive')}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="trade-kill-switch" className="text-panel font-semibold">
              {t('trade.settings.killSwitch')}
            </h2>
            <ToneBadge tone={enabled ? 'ok' : 'late'}>
              {enabled ? t('trade.settings.featureOn') : t('trade.settings.featureOff')}
            </ToneBadge>
          </div>
          <p className="text-row text-muted-foreground">
            {enabled ? t('trade.settings.killSwitchOnHint') : t('trade.settings.killSwitchOffHint')}
          </p>
          {setting?.updated_at ? (
            <p className="text-xs text-muted-foreground">
              {t('trade.settings.changedAt', { time: stamp(setting.updated_at) })}
            </p>
          ) : null}
        </div>
      </div>
      {manage ? (
        <Button
          variant={enabled ? 'destructive' : 'default'}
          disabled={!setting}
          onClick={() => setAsking(true)}
        >
          {enabled ? <PowerOffIcon /> : <PowerIcon />}
          {enabled ? t('trade.settings.turnOff') : t('trade.settings.turnOn')}
        </Button>
      ) : null}
      <ReasonDialog
        open={asking}
        title={next ? t('trade.settings.turnOnTitle') : t('trade.settings.turnOffTitle')}
        description={next ? t('trade.settings.turnOnBody') : t('trade.settings.turnOffBody')}
        label={t('trade.detail.reasonLabel')}
        action={next ? t('trade.settings.turnOn') : t('trade.settings.turnOff')}
        destructive={!next}
        min={REASON_MIN}
        max={REASON_MAX}
        hint={t('trade.reasonHint')}
        pending={update.isPending}
        onClose={() => setAsking(false)}
        onSubmit={(reason) =>
          void update
            .mutateAsync({ key: KILL_SWITCH_KEY, value: next, reason })
            .then(() => {
              setAsking(false)
              toast.success(next ? t('trade.settings.turnedOn') : t('trade.settings.turnedOff'))
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }
      />
    </section>
  )
}

function Editor({
  id,
  kind,
  draft,
  onChange,
  invalid,
}: {
  id: string
  kind: SettingKind
  draft: SettingDraft
  onChange: (draft: SettingDraft) => void
  invalid: boolean
}) {
  const { t } = useTranslation()
  switch (kind.type) {
    case 'boolean':
      return (
        <label className="flex h-9 items-center gap-2 text-sm font-medium">
          <Switch id={id} checked={draft === true} onCheckedChange={(value) => onChange(value)} />
          {draft === true ? t('app.active') : t('app.inactive')}
        </label>
      )
    case 'integer':
      return (
        <Input
          id={id}
          inputMode="numeric"
          className="w-40"
          value={typeof draft === 'string' ? draft : ''}
          aria-invalid={invalid ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case 'time':
      return (
        <Input
          id={id}
          type="time"
          className="w-40"
          value={typeof draft === 'string' ? draft : ''}
          aria-invalid={invalid ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case 'boards': {
      const selected = Array.isArray(draft) ? draft : []
      return (
        <div
          id={id}
          role="group"
          aria-label={t('trade.settings.names.boards')}
          className="flex flex-wrap gap-2"
        >
          {boards.map((board) => (
            <label key={board} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-row">
              <Checkbox
                checked={selected.includes(board)}
                onCheckedChange={(value) =>
                  onChange(
                    value === true
                      ? boards.filter((item) => item === board || selected.includes(item))
                      : selected.filter((item) => item !== board),
                  )
                }
              />
              <span className="font-mono">{board}</span>
              <span className="text-xs text-muted-foreground">{t(`trade.settings.boardNames.${board}`)}</span>
            </label>
          ))}
        </div>
      )
    }
  }
}

function SettingDialog({
  setting,
  name,
  kind,
  onClose,
}: {
  setting: TradeSetting
  name: TradeSettingName
  kind: SettingKind
  onClose: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const update = useUpdateTradeSetting()
  const [draft, setDraft] = useState<SettingDraft>(() => settingDraft(kind, setting.value))
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const parsed = parseSetting(kind, draft)
  const unchanged = parsed.problem === null && sameSettingValue(parsed.value, setting.value)
  const reasonProblem = touched && !reasonValid(reason)
  const label = t(`trade.settings.names.${name}`)
  const problemText =
    parsed.problem === 'range' && kind.type === 'integer'
      ? t('trade.settings.problems.range', { min: formatNumber(kind.min), max: formatNumber(kind.max) })
      : parsed.problem
        ? t(`trade.settings.problems.${parsed.problem}`)
        : null
  return (
    <Dialog open onOpenChange={(next) => !next && !update.isPending && onClose()}>
      <DialogContent className="sm:max-w-md" closeLabel={t('app.close')}>
        <DialogHeader>
          <DialogTitle>{t('trade.settings.editTitle', { name: label })}</DialogTitle>
          <DialogDescription>{t(`trade.settings.hints.${name}`)}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            setTouched(true)
            if (parsed.problem !== null || unchanged || !reasonValid(reason)) return
            void update
              .mutateAsync({ key: setting.key, value: parsed.value, reason })
              .then(() => {
                toast.success(t('trade.settings.saved', { name: label }))
                onClose()
              })
              .catch((error: unknown) => toast.error(tradeErrorText(error)))
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-value`}>{label}</Label>
            <Editor
              id={`${id}-value`}
              kind={kind}
              draft={draft}
              invalid={touched && parsed.problem !== null}
              onChange={setDraft}
            />
            {touched && problemText ? (
              <p role="alert" className="text-xs text-destructive">
                {problemText}
              </p>
            ) : kind.type === 'integer' ? (
              <p className="text-xs text-muted-foreground">
                {t('trade.settings.problems.range', {
                  min: formatNumber(kind.min),
                  max: formatNumber(kind.max),
                })}
              </p>
            ) : null}
            {touched && unchanged ? (
              <p className="text-xs text-muted-foreground">{t('trade.settings.unchanged')}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-reason`}>{t('trade.detail.reasonLabel')}</Label>
            <Textarea
              id={`${id}-reason`}
              rows={3}
              maxLength={REASON_MAX}
              value={reason}
              aria-invalid={reasonProblem ? true : undefined}
              onChange={(event) => setReason(event.target.value)}
            />
            <p className={cn('text-xs', reasonProblem ? 'text-destructive' : 'text-muted-foreground')}>
              {t('trade.reasonHint')}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={update.isPending} onClick={onClose}>
              {t('app.cancel')}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
              {t('app.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SettingRow({ setting, manage }: { setting: TradeSetting; manage: boolean }) {
  const { t } = useTranslation()
  const valueText = useValueText()
  const [editing, setEditing] = useState(false)
  const name = settingName(setting.key)
  const kind = settingKind(setting.key)
  if (!name || !kind) return null
  const label = t(`trade.settings.names.${name}`)
  return (
    <li className="flex flex-col gap-2 border-b py-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-row font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{t(`trade.settings.hints.${name}`)}</p>
        {setting.updated_at ? (
          <p className="text-xs text-muted-foreground">
            {t('trade.settings.changedAt', { time: stamp(setting.updated_at) })}
          </p>
        ) : null}
      </div>
      <span className="tabular text-row font-medium sm:w-44 sm:text-right">
        {valueText(kind, setting.value)}
      </span>
      {manage ? (
        <Button
          size="xs"
          variant="outline"
          className="self-start sm:self-center"
          aria-label={t('app.editNamed', { name: label })}
          onClick={() => setEditing(true)}
        >
          {t('app.edit')}
        </Button>
      ) : null}
      {editing ? (
        <SettingDialog setting={setting} name={name} kind={kind} onClose={() => setEditing(false)} />
      ) : null}
    </li>
  )
}

const groups: { key: 'access' | 'delivery' | 'limits'; names: TradeSettingName[] }[] = [
  { key: 'access', names: ['pilot_only', 'four_eyes', 'min_account_age_days', 'reapply_cooldown_days'] },
  {
    key: 'delivery',
    names: [
      'min_delay_minutes',
      'max_delay_minutes',
      'force_hide_price',
      'force_hide_lot',
      'boards',
      'eod_flush_time',
      'lot_size',
    ],
  },
  {
    key: 'limits',
    names: [
      'max_subscriptions',
      'request_expiry_days',
      'review_subscriber_threshold',
      'daily_push_cap',
      'retention_days',
      'fanout_batch',
    ],
  },
]

export function SettingsTab() {
  const { t } = useTranslation()
  const me = useAgent()
  const manage = canManageTradeShare(me)
  const settings = useTradeSettings()
  return (
    <QueryContent query={settings}>
      {(items) => {
        const byName = new Map(items.map((item) => [settingName(item.key), item]))
        return (
          <div className="flex flex-col gap-6">
            <KillSwitch setting={byName.get('enabled')} manage={manage} />
            {manage ? null : <p className="text-xs text-muted-foreground">{t('trade.settings.readOnly')}</p>}
            {groups.map((group) => (
              <section
                key={group.key}
                aria-labelledby={`trade-settings-${group.key}`}
                className="flex flex-col"
              >
                <h2 id={`trade-settings-${group.key}`} className="border-b pb-2 text-panel font-semibold">
                  {t(`trade.settings.groups.${group.key}`)}
                </h2>
                <ul>
                  {group.names.map((name) => {
                    const setting = byName.get(name)
                    return setting ? <SettingRow key={name} setting={setting} manage={manage} /> : null
                  })}
                </ul>
              </section>
            ))}
          </div>
        )
      }}
    </QueryContent>
  )
}
