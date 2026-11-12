import {
  ArrowDownIcon,
  ArrowUpIcon,
  MessagesSquareIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Confirm } from '@/features/nasabah/components/confirm'
import { instrumentErrorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'
import { moveItem } from '@/lib/utils'

import { QueueHeader } from '../components/moderation-ui'
import { useDeleteInstrument, useInstruments, useReorderInstruments, useSaveInstrument } from './hooks'
import { instrumentDraft } from './logic'
import type { MarketInstrument } from './types'
import { InstrumentDialog } from './instrument-dialog'

function Usage({ item }: { item: MarketInstrument }) {
  const { t } = useTranslation()
  const usage = item.usage
  return (
    <span className="text-xs">
      <span className="tabular block">
        {t('moderation.instruments.usage.posts', {
          posts: formatNumber(usage.posts),
          recent: formatNumber(usage.posts_7d),
        })}
      </span>
      <span className="tabular block text-muted-foreground">
        {t('moderation.instruments.usage.watchers', { count: usage.watchers })}
      </span>
      <span className="tabular block text-muted-foreground">
        {usage.room_id
          ? t('moderation.instruments.usage.room', { count: usage.room_members })
          : t('moderation.instruments.usage.noRoom')}
      </span>
    </span>
  )
}

function InstrumentsTable({
  items,
  onOpenRoom,
}: {
  items: MarketInstrument[]
  onOpenRoom?: (code: string) => void
}) {
  const { t } = useTranslation()
  const save = useSaveInstrument()
  const reorder = useReorderInstruments()
  const remove = useDeleteInstrument()
  const [editing, setEditing] = useState<MarketInstrument | 'new' | null>(null)
  const [removing, setRemoving] = useState<MarketInstrument | null>(null)
  const [closing, setClosing] = useState<MarketInstrument | null>(null)
  const codes = items.map((item) => item.code)
  const busy = reorder.isPending || save.isPending

  const move = (index: number, step: number) =>
    reorder
      .mutateAsync(moveItem(codes, index, step))
      .catch((error: unknown) => toast.error(instrumentErrorText(error)))

  const update = (
    item: MarketInstrument,
    patch: { enabled?: boolean; room_enabled?: boolean },
    done: string,
  ) =>
    save
      .mutateAsync({ ...instrumentDraft(item), ...patch })
      .then(() => toast.success(done))
      .catch((error: unknown) => toast.error(instrumentErrorText(error)))

  return (
    <div className="flex flex-col gap-3">
      <Button size="sm" variant="outline" className="self-start" onClick={() => setEditing('new')}>
        <PlusIcon />
        {t('moderation.instruments.add')}
      </Button>
      {items.length === 0 ? (
        <p className="border-y py-6 text-center text-row text-muted-foreground">
          {t('moderation.instruments.empty')}
        </p>
      ) : (
        <Table>
          <caption className="sr-only">{t('moderation.instruments.title')}</caption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('moderation.instruments.cols.order')}</TableHead>
              <TableHead>{t('moderation.instruments.cols.index')}</TableHead>
              <TableHead>{t('moderation.instruments.cols.aliases')}</TableHead>
              <TableHead>{t('moderation.instruments.cols.enabled')}</TableHead>
              <TableHead>{t('moderation.instruments.cols.room')}</TableHead>
              <TableHead>{t('moderation.instruments.cols.usage')}</TableHead>
              <TableHead>{t('moderation.instruments.cols.updated')}</TableHead>
              <TableHead>
                <span className="sr-only">{t('moderation.instruments.cols.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.code} className="align-top">
                <TableCell className="py-2">
                  <span className="inline-flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('moderation.instruments.moveUp', { code: item.code })}
                      disabled={index === 0 || busy}
                      onClick={() => void move(index, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('moderation.instruments.moveDown', { code: item.code })}
                      disabled={index === items.length - 1 || busy}
                      onClick={() => void move(index, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                  </span>
                </TableCell>
                <TableCell className="py-2 whitespace-normal">
                  <p className="font-mono text-row font-medium">${item.code}</p>
                  <p className="text-xs">{item.name}</p>
                  {item.description ? (
                    <p className="line-clamp-2 max-w-72 text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </TableCell>
                <TableCell className="py-2 whitespace-normal">
                  {item.aliases.length > 0 ? (
                    <ul
                      className="flex max-w-56 flex-wrap gap-1"
                      aria-label={t('moderation.instruments.aliasesOf', { code: item.code })}
                    >
                      {item.aliases.map((alias) => (
                        <li key={alias} className="rounded-sm border px-1.5 py-px font-mono text-xs">
                          {alias}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <Switch
                    checked={item.enabled}
                    disabled={busy}
                    aria-label={t('moderation.instruments.enableLabel', { code: item.code })}
                    onCheckedChange={(enabled) =>
                      void update(
                        item,
                        { enabled },
                        enabled
                          ? t('moderation.instruments.turnedOn', { code: item.code })
                          : t('moderation.instruments.turnedOff', { code: item.code }),
                      )
                    }
                  />
                </TableCell>
                <TableCell className="py-2">
                  <label className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
                    <Switch
                      checked={item.room_enabled}
                      disabled={busy}
                      aria-label={t('moderation.instruments.roomLabel', { code: item.code })}
                      onCheckedChange={(open) =>
                        open
                          ? void update(
                              item,
                              { room_enabled: true },
                              t('moderation.instruments.roomOpened', { code: item.code }),
                            )
                          : setClosing(item)
                      }
                    />
                    {item.room_enabled
                      ? t('moderation.instruments.roomOpen')
                      : t('moderation.instruments.roomClosed')}
                  </label>
                </TableCell>
                <TableCell className="py-2 whitespace-normal">
                  <Usage item={item} />
                </TableCell>
                <TableCell className="py-2 text-xs whitespace-normal text-muted-foreground">
                  {item.updated_by?.name
                    ? t('moderation.instruments.changedBy', {
                        time: stamp(item.updated_at),
                        name: item.updated_by.name,
                      })
                    : t('moderation.instruments.changed', { time: stamp(item.updated_at) })}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex justify-end gap-1">
                    {onOpenRoom ? (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={t('moderation.instruments.openRoom', { code: item.code })}
                        onClick={() => onOpenRoom(item.code)}
                      >
                        <MessagesSquareIcon />
                      </Button>
                    ) : null}
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={t('moderation.instruments.editLabel', { code: item.code })}
                      onClick={() => setEditing(item)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={t('moderation.instruments.deleteLabel', { code: item.code })}
                      onClick={() => setRemoving(item)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {editing ? (
        <InstrumentDialog editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
      <Confirm
        open={closing !== null}
        title={t('moderation.instruments.closeRoomTitle', { code: closing?.code ?? '' })}
        body={t('moderation.instruments.closeRoomBody')}
        action={t('moderation.instruments.closeRoom')}
        destructive
        pending={save.isPending}
        onClose={() => setClosing(null)}
        onConfirm={() =>
          closing &&
          void update(
            closing,
            { room_enabled: false },
            t('moderation.instruments.roomClosedDone', { code: closing.code }),
          ).then(() => setClosing(null))
        }
      />
      <Confirm
        open={removing !== null}
        title={t('moderation.instruments.deleteTitle', { code: removing?.code ?? '' })}
        body={t('moderation.instruments.deleteBody', {
          code: removing?.code ?? '',
          aliases:
            removing && removing.aliases.length > 0
              ? removing.aliases.join(', ')
              : t('moderation.instruments.noAliases'),
        })}
        action={t('app.delete')}
        destructive
        pending={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove
            .mutateAsync(removing.code)
            .then(() => {
              toast.success(t('moderation.instruments.deleted', { code: removing.code }))
              setRemoving(null)
            })
            .catch((error: unknown) => toast.error(instrumentErrorText(error)))
        }
      />
    </div>
  )
}

export function InstrumentsTab({ onOpenRoom }: { onOpenRoom?: (code: string) => void }) {
  const { t } = useTranslation()
  const instruments = useInstruments()
  return (
    <section className="flex flex-col gap-4" aria-label={t('community.tabs.instruments')}>
      <QueueHeader title={t('moderation.instruments.title')} hint={t('moderation.instruments.hint')} />
      {instruments.data ? (
        <InstrumentsTable items={instruments.data} onOpenRoom={onOpenRoom} />
      ) : instruments.isError ? (
        <ErrorState error={instruments.error} onRetry={() => void instruments.refetch()} />
      ) : (
        <ListSkeleton rows={5} />
      )}
    </section>
  )
}
