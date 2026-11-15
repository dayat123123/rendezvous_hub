import { LoaderCircleIcon, TriangleAlertIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/controls'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAgent } from '@/features/auth/hooks'
import { formatNumber, stamp } from '@/lib/time'

import { useTraderList } from '../hooks'
import { approvalStep, profileLabel } from '../logic'
import { traderStatuses, type TradeSharer, type TraderStatus } from '../types'
import { useStaffName } from '../use-staff-name'
import { ProfileCell, TraderStatusBadge } from './shared'

type Mode = 'applications' | 'traders'

const ALL = 'all'

function TraderRow({ sharer, mode, onOpen }: { sharer: TradeSharer; mode: Mode; onOpen: () => void }) {
  const { t } = useTranslation()
  const me = useAgent()
  const staff = useStaffName()
  const step = approvalStep(sharer, me.id)
  return (
    <TableRow>
      <TableCell className="max-w-64">
        <ProfileCell profile={sharer.profile} />
      </TableCell>
      <TableCell>
        <span className="flex flex-col items-start gap-1">
          <TraderStatusBadge status={sharer.status} />
          {sharer.status === 'pending' && step !== 'first' ? (
            <span className="text-xs text-warning">
              {step === 'own_proposal'
                ? t('trade.share.proposedByYou')
                : t('trade.share.proposedBadge', {
                    name: staff({ id: sharer.proposed_by, name: sharer.proposed_by_name }),
                  })}
            </span>
          ) : null}
          {sharer.status === 'paused' && sharer.pause_source ? (
            <span className="text-xs text-muted-foreground">
              {t(`trade.share.pauseSource.${sharer.pause_source}`)}
            </span>
          ) : null}
        </span>
      </TableCell>
      <TableCell className="tabular text-xs whitespace-nowrap text-muted-foreground">
        {stamp(mode === 'applications' || !sharer.decided_at ? sharer.applied_at : sharer.decided_at)}
      </TableCell>
      <TableCell className="text-xs">
        <span className="tabular">{t('trade.share.accountsCount', { count: sharer.accounts })}</span>
        {sharer.warnings > 0 ? (
          <span className="mt-0.5 flex items-center gap-1 text-warning">
            <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
            {t('trade.share.warningsCount', { count: sharer.warnings })}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="tabular text-xs">
        {t('trade.share.subscribersCount', {
          active: formatNumber(sharer.subscribers.active),
          pending: formatNumber(sharer.subscribers.pending),
        })}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="xs"
          variant={sharer.status === 'pending' ? 'default' : 'outline'}
          aria-label={t('trade.share.openTrader', { name: profileLabel(sharer.profile) })}
          onClick={onOpen}
        >
          {sharer.status === 'pending' ? t('trade.share.review') : t('trade.share.open')}
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function TradersTab({ mode, onOpen }: { mode: Mode; onOpen: (profile: string) => void }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<TraderStatus | typeof ALL>(ALL)
  const status: TraderStatus | null = mode === 'applications' ? 'pending' : filter === ALL ? null : filter
  const list = useTraderList(status)
  const rows = list.data?.pages.flat() ?? []
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-3xl text-xs text-muted-foreground">
          {mode === 'applications' ? t('trade.share.applicationsHint') : t('trade.share.tradersHint')}
        </p>
        {mode === 'traders' ? (
          <div className="flex w-56 flex-col gap-1.5">
            <Label htmlFor="trade-status-filter">{t('trade.share.statusFilter')}</Label>
            <Select value={filter} onValueChange={(value) => setFilter(value as TraderStatus | typeof ALL)}>
              <SelectTrigger id="trade-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('trade.share.allStatuses')}</SelectItem>
                {traderStatuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`trade.share.statuses.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      {list.data ? (
        rows.length === 0 ? (
          <EmptyState
            className="border-y"
            title={
              mode === 'applications' ? t('trade.share.emptyApplications') : t('trade.share.emptyTraders')
            }
          >
            <UsersIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          </EmptyState>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('trade.share.columns.trader')}</TableHead>
                  <TableHead>{t('trade.share.columns.status')}</TableHead>
                  <TableHead>
                    {mode === 'applications'
                      ? t('trade.share.columns.applied')
                      : t('trade.share.columns.changed')}
                  </TableHead>
                  <TableHead>{t('trade.share.columns.accounts')}</TableHead>
                  <TableHead>{t('trade.share.columns.subscribers')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t('trade.share.columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((sharer) => (
                  <TraderRow
                    key={sharer.profile.id}
                    sharer={sharer}
                    mode={mode}
                    onOpen={() => onOpen(sharer.profile.id)}
                  />
                ))}
              </TableBody>
            </Table>
            {list.hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                className="self-center"
                disabled={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                {list.isFetchingNextPage ? <LoaderCircleIcon className="animate-spin" /> : null}
                {t('trade.share.loadMore')}
              </Button>
            ) : null}
          </>
        )
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <ListSkeleton rows={4} className="border-t" />
      )}
    </div>
  )
}
