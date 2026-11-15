import { Link } from '@tanstack/react-router'
import {
  CircleCheckIcon,
  Clock3Icon,
  PlugZapIcon,
  RotateCcwIcon,
  SettingsIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import { useAgent } from '@/features/auth/hooks'
import { isSuperAdmin } from '@/features/presence/types'
import { QueryContent, SettingsCard } from '@/features/settings/components/settings-ui'
import { Facts } from '@/features/trade-share/components/shared'
import { relayCounterLabel, relayMetricLabel, relayStateLabel } from '@/features/trade-share/relay-labels'
import { REASON_MAX, REASON_MIN } from '@/features/trade-share/types'
import { useNow } from '@/hooks/use-now'
import { tradeErrorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'

import { useRelayCommand, useRelayView } from '../hooks'
import {
  commandProgress,
  cooldownSeconds,
  counterEntries,
  instanceCommandState,
  instanceHealth,
} from '../logic'
import { relayCommands, type RelayCommand, type RelayInstance, type RelayView } from '../types'
import { HealthBadge } from './relay-ui'

const maybeStamp = (value: string | null) => (value ? stamp(value) : '–')

function InstanceCard({ instance, view, now }: { instance: RelayInstance; view: RelayView; now: Date }) {
  const { t } = useTranslation()
  const health = instanceHealth(instance, now)
  const counters = counterEntries(instance.counters)
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-row font-medium">{instance.instance}</span>
        <HealthBadge health={health} />
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
            <section
              aria-labelledby="relay-settings-link"
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
            >
              <SettingsIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p id="relay-settings-link" className="min-w-0 flex-1 text-row">
                {t('trade.relay.settingsMoved')}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings" search={{ section: 'tradeRelay' }}>
                  {t('trade.relay.openSettings')}
                </Link>
              </Button>
            </section>
          ) : (
            <p className="text-xs text-muted-foreground">{t('trade.relay.superAdminOnly')}</p>
          )}
        </div>
      )}
    </QueryContent>
  )
}
