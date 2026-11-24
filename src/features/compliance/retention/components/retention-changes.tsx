import { useState } from 'react'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { useCancelChange, useDecideChange } from '../hooks'
import { retentionErrorText, sortChanges } from '../logic'
import type { ChangeStatus, RetentionChange, RetentionOverview, RetentionRule } from '../types'
import { stamp, useRetentionText } from './retention-text'

type Action = { kind: 'approve' | 'reject' | 'cancel'; change: RetentionChange }

const statusTone: Record<ChangeStatus, string> = {
  pending: 'text-warning',
  approved: 'text-warning',
  applied: 'text-success',
  rejected: 'text-danger',
  withdrawn: 'text-muted-foreground',
  expired: 'text-muted-foreground',
  superseded: 'text-muted-foreground',
}

function ChangeActions({
  change,
  onAction,
}: {
  change: RetentionChange
  onAction: (action: Action) => void
}) {
  const { t } = useRetentionText()
  return (
    <div className="flex flex-wrap gap-1.5">
      {change.can_decide ? (
        <>
          <Button size="sm" onClick={() => onAction({ kind: 'approve', change })}>
            {t('retention.changes.approve')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction({ kind: 'reject', change })}>
            {t('retention.changes.reject')}
          </Button>
        </>
      ) : null}
      {change.can_cancel ? (
        <Button size="sm" variant="ghost" onClick={() => onAction({ kind: 'cancel', change })}>
          {t('retention.changes.cancel')}
        </Button>
      ) : null}
    </div>
  )
}

function People({ change }: { change: RetentionChange }) {
  const { t } = useRetentionText()
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span>{t('retention.changes.requestedBy', { name: change.requested_by?.name ?? '–' })}</span>
      {change.decided_by ? (
        <span className="text-muted-foreground">
          {t('retention.changes.decidedBy', { name: change.decided_by.name ?? '–' })}
          {change.decision_note ? ` · ${change.decision_note}` : ''}
        </span>
      ) : null}
      {change.cancelled_by ? (
        <span className="text-muted-foreground">
          {t('retention.changes.cancelledBy', { name: change.cancelled_by.name ?? '–' })}
        </span>
      ) : null}
      {change.cancel_note && !change.cancelled_by ? (
        <span className="text-muted-foreground">{change.cancel_note}</span>
      ) : null}
    </span>
  )
}

function StatusCell({ change }: { change: RetentionChange }) {
  const { t } = useRetentionText()
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className={cn('font-medium', statusTone[change.status])}>
        {t(`retention.changes.statuses.${change.status}`)}
      </span>
      {change.status === 'approved' && change.effective_at ? (
        <span className="text-muted-foreground">
          {t('retention.changes.effective', { time: stamp(change.effective_at) })}
        </span>
      ) : null}
      {change.status === 'pending' && change.expires_at ? (
        <span className="text-muted-foreground">
          {t('retention.changes.expires', { time: stamp(change.expires_at) })}
        </span>
      ) : null}
      {change.status === 'pending' && change.mine ? (
        <span className="text-muted-foreground">{t('retention.changes.mine')}</span>
      ) : null}
    </span>
  )
}

