import {
  CircleCheckIcon,
  Clock3Icon,
  PlugZapIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UnplugIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { LockedForm } from '@/components/locked-form'
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
import { QueryContent, SectionFrame, SettingsCard } from '@/features/settings/components/settings-ui'
import { SecretField, TextField } from '@/features/system/components/system-ui'
import { Facts } from '@/features/trade-share/components/shared'
import { staffName } from '@/features/trade-share/logic'
import { relayStateLabel } from '@/features/trade-share/relay-labels'
import { REASON_MAX, REASON_MIN } from '@/features/trade-share/types'
import { useLockedEdit } from '@/hooks/use-locked-edit'
import { useNow } from '@/hooks/use-now'
import { tradeErrorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'

import { useClearRelayAes, useRelayView, useSetRelayAes, useSetTradeNotify, useUpdateRelay } from '../hooks'
import {
  aesProblems,
  composeAddress,
  configPickup,
  connectionProblems,
  type ConnectionField,
  DEFAULT_RELAY_IDENTITY,
  instanceHealth,
  newestInstance,
  parseAddress,
} from '../logic'
import { aesModes, type AesMode, type RelayView } from '../types'
import { HealthBadge } from './relay-ui'

const maybeStamp = (value: string | null) => (value ? stamp(value) : '–')

function LiveStatus({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const now = useNow(5_000)
  const instance = newestInstance(view)
  const pickup = configPickup(view, now)
  return (
    <aside
      aria-labelledby="relay-live-title"
      className="flex min-w-0 flex-col gap-3 rounded-lg border bg-subtle p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="relay-live-title" className="text-row font-semibold">
          {t('trade.relay.liveTitle')}
        </h3>
        {instance ? <HealthBadge health={instanceHealth(instance, now)} /> : null}
      </div>
      {instance ? (
        <Facts
          rows={[
            [t('trade.relay.instance'), <span className="font-mono text-xs">{instance.instance}</span>],
            [t('trade.relay.liveState'), instance.state ? relayStateLabel(t, instance.state) : '–'],
            [t('trade.relay.lastPacket'), maybeStamp(instance.last_packet_at)],
            [t('trade.relay.reportedAt'), stamp(instance.reported_at)],
          ]}
        />
      ) : (
        <p className="flex items-center gap-2 text-row text-muted-foreground">
          <PlugZapIcon className="size-4" aria-hidden="true" />
          {t('trade.relay.noInstances')}
        </p>
      )}
      <p className="flex items-start gap-2 text-xs" role="status">
        {pickup === 'reported' ? (
          <CircleCheckIcon className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <Clock3Icon className="mt-px size-3.5 shrink-0 text-warning" aria-hidden="true" />
        )}
        <span>{t(`trade.relay.pickup.${pickup}`, { version: view.version })}</span>
      </p>
      {instance?.last_error ? (
        <p className="flex items-start gap-1.5 text-xs break-words text-destructive">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {instance.last_error}
        </p>
      ) : null}
    </aside>
  )
}

function ChangedBy({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const me = useAgent()
  return (
    <p className="text-xs text-muted-foreground">
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
    </p>
  )
}

function useReasonSpec() {
  const { t } = useTranslation()
  return {
    label: t('trade.detail.reasonLabel'),
    hint: t('trade.reasonHint'),
    min: REASON_MIN,
    max: REASON_MAX,
  }
}

function ConnectionCard({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const update = useUpdateRelay()
  const lock = useLockedEdit()
  const reason = useReasonSpec()
  const stored = parseAddress(view.iproxy_addr)
  const [host, setHost] = useState(stored.host)
  const [port, setPort] = useState(stored.port)
  const [identity, setIdentity] = useState(view.identity)
  const [heartbeat, setHeartbeat] = useState(String(view.heartbeat_seconds))
  const [touched, setTouched] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const problems = connectionProblems({ host, port, identity, heartbeat })
  const invalid = Object.keys(problems).length > 0
  const address = composeAddress({ host, port })
  const changed =
    address !== (view.iproxy_addr ?? '') ||
    (identity.trim() || DEFAULT_RELAY_IDENTITY) !== view.identity ||
    Number(heartbeat) !== view.heartbeat_seconds
  const show = (field: ConnectionField, value: string) => {
    const problem = problems[field]
    return problem && (touched || value.trim() !== '') ? t(`trade.relay.problems.${problem}`) : undefined
  }

  const disconnect = (text: string) =>
    void update
      .mutateAsync({
        input: { iproxyAddr: '', identity: view.identity, heartbeatSeconds: view.heartbeat_seconds },
        reason: text,
      })
      .then(() => {
        setDisconnecting(false)
        toast.success(t('trade.relay.disconnected'))
      })
      .catch((error: unknown) => toast.error(tradeErrorText(error)))

  return (
    <SettingsCard title={t('trade.relay.configTitle')} subtitle={t('trade.relay.configHint')}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <LockedForm
            lock={lock}
            reason={reason}
            name={t('trade.relay.configTitle')}
            className="flex min-w-0 flex-col gap-4"
            autoComplete="off"
            confirmTitle={t('trade.relay.configConfirmTitle')}
            confirmBody={t('trade.relay.configConfirmBodyAddress', { address })}
            saving={update.isPending}
            canSave={changed}
            onCheck={() => {
              setTouched(true)
              return !invalid && changed
            }}
            onReset={() => {
              setHost(stored.host)
              setPort(stored.port)
              setIdentity(view.identity)
              setHeartbeat(String(view.heartbeat_seconds))
              setTouched(false)
            }}
            onSave={(text) =>
              update
                .mutateAsync({
                  input: { iproxyAddr: address, identity, heartbeatSeconds: Number(heartbeat) },
                  reason: text ?? '',
                })
                .then(() => toast.success(t('trade.relay.configSaved')))
            }
            onError={(error) => toast.error(tradeErrorText(error))}
            actions={
              lock.editing ? null : view.iproxy_addr ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={update.isPending}
                  onClick={() => setDisconnecting(true)}
                >
                  <UnplugIcon />
                  {t('trade.relay.disconnect')}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">{t('trade.relay.notConnectedHint')}</span>
              )
            }
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t('trade.relay.addressGroup')}</legend>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <TextField
                  id="relay-host"
                  label={t('trade.relay.host')}
                  value={host}
                  placeholder="10.0.0.5"
                  spellCheck={false}
                  error={show('host', host)}
                  hint={t('trade.relay.hostHint')}
                  onChange={setHost}
                />
                <TextField
                  id="relay-port"
                  label={t('trade.relay.port')}
                  value={port}
                  placeholder="9990"
                  inputMode="numeric"
                  maxLength={5}
                  error={show('port', port)}
                  onChange={setPort}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('trade.relay.addressPreview')}{' '}
                <output htmlFor="relay-host relay-port" className="font-mono text-foreground">
                  {problems.host || problems.port ? '–' : address}
                </output>
              </p>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <TextField
                id="relay-identity"
                label={t('trade.relay.identity')}
                value={identity}
                placeholder={DEFAULT_RELAY_IDENTITY}
                spellCheck={false}
                error={show('identity', identity)}
                hint={t('trade.relay.identityHint', { identity: DEFAULT_RELAY_IDENTITY })}
                onChange={setIdentity}
              />
              <TextField
                id="relay-heartbeat"
                label={t('trade.relay.heartbeat')}
                value={heartbeat}
                inputMode="numeric"
                maxLength={2}
                error={show('heartbeat', heartbeat)}
                hint={t('trade.relay.heartbeatHint')}
                onChange={setHeartbeat}
              />
            </div>
          </LockedForm>
          <ChangedBy view={view} />
        </div>
        <LiveStatus view={view} />
      </div>
      <ReasonDialog
        open={disconnecting}
        title={t('trade.relay.disconnectTitle')}
        description={t('trade.relay.disconnectBody')}
        action={t('trade.relay.disconnect')}
        destructive
        pending={update.isPending}
        onClose={() => setDisconnecting(false)}
        onSubmit={disconnect}
        {...reason}
      />
    </SettingsCard>
  )
}

function AesCard({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const setAes = useSetRelayAes()
  const clearAes = useClearRelayAes()
  const lock = useLockedEdit()
  const reason = useReasonSpec()
  const [mode, setMode] = useState<AesMode>(view.aes.mode)
  const [key, setKey] = useState('')
  const [iv, setIv] = useState('')
  const [touched, setTouched] = useState(false)
  const [clearing, setClearing] = useState(false)
  const problems = aesProblems({ mode, key, iv })
  const aes = view.aes
  const reset = () => {
    setMode(aes.mode)
    setKey('')
    setIv('')
    setTouched(false)
  }
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
      <LockedForm
        lock={lock}
        reason={reason}
        name={t('trade.relay.aesTitle')}
        className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]"
        footerClassName="sm:col-span-3"
        autoComplete="off"
        confirmTitle={t('trade.relay.aesSaveTitle')}
        confirmBody={t('trade.relay.aesSaveBody')}
        confirmAction={t('trade.relay.aesSave')}
        saveLabel={aes.configured ? t('trade.relay.aesReplace') : t('trade.relay.aesSave')}
        saving={setAes.isPending}
        onCheck={() => {
          setTouched(true)
          return Object.keys(problems).length === 0
        }}
        onReset={reset}
        onSave={(text) =>
          setAes.mutateAsync({ input: { mode, key, iv }, reason: text ?? '' }).then(() => {
            toast.success(t('trade.relay.aesSaved'))
            reset()
          })
        }
        onError={(error) => toast.error(tradeErrorText(error))}
        actions={
          aes.configured && !lock.editing ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={clearAes.isPending}
              onClick={() => setClearing(true)}
            >
              <Trash2Icon />
              {t('trade.relay.aesClear')}
            </Button>
          ) : null
        }
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
      </LockedForm>
      <ReasonDialog
        open={clearing}
        title={t('trade.relay.aesClearTitle')}
        description={t('trade.relay.aesClearBody')}
        action={t('trade.relay.aesClear')}
        destructive
        pending={clearAes.isPending}
        onClose={() => setClearing(false)}
        onSubmit={(text) =>
          void clearAes
            .mutateAsync(text)
            .then(() => {
              toast.success(t('trade.relay.aesCleared'))
              setClearing(false)
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }
        {...reason}
      />
    </SettingsCard>
  )
}

function NotifyCard({ view }: { view: RelayView }) {
  const { t } = useTranslation()
  const setNotify = useSetTradeNotify()
  const lock = useLockedEdit()
  const reason = useReasonSpec()
  const saved = view.trade_notify_enabled
  const [enabled, setEnabled] = useState(saved)
  return (
    <SettingsCard title={t('trade.relay.notifyTitle')} subtitle={t('trade.relay.notifyHint')}>
      <p role="note" className="flex items-start gap-2 rounded-md border border-warning/40 p-3 text-row">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        {t('trade.relay.notifyDuplicate')}
      </p>
      <LockedForm
        lock={lock}
        reason={reason}
        name={t('trade.relay.notifyTitle')}
        className="flex flex-col gap-3"
        confirmTitle={enabled ? t('trade.relay.notifyOnTitle') : t('trade.relay.notifyOffTitle')}
        confirmBody={enabled ? t('trade.relay.notifyOnBody') : t('trade.relay.notifyOffBody')}
        confirmAction={enabled ? t('trade.relay.notifyOn') : t('trade.relay.notifyOff')}
        destructive={enabled}
        saving={setNotify.isPending}
        canSave={enabled !== saved}
        onReset={() => setEnabled(saved)}
        onSave={(text) =>
          setNotify
            .mutateAsync({ enabled, reason: text ?? '' })
            .then(() =>
              toast.success(enabled ? t('trade.relay.notifyTurnedOn') : t('trade.relay.notifyTurnedOff')),
            )
        }
        onError={(error) => toast.error(tradeErrorText(error))}
      >
        <label className="flex h-9 items-center gap-2 text-sm font-medium">
          <Switch checked={enabled} aria-label={t('trade.relay.notifyTitle')} onCheckedChange={setEnabled} />
          {enabled ? t('app.active') : t('app.inactive')}
        </label>
      </LockedForm>
    </SettingsCard>
  )
}

export function RelaySettingsSection() {
  const { t } = useTranslation()
  const view = useRelayView()
  return (
    <SectionFrame title={t('settings.tradeRelay')} description={t('trade.relay.settingsDescription')}>
      <QueryContent query={view}>
        {(data) => (
          <div className="flex flex-col gap-6">
            <ConnectionCard
              key={`config-${data.iproxy_addr ?? ''}-${data.identity}-${data.heartbeat_seconds}`}
              view={data}
            />
            <AesCard key={`aes-${data.aes.updated_at ?? 'none'}`} view={data} />
            <NotifyCard key={`notify-${String(data.trade_notify_enabled)}`} view={data} />
          </div>
        )}
      </QueryContent>
    </SectionFrame>
  )
}
