import { LoaderCircleIcon, PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/controls'
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

import { useAddHold, useReleaseHold } from '../hooks'
import { retentionErrorText } from '../logic'
import { holdTargets, type HoldInput, type HoldTarget, type RetentionHold } from '../types'
import { day, stamp, useRetentionText } from './retention-text'

const emptyHold: HoldInput = { targetType: 'user', target: '', reason: '', reference: '', expiresOn: '' }

function AddHoldForm({ onClose }: { onClose: () => void }) {
  const { t } = useRetentionText()
  const id = useId()
  const add = useAddHold()
  const [input, setInput] = useState<HoldInput>(emptyHold)
  const [touched, setTouched] = useState(false)
  const targetValid = input.target.trim().length > 0
  const reasonValid = lengthValid(input.reason, 10, 500)
  const set = (patch: Partial<HoldInput>) => setInput((current) => ({ ...current, ...patch }))

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (!targetValid || !reasonValid) return
        add.mutate(input, {
          onSuccess: () => {
            toast.success(t('retention.holds.added'))
            onClose()
          },
          onError: (error) => toast.error(retentionErrorText(error)),
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-type`}>{t('retention.holds.targetType')}</Label>
          <Select
            value={input.targetType}
            onValueChange={(value) => set({ targetType: value as HoldTarget })}
          >
            <SelectTrigger id={`${id}-type`} className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {holdTargets.map((target) => (
                <SelectItem key={target} value={target}>
                  {t(`retention.holds.targets.${target}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-target`}>{t('retention.holds.targetLabel')}</Label>
          <Input
            id={`${id}-target`}
            value={input.target}
            maxLength={100}
            placeholder={t(`retention.holds.targetHints.${input.targetType}`)}
            aria-invalid={touched && !targetValid ? true : undefined}
            onChange={(event) => set({ target: event.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-reason`}>{t('retention.holds.reasonLabel')}</Label>
        <Textarea
          id={`${id}-reason`}
          rows={3}
          maxLength={500}
          value={input.reason}
          aria-invalid={touched && !reasonValid ? true : undefined}
          aria-describedby={`${id}-reason-hint`}
          onChange={(event) => set({ reason: event.target.value })}
        />
        <p
          id={`${id}-reason-hint`}
          className={cn('text-xs', touched && !reasonValid ? 'text-destructive' : 'text-muted-foreground')}
        >
          {t('retention.holds.reasonHint')}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-reference`}>{t('retention.holds.referenceLabel')}</Label>
          <Input
            id={`${id}-reference`}
            value={input.reference}
            maxLength={100}
            onChange={(event) => set({ reference: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-expires`}>{t('retention.holds.expiresLabel')}</Label>
          <Input
            id={`${id}-expires`}
            type="date"
            value={input.expiresOn}
            aria-describedby={`${id}-expires-hint`}
            onChange={(event) => set({ expiresOn: event.target.value })}
          />
          <p id={`${id}-expires-hint`} className="text-xs text-muted-foreground">
            {t('retention.holds.expiresHint')}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={add.isPending} onClick={onClose}>
          {t('app.cancel')}
        </Button>
        <Button type="submit" disabled={add.isPending}>
          {add.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t('retention.holds.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}

function HoldStatus({ hold }: { hold: RetentionHold }) {
  const { t } = useRetentionText()
  if (hold.released_at) {
    return (
      <span className="text-xs text-muted-foreground">
        {t('retention.holds.releasedBy', {
          name: hold.released_by?.name ?? '–',
          time: stamp(hold.released_at),
        })}
        {hold.release_note ? <span className="block">{hold.release_note}</span> : null}
      </span>
    )
  }
  return (
    <span className={cn('text-xs font-medium', hold.active ? 'text-success' : 'text-muted-foreground')}>
      {hold.active ? t('retention.holds.active') : t('retention.holds.expired')}
    </span>
  )
}

export function RetentionHolds({ holds }: { holds: RetentionHold[] }) {
  const { t } = useRetentionText()
  const release = useReleaseHold()
  const [adding, setAdding] = useState(false)
  const [releasing, setReleasing] = useState<RetentionHold | null>(null)
  const label = (hold: RetentionHold) => hold.target_label ?? t('retention.holds.unknownTarget')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <p className="max-w-3xl flex-1 text-row text-muted-foreground">{t('retention.holds.intro')}</p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <PlusIcon />
          {t('retention.holds.add')}
        </Button>
      </div>
      {holds.length === 0 ? (
        <p className="border-y py-6 text-center text-row text-muted-foreground">
          {t('retention.holds.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('retention.holds.columns.target')}</TableHead>
              <TableHead>{t('retention.holds.columns.reason')}</TableHead>
              <TableHead>{t('retention.holds.columns.by')}</TableHead>
              <TableHead>{t('retention.holds.columns.until')}</TableHead>
              <TableHead>{t('retention.holds.columns.status')}</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holds.map((hold) => (
              <TableRow key={hold.id} className="h-auto">
                <TableCell className="max-w-64 py-2 align-top text-xs">
                  <span className="block text-muted-foreground">
                    {t(`retention.holds.targets.${hold.target_type}`)}
                  </span>
                  <span className="block truncate font-medium" title={hold.target_id}>
                    {label(hold)}
                  </span>
                </TableCell>
                <TableCell className="max-w-72 py-2 align-top text-xs">
                  {hold.reason}
                  {hold.reference ? (
                    <span className="block text-muted-foreground">{hold.reference}</span>
                  ) : null}
                </TableCell>
                <TableCell className="py-2 align-top text-xs whitespace-nowrap text-muted-foreground">
                  {t('retention.holds.createdBy', {
                    name: hold.created_by?.name ?? '–',
                    time: stamp(hold.created_at),
                  })}
                </TableCell>
                <TableCell className="tabular py-2 align-top text-xs whitespace-nowrap">
                  {hold.expires_at ? day(hold.expires_at) : t('retention.holds.noExpiry')}
                </TableCell>
                <TableCell className="max-w-56 py-2 align-top">
                  <HoldStatus hold={hold} />
                </TableCell>
                <TableCell className="py-2 align-top">
                  {hold.released_at ? null : hold.can_release ? (
                    <Button size="sm" variant="outline" onClick={() => setReleasing(hold)}>
                      {t('retention.holds.release')}
                    </Button>
                  ) : (
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {t('retention.holds.byOther')}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-xl" closeLabel={t('app.close')}>
          <DialogHeader>
            <DialogTitle>{t('retention.holds.addTitle')}</DialogTitle>
            <DialogDescription>{t('retention.holds.intro')}</DialogDescription>
          </DialogHeader>
          {adding ? <AddHoldForm onClose={() => setAdding(false)} /> : null}
        </DialogContent>
      </Dialog>
      <ReasonDialog
        open={releasing !== null}
        title={t('retention.holds.releaseTitle', { target: releasing ? label(releasing) : '' })}
        description={t('retention.holds.releaseDescription')}
        label={t('retention.holds.releaseLabel')}
        hint={t('retention.changes.noteHint')}
        action={t('retention.holds.release')}
        destructive
        pending={release.isPending}
        onClose={() => setReleasing(null)}
        onSubmit={(note) => {
          if (!releasing) return
          release.mutate(
            { id: releasing.id, note },
            {
              onSuccess: () => {
                toast.success(t('retention.holds.released'))
                setReleasing(null)
              },
              onError: (error) => toast.error(retentionErrorText(error)),
            },
          )
        }}
      />
    </div>
  )
}