export function RetentionChanges({ overview }: { overview: RetentionOverview }) {
  const { t, name, value } = useRetentionText()
  const decide = useDecideChange()
  const cancel = useCancelChange()
  const [action, setAction] = useState<Action | null>(null)
  const rules = new Map<string, RetentionRule>(overview.rules.map((rule) => [rule.key, rule]))
  const shown = (change: RetentionChange, amount: number) => {
    const rule = rules.get(change.key)
    return rule ? value(rule, amount) : String(amount)
  }
  const changes = sortChanges(overview.changes)
  const close = () => setAction(null)
  const title = action ? name(action.change.key) : ''

  if (changes.length === 0) {
    return (
      <p className="border-y py-6 text-center text-row text-muted-foreground">
        {t('retention.changes.empty')}
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('retention.changes.columns.time')}</TableHead>
            <TableHead>{t('retention.changes.columns.rule')}</TableHead>
            <TableHead>{t('retention.changes.columns.change')}</TableHead>
            <TableHead>{t('retention.changes.columns.reason')}</TableHead>
            <TableHead>{t('retention.changes.columns.people')}</TableHead>
            <TableHead>{t('retention.changes.columns.status')}</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes.map((change) => (
            <TableRow key={change.id} className="h-auto">
              <TableCell className="tabular py-2 align-top text-xs whitespace-nowrap text-muted-foreground">
                {stamp(change.requested_at)}
              </TableCell>
              <TableCell className="py-2 align-top font-medium">{name(change.key)}</TableCell>
              <TableCell className="py-2 align-top text-xs">
                <span className="tabular block whitespace-nowrap">
                  {shown(change, change.old_value)} →{' '}
                  <span className="font-medium">{shown(change, change.new_value)}</span>
                </span>
                <span
                  className={cn(
                    'block',
                    change.direction === 'delete_sooner' ? 'text-warning' : 'text-muted-foreground',
                  )}
                >
                  {t(`retention.changes.direction.${change.direction}`)}
                </span>
              </TableCell>
              <TableCell className="max-w-72 py-2 align-top text-xs">{change.reason}</TableCell>
              <TableCell className="max-w-56 py-2 align-top">
                <People change={change} />
              </TableCell>
              <TableCell className="py-2 align-top">
                <StatusCell change={change} />
              </TableCell>
              <TableCell className="py-2 align-top">
                <ChangeActions change={change} onAction={setAction} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ReasonDialog
        open={action?.kind === 'approve'}
        title={t('retention.changes.approveTitle', { name: title })}
        description={
          action
            ? action.change.direction === 'delete_sooner'
              ? t('retention.changes.approveSooner', {
                  from: shown(action.change, action.change.old_value),
                  to: shown(action.change, action.change.new_value),
                  days: overview.delay_days,
                })
              : t('retention.changes.approveLonger', {
                  from: shown(action.change, action.change.old_value),
                  to: shown(action.change, action.change.new_value),
                })
            : undefined
        }
        label={t('retention.changes.approveNoteLabel')}
        hint={t('retention.changes.approveNoteHint')}
        action={t('retention.changes.approve')}
        optional
        min={1}
        pending={decide.isPending}
        onClose={close}
        onSubmit={(note) => {
          if (!action) return
          decide.mutate(
            { id: action.change.id, approve: true, note },
            {
              onSuccess: (saved) => {
                toast.success(
                  saved.status === 'applied'
                    ? t('retention.changes.appliedNow')
                    : t('retention.changes.approved', {
                        time: saved.effective_at ? stamp(saved.effective_at) : '–',
                      }),
                )
                close()
              },
              onError: (error) => toast.error(retentionErrorText(error)),
            },
          )
        }}
      />
      <ReasonDialog
        open={action?.kind === 'reject'}
        title={t('retention.changes.rejectTitle', { name: title })}
        label={t('retention.changes.rejectLabel')}
        hint={t('retention.changes.noteHint')}
        action={t('retention.changes.reject')}
        destructive
        pending={decide.isPending}
        onClose={close}
        onSubmit={(note) => {
          if (!action) return
          decide.mutate(
            { id: action.change.id, approve: false, note },
            {
              onSuccess: () => {
                toast.success(t('retention.changes.rejected'))
                close()
              },
              onError: (error) => toast.error(retentionErrorText(error)),
            },
          )
        }}
      />
      <ReasonDialog
        open={action?.kind === 'cancel'}
        title={t('retention.changes.cancelTitle', { name: title })}
        label={t('retention.changes.cancelLabel')}
        hint={t('retention.changes.noteHint')}
        action={t('retention.changes.cancel')}
        pending={cancel.isPending}
        onClose={close}
        onSubmit={(note) => {
          if (!action) return
          cancel.mutate(
            { id: action.change.id, note },
            {
              onSuccess: () => {
                toast.success(t('retention.changes.cancelled'))
                close()
              },
              onError: (error) => toast.error(retentionErrorText(error)),
            },
          )
        }}
      />
    </>
  )
}
