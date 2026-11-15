import { LoaderCircleIcon, PlusIcon, SearchIcon, UserPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAgent } from '@/features/auth/hooks'
import { Confirm } from '@/features/nasabah/components/confirm'
import { canManageTradeShare } from '@/features/presence/types'
import { QueryContent } from '@/features/settings/components/settings-ui'
import { TextField } from '@/features/system/components/system-ui'
import { useDebounced } from '@/hooks/use-now'
import { tradeErrorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'

import {
  useExcludeAccount,
  useExcludedAccounts,
  useExcludedStocks,
  useExcludeStock,
  usePilotInvites,
  useProfileSearch,
  useSetPilotInvite,
  useUnexcludeAccount,
  useUnexcludeStock,
} from '../hooks'
import {
  custIdValid,
  normalizeCustId,
  normalizeStock,
  parseUntil,
  profileLabel,
  profileQuery,
  profileQueryValid,
  reasonValid,
  stockValid,
} from '../logic'
import { PROFILE_QUERY_MAX, REASON_MAX, REASON_MIN, type PilotInvite, type ProfileMatch } from '../types'
import { useStaffName } from '../use-staff-name'
import { Panel, ProfileCell, TraderStatusBadge } from './shared'

function RemoveDialog({
  open,
  title,
  pending,
  onSubmit,
  onClose,
}: {
  open: boolean
  title: string
  pending: boolean
  onSubmit: (reason: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <ReasonDialog
      open={open}
      title={title}
      label={t('trade.detail.reasonLabel')}
      action={t('trade.lists.remove')}
      destructive
      min={REASON_MIN}
      max={REASON_MAX}
      hint={t('trade.reasonHint')}
      pending={pending}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  )
}

function ExcludedAccounts({ manage }: { manage: boolean }) {
  const staff = useStaffName()
  const { t } = useTranslation()
  const accounts = useExcludedAccounts()
  const exclude = useExcludeAccount()
  const unexclude = useUnexcludeAccount()
  const [custId, setCustId] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const custProblem = touched && !custIdValid(custId)
  const reasonProblem = touched && !reasonValid(reason)
  return (
    <Panel
      titleId="trade-excluded-accounts"
      title={t('trade.lists.accountsTitle')}
      description={t('trade.lists.accountsHint')}
    >
      {manage ? (
        <form
          className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-start"
          onSubmit={(event) => {
            event.preventDefault()
            setTouched(true)
            if (!custIdValid(custId) || !reasonValid(reason)) return
            void exclude
              .mutateAsync({ custId: normalizeCustId(custId), reason })
              .then(() => {
                toast.success(t('trade.lists.accountAdded', { cust: normalizeCustId(custId) }))
                setCustId('')
                setReason('')
                setTouched(false)
              })
              .catch((error: unknown) => toast.error(tradeErrorText(error)))
          }}
        >
          <TextField
            id="trade-exclude-cust"
            label={t('trade.lists.custId')}
            value={custId}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            error={custProblem ? t('trade.lists.custIdInvalid') : undefined}
            onChange={setCustId}
          />
          <TextField
            id="trade-exclude-cust-reason"
            label={t('trade.detail.reasonLabel')}
            value={reason}
            maxLength={REASON_MAX}
            error={reasonProblem ? t('trade.reasonHint') : undefined}
            onChange={setReason}
          />
          <Button type="submit" className="sm:mt-6" disabled={exclude.isPending}>
            {exclude.isPending ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
            {t('trade.lists.exclude')}
          </Button>
        </form>
      ) : null}
      <QueryContent query={accounts}>
        {(items) =>
          items.length === 0 ? (
            <p className="border-y py-4 text-center text-row text-muted-foreground">
              {t('trade.lists.noAccounts')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('trade.lists.custId')}</TableHead>
                  <TableHead>{t('trade.detail.reasonLabel')}</TableHead>
                  <TableHead>{t('trade.lists.added')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t('trade.share.columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.cust_id}>
                    <TableCell className="font-mono">{item.cust_id}</TableCell>
                    <TableCell className="max-w-96 text-xs break-words">{item.reason}</TableCell>
                    <TableCell className="tabular text-xs text-muted-foreground">
                      {t('trade.lists.addedBy', {
                        time: stamp(item.created_at),
                        name: staff({ id: item.created_by, name: item.created_by_name }),
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {manage ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={t('trade.lists.removeNamed', { name: item.cust_id })}
                          onClick={() => setRemoving(item.cust_id)}
                        >
                          {t('trade.lists.remove')}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        }
      </QueryContent>
      <RemoveDialog
        open={removing !== null}
        title={t('trade.lists.removeAccountTitle', { cust: removing ?? '' })}
        pending={unexclude.isPending}
        onClose={() => setRemoving(null)}
        onSubmit={(value) =>
          removing &&
          void unexclude
            .mutateAsync({ custId: removing, reason: value })
            .then(() => {
              toast.success(t('trade.lists.accountRemoved', { cust: removing }))
              setRemoving(null)
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }
      />
    </Panel>
  )
}

function ExcludedStocks({ manage }: { manage: boolean }) {
  const staff = useStaffName()
  const { t } = useTranslation()
  const stocks = useExcludedStocks()
  const exclude = useExcludeStock()
  const unexclude = useUnexcludeStock()
  const [stock, setStock] = useState('')
  const [reason, setReason] = useState('')
  const [until, setUntil] = useState('')
  const [touched, setTouched] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const parsedUntil = parseUntil(until)
  const untilProblem = parsedUntil.invalid
  const untilIso = parsedUntil.iso
  return (
    <Panel
      titleId="trade-excluded-stocks"
      title={t('trade.lists.stocksTitle')}
      description={t('trade.lists.stocksHint')}
    >
      {manage ? (
        <form
          className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_14rem_auto] sm:items-start"
          onSubmit={(event) => {
            event.preventDefault()
            setTouched(true)
            if (!stockValid(stock) || !reasonValid(reason) || untilProblem) return
            const code = normalizeStock(stock)
            void exclude
              .mutateAsync({ stock: code, reason, until: untilIso })
              .then(() => {
                toast.success(t('trade.lists.stockAdded', { stock: code }))
                setStock('')
                setReason('')
                setUntil('')
                setTouched(false)
              })
              .catch((error: unknown) => toast.error(tradeErrorText(error)))
          }}
        >
          <TextField
            id="trade-exclude-stock"
            label={t('trade.lists.stock')}
            value={stock}
            maxLength={13}
            autoComplete="off"
            spellCheck={false}
            error={touched && !stockValid(stock) ? t('trade.lists.stockInvalid') : undefined}
            onChange={setStock}
          />
          <TextField
            id="trade-exclude-stock-reason"
            label={t('trade.detail.reasonLabel')}
            value={reason}
            maxLength={REASON_MAX}
            error={touched && !reasonValid(reason) ? t('trade.reasonHint') : undefined}
            onChange={setReason}
          />
          <TextField
            id="trade-exclude-stock-until"
            type="datetime-local"
            label={t('trade.lists.until')}
            value={until}
            error={untilProblem ? t('trade.detail.untilInvalid') : undefined}
            hint={t('trade.lists.untilHint')}
            onChange={setUntil}
          />
          <Button type="submit" className="sm:mt-6" disabled={exclude.isPending}>
            {exclude.isPending ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
            {t('trade.lists.exclude')}
          </Button>
        </form>
      ) : null}
      <QueryContent query={stocks}>
        {(items) =>
          items.length === 0 ? (
            <p className="border-y py-4 text-center text-row text-muted-foreground">
              {t('trade.lists.noStocks')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('trade.lists.stock')}</TableHead>
                  <TableHead>{t('trade.detail.reasonLabel')}</TableHead>
                  <TableHead>{t('trade.lists.until')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t('trade.share.columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.stock}>
                    <TableCell className="font-mono">
                      ${item.stock}
                      {item.active ? null : (
                        <span className="ml-2 font-sans text-xs text-muted-foreground">
                          {t('trade.lists.expired')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-96 text-xs break-words">{item.reason}</TableCell>
                    <TableCell className="tabular text-xs text-muted-foreground">
                      {item.until ? stamp(item.until) : t('trade.lists.noEnd')}
                      <span className="block">
                        {t('trade.lists.createdBy', {
                          name: staff({ id: item.created_by, name: item.created_by_name }),
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {manage ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={t('trade.lists.removeNamed', { name: item.stock })}
                          onClick={() => setRemoving(item.stock)}
                        >
                          {t('trade.lists.remove')}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        }
      </QueryContent>
      <RemoveDialog
        open={removing !== null}
        title={t('trade.lists.removeStockTitle', { stock: removing ?? '' })}
        pending={unexclude.isPending}
        onClose={() => setRemoving(null)}
        onSubmit={(value) =>
          removing &&
          void unexclude
            .mutateAsync({ stock: removing, reason: value })
            .then(() => {
              toast.success(t('trade.lists.stockRemoved', { stock: removing }))
              setRemoving(null)
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }
      />
    </Panel>
  )
}

function MatchRow({
  match,
  pending,
  onInvite,
}: {
  match: ProfileMatch
  pending: boolean
  onInvite: (profile: string) => void
}) {
  const { t } = useTranslation()
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-1.5">
      <ProfileCell className="min-w-48 flex-1" profile={match.profile} />
      <span className="text-xs text-muted-foreground">
        {t('trade.lists.linkedAccounts', { count: match.linked_accounts })}
      </span>
      {match.trader_status ? <TraderStatusBadge status={match.trader_status} /> : null}
      {match.pilot_invited ? (
        <span className="text-xs text-success">{t('trade.lists.alreadyInvited')}</span>
      ) : (
        <Button
          size="xs"
          variant="outline"
          disabled={pending}
          aria-label={t('trade.lists.inviteNamed', { name: profileLabel(match.profile) })}
          onClick={() => onInvite(match.profile.id)}
        >
          <UserPlusIcon />
          {t('trade.lists.invite')}
        </Button>
      )}
    </li>
  )
}

function InviteForm({ onInvite, pending }: { onInvite: (profile: string) => void; pending: boolean }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const search = profileQuery(useDebounced(query, 300))
  const valid = profileQueryValid(search)
  const matches = useProfileSearch(search)
  const results = matches.data ?? []
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          maxLength={PROFILE_QUERY_MAX + 1}
          className="pl-8"
          aria-label={t('trade.lists.inviteSearch')}
          placeholder={t('trade.lists.invitePlaceholder')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('trade.lists.inviteHint')}</p>
      {!valid ? null : matches.isError ? (
        <p role="alert" className="text-row text-destructive">
          {tradeErrorText(matches.error)}
        </p>
      ) : matches.data && results.length === 0 ? (
        <p className="text-row text-muted-foreground">{t('trade.lists.noUsers')}</p>
      ) : (
        <ul className="border-t">
          {results.map((match) => (
            <MatchRow key={match.profile.id} match={match} pending={pending} onInvite={onInvite} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PilotInvites({ manage }: { manage: boolean }) {
  const staff = useStaffName()
  const { t } = useTranslation()
  const invites = usePilotInvites()
  const setInvite = useSetPilotInvite()
  const [removing, setRemoving] = useState<PilotInvite | null>(null)
  const invite = (profile: string) =>
    void setInvite
      .mutateAsync({ profile, invited: true })
      .then(() => toast.success(t('trade.lists.invited')))
      .catch((error: unknown) => toast.error(tradeErrorText(error)))
  return (
    <Panel
      titleId="trade-pilot-invites"
      title={t('trade.lists.pilotTitle')}
      description={t('trade.lists.pilotHint')}
    >
      {manage ? <InviteForm pending={setInvite.isPending} onInvite={invite} /> : null}
      <QueryContent query={invites}>
        {(items) =>
          items.length === 0 ? (
            <p className="border-y py-4 text-center text-row text-muted-foreground">
              {t('trade.lists.noInvites')}
            </p>
          ) : (
            <ul className="border-t">
              {items.map((item, index) => (
                <li key={item.profile?.id ?? index} className="flex items-center gap-3 border-b py-2">
                  <ProfileCell profile={item.profile} className="flex-1" />
                  <span className="tabular text-xs text-muted-foreground">
                    {t('trade.lists.invitedBy', {
                      time: stamp(item.created_at),
                      name: staff({ id: item.created_by, name: item.created_by_name }),
                    })}
                  </span>
                  {manage && item.profile ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={t('trade.lists.removeNamed', { name: profileLabel(item.profile) })}
                      onClick={() => setRemoving(item)}
                    >
                      {t('trade.lists.uninvite')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        }
      </QueryContent>
      <Confirm
        open={removing !== null}
        title={t('trade.lists.uninviteTitle', { name: profileLabel(removing?.profile ?? null) })}
        body={t('trade.lists.uninviteBody')}
        action={t('trade.lists.uninvite')}
        destructive
        pending={setInvite.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing?.profile &&
          void setInvite
            .mutateAsync({ profile: removing.profile.id, invited: false })
            .then(() => {
              toast.success(t('trade.lists.uninvited'))
              setRemoving(null)
            })
            .catch((error: unknown) => toast.error(tradeErrorText(error)))
        }
      />
    </Panel>
  )
}

export function ListsTab() {
  const me = useAgent()
  const manage = canManageTradeShare(me)
  return (
    <div className="flex flex-col gap-8">
      <ExcludedAccounts manage={manage} />
      <ExcludedStocks manage={manage} />
      <PilotInvites manage={manage} />
    </div>
  )
}
