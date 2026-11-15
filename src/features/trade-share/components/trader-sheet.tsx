import {
  CircleCheckIcon,
  CircleXIcon,
  LoaderCircleIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent } from '@/components/ui/overlay'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAgent } from '@/features/auth/hooks'
import { canReviewTradeShare } from '@/features/presence/types'
import { tradeErrorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'

import { useSubscribers, useTraderChange, useTraderDetail } from '../hooks'
import {
  accountAgeDays,
  accountWarnings,
  approvalStep,
  decisionOutcome,
  parseUntil,
  profileLabel,
  traderActions,
} from '../logic'
import {
  eligibilityCodes,
  REASON_MAX,
  REASON_MIN,
  subscriptionStatuses,
  traderStatuses,
  type EligibilityCode,
  type SubscriptionStatus,
  type TradeShareEvent,
  type TradeSharerDetail,
  type TraderAction,
  type TraderStatus,
} from '../types'
import { useStaffName } from '../use-staff-name'
import { Facts, Panel, ProfileCell, TraderStatusBadge } from './shared'

const knownEvents = [
  'account_state',
  'applied',
  'approval_proposed',
  'approved',
  'auto_paused',
  'auto_resumed',
  'delay_raised',
  'paused',
  'reinstated',
  'rejected',
  'resumed',
  'revoked',
  'settings_changed',
  'suspended',
  'suspension_ended',
  'withdrawn',
] as const

const endReasons = [
  'cancelled',
  'unfollowed',
  'blocked',
  'removed_by_trader',
  'trader_stopped',
  'deleted',
] as const

function Header({ detail }: { detail: TradeSharerDetail }) {
  const { t } = useTranslation()
  const age = accountAgeDays(detail.profile.created_at)
  return (
    <div className="flex flex-col gap-2 border-b px-5 pt-4 pr-12 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <ProfileCell profile={detail.profile} />
        <TraderStatusBadge status={detail.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        {age === null ? null : t('trade.detail.accountAge', { count: age })}
        {' · '}
        {t('trade.detail.followers', { value: formatNumber(detail.profile.follower_count ?? 0) })}
      </p>
    </div>
  )
}

function ProposalNotice({ detail }: { detail: TradeSharerDetail }) {
  const { t } = useTranslation()
  const me = useAgent()
  const staff = useStaffName()
  if (detail.status !== 'pending' || !detail.proposed_by) return null
  const own = approvalStep(detail, me.id) === 'own_proposal'
  const time = detail.proposed_at ? stamp(detail.proposed_at) : '–'
  const name = staff({ id: detail.proposed_by, name: detail.proposed_by_name })
  return (
    <p role="status" className="flex items-start gap-2 rounded-md border border-warning/40 p-3 text-row">
      <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <span>
        {own ? t('trade.detail.waitingSecond', { time }) : t('trade.detail.secondApproval', { time, name })}
      </span>
    </p>
  )
}

function DecisionFacts({ detail }: { detail: TradeSharerDetail }) {
  const { t } = useTranslation()
  const staff = useStaffName()
  const rows: [string, React.ReactNode][] = [
    [t('trade.detail.showPrice'), detail.show_price ? t('trade.detail.shown') : t('trade.detail.hidden')],
    [t('trade.detail.showLot'), detail.show_lot ? t('trade.detail.shown') : t('trade.detail.hidden')],
    [t('trade.detail.delay'), t('trade.share.delayMinutes', { count: detail.delay_minutes })],
    [t('trade.detail.mode'), t(`trade.detail.modes.${detail.subscribe_mode}`)],
    [t('trade.detail.applied'), stamp(detail.applied_at)],
  ]
  if (detail.decided_at) rows.push([t('trade.detail.decided'), stamp(detail.decided_at)])
  if (detail.decided_by) {
    rows.push([t('trade.detail.decidedBy'), staff({ id: detail.decided_by, name: detail.decided_by_name })])
  }
  if (detail.decision_reason) rows.push([t('trade.detail.reason'), detail.decision_reason])
  if (detail.status === 'suspended') {
    rows.push([
      t('trade.detail.suspendedUntil'),
      detail.suspended_until ? stamp(detail.suspended_until) : t('trade.detail.untilLifted'),
    ])
  }
  if (detail.cooldown_until) rows.push([t('trade.detail.cooldownUntil'), stamp(detail.cooldown_until)])
  return (
    <Panel title={t('trade.detail.settingsTitle')}>
      <Facts rows={rows} />
    </Panel>
  )
}

function Accounts({ detail }: { detail: TradeSharerDetail }) {
  const { t } = useTranslation()
  return (
    <Panel title={t('trade.detail.accountsTitle')} description={t('trade.detail.accountsHint')}>
      {detail.account_review.length === 0 ? (
        <p className="text-row text-muted-foreground">{t('trade.detail.noAccounts')}</p>
      ) : (
        <ul className="flex flex-col border-t">
          {detail.account_review.map((account) => {
            const warnings = accountWarnings(account)
            return (
              <li key={account.cust_id} className="flex flex-col gap-1 border-b py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-row">{account.cust_id}</span>
                  {warnings.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <CircleCheckIcon className="size-3.5" aria-hidden="true" />
                      {t('trade.detail.accountOk')}
                    </span>
                  ) : null}
                </div>
                {warnings.map((warning) => (
                  <p key={warning} className="flex items-start gap-1.5 text-xs text-warning">
                    <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                    {warning === 'other_profiles'
                      ? t('trade.detail.warnings.other_profiles', { count: account.other_profiles })
                      : t(`trade.detail.warnings.${warning}`)}
                    {warning === 'excluded' && account.excluded_reason
                      ? ` (${account.excluded_reason})`
                      : null}
                  </p>
                ))}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function Eligibility({ detail }: { detail: TradeSharerDetail }) {
  const { t } = useTranslation()
  return (
    <Panel
      title={t('trade.detail.eligibilityTitle')}
      description={detail.eligibility.eligible ? t('trade.detail.eligible') : t('trade.detail.notEligible')}
    >
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {detail.eligibility.checks.map((check) => (
          <li key={check.code} className="flex items-start gap-1.5 text-row">
            {check.ok ? (
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <CircleXIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <span>
              {(eligibilityCodes as readonly string[]).includes(check.code)
                ? t(`trade.detail.checks.${check.code as EligibilityCode}`)
                : check.code}
              <span className="sr-only">
                : {check.ok ? t('trade.detail.checkOk') : t('trade.detail.checkFailed')}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Sanctions({ detail }: { detail: TradeSharerDetail }) {
  const { t } = useTranslation()
  return (
    <Panel title={t('trade.detail.sanctionsTitle')}>
      <Facts
        rows={[
          [
            t('trade.detail.sanctionActive'),
            detail.sanctions.active ? (
              <span className="text-destructive">{t('trade.detail.yes')}</span>
            ) : (
              t('trade.detail.no')
            ),
          ],
          [t('trade.detail.sanctionYear'), formatNumber(detail.sanctions.last_365_days)],
        ]}
      />
    </Panel>
  )
}

const ALL = 'all'

function Subscribers({ detail }: { detail: TradeSharerDetail }) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)
  const [status, setStatus] = useState<SubscriptionStatus | typeof ALL>('active')
  const list = useSubscribers(detail.profile.id, status === ALL ? null : status, shown)
  const rows = list.data?.pages.flat() ?? []
  return (
    <Panel
      title={t('trade.detail.subscribersTitle')}
      description={t('trade.detail.subscribersHint', {
        active: formatNumber(detail.subscribers.active),
        pending: formatNumber(detail.subscribers.pending),
      })}
      action={
        shown ? (
          <div className="w-44">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as SubscriptionStatus | typeof ALL)}
            >
              <SelectTrigger aria-label={t('trade.detail.subscriberStatus')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('trade.share.allStatuses')}</SelectItem>
                {subscriptionStatuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`trade.detail.subscriptionStatuses.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Button size="xs" variant="outline" onClick={() => setShown(true)}>
            <UsersIcon />
            {t('trade.detail.showSubscribers')}
          </Button>
        )
      }
    >
      {!shown ? null : list.data ? (
        rows.length === 0 ? (
          <p className="text-row text-muted-foreground">{t('trade.detail.noSubscribers')}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('trade.detail.subscriber')}</TableHead>
                  <TableHead>{t('trade.share.columns.status')}</TableHead>
                  <TableHead>{t('trade.detail.requested')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.subscriber.id}>
                    <TableCell className="max-w-56">
                      <ProfileCell profile={row.subscriber} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {t(`trade.detail.subscriptionStatuses.${row.status}`)}
                      {row.muted ? ` · ${t('trade.detail.muted')}` : ''}
                      {row.end_reason && (endReasons as readonly string[]).includes(row.end_reason) ? (
                        <span className="block text-muted-foreground">
                          {t(`trade.detail.endReasons.${row.end_reason as (typeof endReasons)[number]}`)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular text-xs text-muted-foreground">
                      {stamp(row.requested_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {list.hasNextPage ? (
              <Button
                size="xs"
                variant="outline"
                className="self-start"
                disabled={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                {t('trade.share.loadMore')}
              </Button>
            ) : null}
          </>
        )
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <ListSkeleton rows={2} />
      )}
    </Panel>
  )
}

function useActor() {
  const { t } = useTranslation()
  const staff = useStaffName()
  return (event: TradeShareEvent) =>
    event.actor_kind === 'staff'
      ? staff({ id: event.actor_id, name: event.actor_name })
      : t(`trade.detail.actors.${event.actor_kind}`)
}

function Events({ events }: { events: TradeShareEvent[] }) {
  const { t } = useTranslation()
  const actor = useActor()
  const status = (value: string) =>
    (traderStatuses as readonly string[]).includes(value)
      ? t(`trade.share.statuses.${value as TraderStatus}`)
      : value
  return (
    <Panel title={t('trade.detail.eventsTitle')}>
      {events.length === 0 ? (
        <p className="text-row text-muted-foreground">{t('trade.detail.noEvents')}</p>
      ) : (
        <ol className="flex flex-col border-t">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-0.5 border-b py-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-row font-medium">
                  {(knownEvents as readonly string[]).includes(event.action)
                    ? t(`trade.detail.events.${event.action as (typeof knownEvents)[number]}`)
                    : event.action}
                </span>
                <span className="text-xs text-muted-foreground">{actor(event)}</span>
                <span className="tabular ml-auto text-xs text-muted-foreground">
                  {stamp(event.created_at)}
                </span>
              </div>
              {event.from_status && event.to_status && event.from_status !== event.to_status ? (
                <span className="text-xs text-muted-foreground">
                  {t('trade.detail.transition', {
                    from: status(event.from_status),
                    to: status(event.to_status),
                  })}
                </span>
              ) : null}
              {event.reason ? <span className="text-xs break-words">{event.reason}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function SuspendUntil({
  value,
  error,
  onChange,
}: {
  value: string
  error: boolean
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="trade-suspend-until">{t('trade.detail.untilLabel')}</Label>
      <Input
        id="trade-suspend-until"
        type="datetime-local"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby="trade-suspend-until-hint"
        onChange={(event) => onChange(event.target.value)}
      />
      <p
        id="trade-suspend-until-hint"
        className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
      >
        {error ? t('trade.detail.untilInvalid') : t('trade.detail.untilHint')}
      </p>
    </div>
  )
}

function Actions({ detail }: { detail: TradeSharerDetail }) {
  const { t } = useTranslation()
  const me = useAgent()
  const change = useTraderChange(detail.profile.id)
  const [open, setOpen] = useState<TraderAction | null>(null)
  const [until, setUntil] = useState('')
  const [untilError, setUntilError] = useState(false)
  const actions = traderActions(detail, { review: canReviewTradeShare(me) }, me.id)
  const step = approvalStep(detail, me.id)
  const name = profileLabel(detail.profile)

  const close = () => {
    setOpen(null)
    setUntil('')
    setUntilError(false)
  }

  const run = (input: Parameters<typeof change.mutateAsync>[0], done: (result: TradeSharerDetail) => void) =>
    void change
      .mutateAsync(input)
      .then((result) => {
        close()
        done(result)
      })
      .catch((error: unknown) => toast.error(tradeErrorText(error)))

  const submit = (reason: string) => {
    switch (open) {
      case 'approve':
        return run({ action: 'decide', decision: 'approve', reason }, (result) => {
          if (decisionOutcome(result) === 'proposed') toast.info(t('trade.detail.toast.proposed', { name }))
          else toast.success(t('trade.detail.toast.approved', { name }))
        })
      case 'reject':
        return run({ action: 'decide', decision: 'reject', reason }, () =>
          toast.success(t('trade.detail.toast.rejected', { name })),
        )
      case 'suspend': {
        const parsed = parseUntil(until)
        if (parsed.invalid) {
          setUntilError(true)
          return
        }
        return run({ action: 'suspend', reason, until: parsed.iso }, () =>
          toast.success(t('trade.detail.toast.suspended', { name })),
        )
      }
      case 'reinstate':
        return run({ action: 'reinstate', reason }, () =>
          toast.success(t('trade.detail.toast.reinstated', { name })),
        )
      case 'revoke':
        return run({ action: 'revoke', reason }, () =>
          toast.success(t('trade.detail.toast.revoked', { name })),
        )
      default:
        return undefined
    }
  }

  if (actions.length === 0 && step !== 'own_proposal') return null
  const approveLabel =
    step === 'second' ? t('trade.detail.actions.approveSecond') : t('trade.detail.actions.approve')
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {detail.status === 'pending' && step === 'own_proposal' ? (
          <Button size="sm" disabled>
            {t('trade.detail.actions.waitingSecond')}
          </Button>
        ) : null}
        {actions.map((action) => (
          <Button
            key={action}
            size="sm"
            variant={action === 'approve' ? 'default' : 'outline'}
            className={action === 'revoke' || action === 'reject' ? 'text-destructive' : undefined}
            onClick={() => setOpen(action)}
          >
            {action === 'approve' ? approveLabel : t(`trade.detail.actions.${action}`)}
          </Button>
        ))}
      </div>
      {open ? (
        <ReasonDialog
          open
          title={t(`trade.detail.dialogs.${open}.title`, { name })}
          description={
            open === 'approve' && step === 'second'
              ? t('trade.detail.dialogs.approve.secondBody')
              : t(`trade.detail.dialogs.${open}.body`)
          }
          label={open === 'approve' ? t('trade.detail.noteOptional') : t('trade.detail.reasonLabel')}
          action={open === 'approve' ? approveLabel : t(`trade.detail.actions.${open}`)}
          destructive={open === 'reject' || open === 'revoke' || open === 'suspend'}
          optional={open === 'approve'}
          min={REASON_MIN}
          max={REASON_MAX}
          hint={open === 'approve' ? t('trade.reasonOptionalHint') : t('trade.reasonHint')}
          pending={change.isPending}
          onSubmit={submit}
          onClose={close}
        >
          {open === 'suspend' ? (
            <SuspendUntil
              value={until}
              error={untilError}
              onChange={(value) => {
                setUntil(value)
                setUntilError(false)
              }}
            />
          ) : null}
        </ReasonDialog>
      ) : null}
    </div>
  )
}

export function TraderSheet({ profile, onClose }: { profile: string | null; onClose: () => void }) {
  const { t } = useTranslation()
  const detail = useTraderDetail(profile)
  return (
    <Sheet open={profile !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        title={detail.data ? profileLabel(detail.data.profile) : t('trade.detail.title')}
        closeLabel={t('app.close')}
        className="w-[min(720px,96vw)] bg-background"
      >
        {detail.data ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <Header detail={detail.data} />
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
              <ProposalNotice detail={detail.data} />
              <Actions detail={detail.data} />
              <DecisionFacts detail={detail.data} />
              <Accounts detail={detail.data} />
              <Eligibility detail={detail.data} />
              <Sanctions detail={detail.data} />
              <Subscribers key={detail.data.profile.id} detail={detail.data} />
              <Events events={detail.data.events} />
            </div>
          </div>
        ) : detail.isError ? (
          <ErrorState className="mt-10" error={detail.error} onRetry={() => void detail.refetch()} />
        ) : (
          <div className="flex items-center gap-2 p-6 text-row text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
            {t('app.loading')}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
