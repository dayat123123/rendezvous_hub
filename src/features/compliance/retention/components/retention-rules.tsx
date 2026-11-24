import { LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn, lengthValid } from '@/lib/utils'

import { useRequestChange } from '../hooks'
import { changeDirection, retentionErrorText, valueProblem } from '../logic'
import { retentionCategories, type RetentionOverview, type RetentionRule } from '../types'
import { nameKey, stamp, useRetentionText } from './retention-text'

function RequestForm({
  rule,
  delayDays,
  onClose,
}: {
  rule: RetentionRule
  delayDays: number
  onClose: () => void
}) {
  const { t, name, value, range } = useRetentionText()
  const id = useId()
  const request = useRequestChange()
  const isSwitch = rule.unit === 'switch'
  const [draft, setDraft] = useState(isSwitch ? String(1 - rule.value) : String(rule.value))
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const problem = valueProblem(draft, rule)
  const reasonValid = lengthValid(reason, 10, 500)
  const next = Number(draft)
  const direction = problem === null ? changeDirection(rule, rule.value, next) : null

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (problem !== null || !reasonValid) return
        request.mutate(
          { key: rule.key, value: next, reason },
          {
            onSuccess: () => {
              toast.success(t('retention.requested'))
              onClose()
            },
            onError: (error) => toast.error(retentionErrorText(error)),
          },
        )
      }}
    >
      <p className="text-row text-muted-foreground">
        {t('retention.requestCurrent', { value: value(rule, rule.value), range: range(rule) })}
      </p>
      {isSwitch ? (
        <p className="text-row font-medium">
          {rule.value === 1 ? t('retention.switchOff') : t('retention.switchOn')} {name(rule.key)}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-value`}>{t('retention.valueLabel')}</Label>
          <Input
            id={`${id}-value`}
            inputMode="numeric"
            className="w-40"
            value={draft}
            aria-invalid={touched && problem ? true : undefined}
            aria-describedby={`${id}-value-hint`}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p
            id={`${id}-value-hint`}
            className={cn('text-xs', touched && problem ? 'text-destructive' : 'text-muted-foreground')}
          >
            {problem ? t(`retention.problems.${problem}`) : value(rule, next)}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-reason`}>{t('retention.reasonLabel')}</Label>
        <Textarea
          id={`${id}-reason`}
          rows={3}
          maxLength={500}
          value={reason}
          aria-invalid={touched && !reasonValid ? true : undefined}
          aria-describedby={`${id}-reason-hint`}
          onChange={(event) => setReason(event.target.value)}
        />
        <p
          id={`${id}-reason-hint`}
          className={cn('text-xs', touched && !reasonValid ? 'text-destructive' : 'text-muted-foreground')}
        >
          {t('retention.reasonHint')}
        </p>
      </div>
      {direction ? (
        <p
          role="note"
          className={cn(
            'flex items-start gap-2 border-l-2 bg-subtle px-3 py-2 text-row',
            direction === 'delete_sooner' ? 'border-l-signal-warning' : 'border-l-border',
          )}
        >
          {direction === 'delete_sooner' ? (
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          ) : null}
          <span>
            {direction === 'delete_sooner'
              ? t('retention.sooner', { days: delayDays })
              : t('retention.longer')}
          </span>
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={request.isPending} onClick={onClose}>
          {t('app.cancel')}
        </Button>
        <Button type="submit" disabled={request.isPending}>
          {request.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t('retention.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}

function RequestDialog({
  rule,
  delayDays,
  onClose,
}: {
  rule: RetentionRule | null
  delayDays: number
  onClose: () => void
}) {
  const { t, name } = useRetentionText()
  return (
    <Dialog open={rule !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" closeLabel={t('app.close')}>
        {rule ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('retention.requestTitle', { name: name(rule.key) })}</DialogTitle>
              <DialogDescription>{t(`retention.hints.${nameKey(rule.key)}`)}</DialogDescription>
            </DialogHeader>
            <RequestForm key={rule.key} rule={rule} delayDays={delayDays} onClose={onClose} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PendingText({ rule }: { rule: RetentionRule }) {
  const { t, value } = useRetentionText()
  const pending = rule.pending
  if (!pending) return <span className="text-muted-foreground">–</span>
  const next = value(rule, pending.new_value)
  return (
    <span className="text-warning">
      {pending.status === 'approved' && pending.effective_at
        ? t('retention.scheduledValue', { time: stamp(pending.effective_at), value: next })
        : t('retention.pendingValue', { value: next })}
    </span>
  )
}

export function RetentionRules({ overview }: { overview: RetentionOverview }) {
  const { t, name, value, range } = useRetentionText()
  const [editing, setEditing] = useState<RetentionRule | null>(null)
  return (
    <div className="flex flex-col gap-6">
      {retentionCategories.map((category) => {
        const rules = overview.rules.filter((rule) => rule.category === category)
        if (rules.length === 0) return null
        return (
          <section key={category} className="flex flex-col gap-2" aria-labelledby={`retention-${category}`}>
            <h2 id={`retention-${category}`} className="text-panel font-semibold">
              {t(`retention.categories.${category}`)}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('retention.columns.rule')}</TableHead>
                  <TableHead>{t('retention.columns.value')}</TableHead>
                  <TableHead>{t('retention.columns.default')}</TableHead>
                  <TableHead>{t('retention.columns.range')}</TableHead>
                  <TableHead>{t('retention.columns.change')}</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.key} className="h-auto">
                    <TableCell className="max-w-md py-2 align-top">
                      <span className="block font-medium">{name(rule.key)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`retention.hints.${nameKey(rule.key)}`)}
                      </span>
                    </TableCell>
                    <TableCell className="tabular py-2 align-top font-medium whitespace-nowrap">
                      {value(rule, rule.value)}
                    </TableCell>
                    <TableCell className="tabular py-2 align-top text-xs whitespace-nowrap text-muted-foreground">
                      {value(rule, rule.default)}
                    </TableCell>
                    <TableCell className="tabular py-2 align-top text-xs whitespace-nowrap text-muted-foreground">
                      {rule.unit === 'switch' ? '–' : range(rule)}
                    </TableCell>
                    <TableCell className="py-2 align-top text-xs">
                      <PendingText rule={rule} />
                    </TableCell>
                    <TableCell className="py-2 align-top">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rule.pending !== null}
                        aria-label={`${t('retention.request')}: ${name(rule.key)}`}
                        onClick={() => setEditing(rule)}
                      >
                        {t('retention.request')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )
      })}
      <RequestDialog rule={editing} delayDays={overview.delay_days} onClose={() => setEditing(null)} />
    </div>
  )
}
