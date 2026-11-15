import {
  CircleCheckIcon,
  Clock3Icon,
  PlugZapIcon,
  RotateCcwIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui/controls'
import { Label } from '@/components/ui/label'
import { useAgent } from '@/features/auth/hooks'
import { isSuperAdmin } from '@/features/presence/types'
import { QueryContent, SettingsCard } from '@/features/settings/components/settings-ui'
import { SecretField, TextField, ToneBadge } from '@/features/system/components/system-ui'
import { Facts } from '@/features/trade-share/components/shared'
import { staffName } from '@/features/trade-share/logic'
import { relayCounterLabel, relayMetricLabel, relayStateLabel } from '@/features/trade-share/relay-labels'
import { REASON_MAX, REASON_MIN } from '@/features/trade-share/types'
import { useNow } from '@/hooks/use-now'
import { tradeErrorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'

import {
  useClearRelayAes,
  useRelayCommand,
  useRelayView,
  useSetRelayAes,
  useSetTradeNotify,
  useUpdateRelay,
} from '../hooks'
import {
  aesProblems,
  commandProgress,
  configProblems,
  cooldownSeconds,
  counterEntries,
  instanceCommandState,
  instanceHealth,
  type InstanceHealth,
} from '../logic'
import {
  aesModes,
  relayCommands,
  type AesMode,
  type RelayCommand,
  type RelayInstance,
  type RelayView,
} from '../types'

const healthTones: Record<InstanceHealth, 'ok' | 'late' | 'warn'> = {
  connected: 'ok',
  disconnected: 'late',
  stale: 'warn',
}

const maybeStamp = (value: string | null) => (value ? stamp(value) : '–')

function InstanceCard({ instance, view, now }: { instance: RelayInstance; view: RelayView; now: Date }) {
  const { t } = useTranslation()
  const health = instanceHealth(instance, now)
  const counters = counterEntries(instance.counters)
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-row font-medium">{instance.instance}</span>
        <ToneBadge tone={healthTones[health]}>{t(`trade.relay.health.${health}`)}</ToneBadge>
        {instance.state ? (
          <span className="text-xs text-muted-foreground">{relayStateLabel(t, instance.state)}</span>
        ) : null}
        {instance.version ? (
          <span className="ml-auto text-xs text-muted-foreground">
            {t('trade.relay.version', { version: instance.version })}
          </span>
        ) : null}
      </div>
      <Facts
        rows={[
          [t('trade.relay.lastPacket'), maybeStamp(instance.last_packet_at)],
          [t('trade.relay.lastRealtime'), maybeStamp(instance.last_realtime_at)],
          [t('trade.relay.reportedAt'), stamp(instance.reported_at)],
          [t('trade.relay.startedAt'), maybeStamp(instance.started_at)],
          ...relayCommands.map((command): [string, React.ReactNode] => [
            t(`trade.relay.commands.${command}`),
            t(`trade.relay.applied.${instanceCommandState(instance, view, command)}`, {
              generation:
                command === 'reconnect' ? (instance.applied_reconnect ?? 0) : (instance.applied_restart ?? 0),
            }),
          ]),
        ]}
      />
      {instance.last_error ? (
        <p className="flex items-start gap-1.5 text-xs break-words text-destructive">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {instance.last_error}
        </p>
      ) : null}
      {counters.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('trade.relay.countersTitle')}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
            {counters.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="truncate text-muted-foreground">{relayCounterLabel(t, key)}</dt>
                <dd className="tabular">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </li>
  )
}

function Status({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const now = useNow(15_000)
  const today = Object.entries(view.today).sort(([a], [b]) => a.localeCompare(b))
  return (
    <SettingsCard title={t('trade.relay.statusTitle')} subtitle={t('trade.relay.statusHint')}>
      <Facts
        rows={[
          [
            t('trade.relay.tradeShare'),
            view.trade_share_enabled ? t('trade.monitoring.on') : t('trade.monitoring.off'),
          ],
          [
            t('trade.relay.tradeNotify'),
            view.trade_notify_enabled ? t('trade.monitoring.on') : t('trade.monitoring.off'),
          ],
          [t('trade.relay.address'), view.iproxy_addr ?? t('trade.relay.notConfigured')],
          [t('trade.relay.identity'), view.identity],
        ]}
      />
      {view.instances.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed p-3 text-row text-muted-foreground">
          <PlugZapIcon className="size-4" aria-hidden="true" />
          {t('trade.relay.noInstances')}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {view.instances.map((instance) => (
            <InstanceCard key={instance.instance} instance={instance} view={view} now={now} />
          ))}
        </ul>
      )}
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">{t('trade.relay.todayTitle')}</p>
        {today.length === 0 ? (
          <p className="text-row text-muted-foreground">{t('trade.monitoring.noRelayToday')}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-row sm:grid-cols-4">
            {today.map(([metric, count]) => (
              <div key={metric} className="flex justify-between gap-2">
                <dt className="truncate text-muted-foreground">{relayMetricLabel(t, metric)}</dt>
                <dd className="tabular">{formatNumber(count)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </SettingsCard>
  )
}

function Commands({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const now = useNow(1_000)
  const command = useRelayCommand()
  const [asking, setAsking] = useState<RelayCommand | null>(null)
  const wait = cooldownSeconds(view.last_command_at, now)
  return (
    <SettingsCard title={t('trade.relay.commandsTitle')} subtitle={t('trade.relay.commandsHint')}>
      <div className="flex flex-wrap items-center gap-2">
        {relayCommands.map((item) => (
          <Button
            key={item}
            variant={item === 'restart' ? 'destructive' : 'outline'}
            disabled={wait > 0 || command.isPending}
            onClick={() => setAsking(item)}
          >
            {item === 'restart' ? <RotateCcwIcon /> : <PlugZapIcon />}
            {t(`trade.relay.commands.${item}`)}
          </Button>
        ))}
        {wait > 0 ? (
          <span className="tabular text-xs text-muted-foreground">
            {t('trade.relay.cooldown', { count: wait })}
          </span>
        ) : null}
      </div>
      <ul className="flex flex-col gap-1">
        {relayCommands.map((item) => {
          const progress = commandProgress(view, item)
          if (progress.state === 'none') return null
          return (
            <li key={item} className="flex items-center gap-2 text-row">
              {progress.state === 'done' ? (
                <CircleCheckIcon className="size-4 text-success" aria-hidden="true" />
              ) : (
                <Clock3Icon className="size-4 text-warning" aria-hidden="true" />
              )}
              <span>
                {progress.state === 'done'
                  ? t('trade.relay.done', {
                      command: t(`trade.relay.commands.${item}`),
                      generation: progress.generation,
                      time: progress.doneAt ? stamp(progress.doneAt) : '–',
                    })
                  : t('trade.relay.waiting', {
                      command: t(`trade.relay.commands.${item}`),
                      generation: progress.generation,
                    })}
              </span>
            </li>
          )
        })}
      </ul>
      {view.last_command_at ? (
        <p className="text-xs text-muted-foreground">
          {t('trade.relay.lastCommand', { time: stamp(view.last_command_at) })}
        </p>
      ) : null}
      {asking ? (
        <ReasonDialog
          open
          title={t(`trade.relay.confirm.${asking}.title`)}
          description={t(`trade.relay.confirm.${asking}.body`)}
          label={t('trade.detail.reasonLabel')}
          action={t(`trade.relay.commands.${asking}`)}
          destructive={asking === 'restart'}
          min={REASON_MIN}
          max={REASON_MAX}
          hint={t('trade.reasonHint')}
          pending={command.isPending}
          onClose={() => setAsking(null)}
          onSubmit={(reason) =>
            void command
              .mutateAsync({ action: asking, reason })
              .then(() => {
                toast.success(t('trade.relay.sent', { command: t(`trade.relay.commands.${asking}`) }))
                setAsking(null)
              })
              .catch((error: unknown) => {
                toast.error(tradeErrorText(error))
                setAsking(null)
              })
          }
        />
      ) : null}
    </SettingsCard>
  )
}

function ConfigForm({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const me = useAgent()
  const update = useUpdateRelay()
  const [address, setAddress] = useState(view.iproxy_addr ?? '')
  const [identity, setIdentity] = useState(view.identity)
  const [heartbeat, setHeartbeat] = useState(String(view.heartbeat_seconds))
  const [asking, setAsking] = useState(false)
  const problems = configProblems({ iproxyAddr: address, identity, heartbeat })
  const changed =
    address.trim() !== (view.iproxy_addr ?? '') ||
    identity.trim() !== view.identity ||
    Number(heartbeat) !== view.heartbeat_seconds
  const invalid = Object.keys(problems).length > 0
  return (
    <SettingsCard title={t('trade.relay.configTitle')} subtitle={t('trade.relay.configHint')}>
      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_8rem]"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!invalid && changed) setAsking(true)
        }}
      >
        <TextField
          id="relay-address"
          label={t('trade.relay.address')}
          value={address}
          placeholder="tcp://10.0.0.5:9990"
          spellCheck={false}
          autoComplete="off"
          error={problems.iproxyAddr ? t(`trade.relay.problems.${problems.iproxyAddr}`) : undefined}
          hint={t('trade.relay.addressHint')}
          onChange={setAddress}
        />
        <TextField
          id="relay-identity"
          label={t('trade.relay.identity')}
          value={identity}
          spellCheck={false}
          autoComplete="off"
          error={problems.identity ? t('trade.relay.problems.identity') : undefined}
          hint={t('trade.relay.identityHint')}
          onChange={setIdentity}
        />
        <TextField
          id="relay-heartbeat"
          label={t('trade.relay.heartbeat')}
          value={heartbeat}
          inputMode="numeric"
          error={problems.heartbeat ? t('trade.relay.problems.heartbeat') : undefined}
          onChange={setHeartbeat}
        />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <Button type="submit" disabled={invalid || !changed || update.isPending}>
            {t('app.save')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {view.updated_by_name || view.updated_by
              ? t('trade.relay.configVersionBy', {
                  version: view.version,
                  time: stamp(view.updated_at),
                  name: staffName({ id: view.updated_by, name: view.updated_by_name }, me.id, {
                    you: t('app.you'),
                    staff: t('trade.detail.actors.staff'),
                  }),
                })
              : t('trade.relay.configVersion', { version: view.version, time: stamp(view.updated_at) })}
          </span>
        </div>
      </form>
      <ReasonDialog
        open={asking}
        title={t('trade.relay.configConfirmTitle')}
        description={t('trade.relay.configConfirmBody')}
        label={t('trade.detail.reasonLabel')}
        action={t('app.save')}
        min={REASON_MIN}
        max={REASON_MAX}
        hint={t('trade.reasonHint')}
        pending={update.isPending}
        onClose={() => setAsking(false)}
        onSubmit={(reason) =>
          void update
            .mutateAsync({
              input: { iproxyAddr: address, identity, heartbeatSeconds: Number(heartbeat) },
              reason,
            })
            .then((saved) => {
              setAsking(false)
              setAddress(saved.iproxy_addr ?? '')
              setIdentity(saved.identity)
              setHeartbeat(String(saved.heartbeat_seconds))
              toast.success(t('trade.relay.configSaved'))
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }
      />
    </SettingsCard>
  )
}

function AesForm({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const setAes = useSetRelayAes()
  const clearAes = useClearRelayAes()
  const [mode, setMode] = useState<AesMode>(view.aes.mode)
  const [key, setKey] = useState('')
  const [iv, setIv] = useState('')
  const [touched, setTouched] = useState(false)
  const [asking, setAsking] = useState<'set' | 'clear' | null>(null)
  const problems = aesProblems({ mode, key, iv })
  const aes = view.aes
  return (
    <SettingsCard title={t('trade.relay.aesTitle')} subtitle={t('trade.relay.aesHint')}>
      <Facts
        rows={[
          [
            t('trade.relay.aesStatus'),
            aes.configured ? t('trade.relay.aesConfigured') : t('trade.relay.aesNone'),
          ],
          ...(aes.configured
            ? ([
                [t('trade.relay.aesMode'), aes.mode.toUpperCase()],
                [
                  t('trade.relay.aesFingerprint'),
                  <span className="font-mono">{aes.fingerprint ?? '–'}</span>,
                ],
                [t('trade.relay.aesLength'), t('trade.relay.aesLengthValue', { count: aes.key_length ?? 0 })],
                [t('trade.relay.aesIv'), aes.has_iv ? t('trade.relay.aesIvSet') : t('trade.relay.aesIvNone')],
              ] as [string, React.ReactNode][])
            : []),
          [t('trade.relay.aesUpdated'), maybeStamp(aes.updated_at)],
        ]}
      />
      <form
        className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]"
        noValidate
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)
          if (Object.keys(problems).length === 0) setAsking('set')
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="relay-aes-mode">{t('trade.relay.aesMode')}</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as AesMode)}>
            <SelectTrigger id="relay-aes-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aesModes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SecretField
          id="relay-aes-key"
          label={t('trade.relay.aesKey')}
          stored={false}
          value={key}
          error={touched && problems.key ? t('trade.relay.problems.key') : undefined}
          hint={t('trade.relay.aesKeyHint')}
          onChange={setKey}
        />
        <SecretField
          id="relay-aes-iv"
          label={t('trade.relay.aesIv')}
          stored={false}
          value={iv}
          error={touched && problems.iv ? t(`trade.relay.problems.${problems.iv}`) : undefined}
          hint={mode === 'cbc' ? t('trade.relay.aesIvHintCbc') : t('trade.relay.aesIvHintEcb')}
          onChange={setIv}
        />
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <Button type="submit" disabled={setAes.isPending}>
            {aes.configured ? t('trade.relay.aesReplace') : t('trade.relay.aesSave')}
          </Button>
          {aes.configured ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => setAsking('clear')}
            >
              <Trash2Icon />
              {t('trade.relay.aesClear')}
            </Button>
          ) : null}
        </div>
      </form>
      <ReasonDialog
        open={asking !== null}
        title={asking === 'clear' ? t('trade.relay.aesClearTitle') : t('trade.relay.aesSaveTitle')}
        description={asking === 'clear' ? t('trade.relay.aesClearBody') : t('trade.relay.aesSaveBody')}
        label={t('trade.detail.reasonLabel')}
        action={asking === 'clear' ? t('trade.relay.aesClear') : t('trade.relay.aesSave')}
        destructive={asking === 'clear'}
        min={REASON_MIN}
        max={REASON_MAX}
        hint={t('trade.reasonHint')}
        pending={setAes.isPending || clearAes.isPending}
        onClose={() => setAsking(null)}
        onSubmit={(reason) => {
          const run =
            asking === 'clear'
              ? clearAes.mutateAsync(reason)
              : setAes.mutateAsync({ input: { mode, key, iv }, reason })
          void run
            .then(() => {
              toast.success(asking === 'clear' ? t('trade.relay.aesCleared') : t('trade.relay.aesSaved'))
              setAsking(null)
              setKey('')
              setIv('')
              setTouched(false)
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }}
      />
    </SettingsCard>
  )
}

function NotifyToggle({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const setNotify = useSetTradeNotify()
  const [asking, setAsking] = useState<boolean | null>(null)
  return (
    <SettingsCard title={t('trade.relay.notifyTitle')} subtitle={t('trade.relay.notifyHint')}>
      <p role="note" className="flex items-start gap-2 rounded-md border border-warning/40 p-3 text-row">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        {t('trade.relay.notifyDuplicate')}
      </p>
      <label className="flex h-9 items-center gap-2 text-sm font-medium">
        <Switch
          checked={view.trade_notify_enabled}
          aria-label={t('trade.relay.notifyTitle')}
          disabled={setNotify.isPending}
          onCheckedChange={(next) => setAsking(next)}
        />
        {view.trade_notify_enabled ? t('app.active') : t('app.inactive')}
      </label>
      <ReasonDialog
        open={asking !== null}
        title={asking ? t('trade.relay.notifyOnTitle') : t('trade.relay.notifyOffTitle')}
        description={asking ? t('trade.relay.notifyOnBody') : t('trade.relay.notifyOffBody')}
        label={t('trade.detail.reasonLabel')}
        action={asking ? t('trade.relay.notifyOn') : t('trade.relay.notifyOff')}
        destructive={asking === true}
        min={REASON_MIN}
        max={REASON_MAX}
        hint={t('trade.reasonHint')}
        pending={setNotify.isPending}
        onClose={() => setAsking(null)}
        onSubmit={(reason) =>
          asking !== null &&
          void setNotify
            .mutateAsync({ enabled: asking, reason })
            .then(() => {
              toast.success(asking ? t('trade.relay.notifyTurnedOn') : t('trade.relay.notifyTurnedOff'))
              setAsking(null)
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }
      />
    </SettingsCard>
  )
}

export function RelayTab() {
  const { t } = useTranslation()
  const me = useAgent()
  const superAdmin = isSuperAdmin(me)
  const view = useRelayView()
  return (
    <QueryContent query={view}>
      {(data) => (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-panel font-semibold">{t('trade.relay.title')}</h2>
            <p className="max-w-3xl text-xs text-muted-foreground">{t('trade.relay.subtitle')}</p>
          </div>
          <Status view={data} />
          <Commands view={data} />
          {superAdmin ? (
            <>
              <ConfigForm key={`config-${data.version}`} view={data} />
              <AesForm key={`aes-${data.aes.updated_at ?? 'none'}`} view={data} />
              <NotifyToggle view={data} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t('trade.relay.superAdminOnly')}</p>
          )}
        </div>
      )}
    </QueryContent>
  )
}
