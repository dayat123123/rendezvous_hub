import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Confirm } from '@/features/nasabah/components/confirm'
import { QueryContent, SectionFrame, SettingsCard } from '@/features/settings/components/settings-ui'
import { feedFilterErrorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'
import { moveItem } from '@/lib/utils'

import { useDeleteFeedFilter, useFeedFilters, useReorderFeedFilters, useSaveFeedFilter } from '../hooks'
import { feedFilterDraft } from '../logic'
import type { FeedFilter } from '../types'
import { FeedFilterDialog } from './feed-filter-dialog'

function Preview({ filters }: { filters: FeedFilter[] }) {
  const { t } = useTranslation()
  const shown = filters.filter((filter) => filter.enabled)
  return (
    <figure className="flex flex-col gap-1.5" aria-label={t('platform.feedFilters.previewTitle')}>
      <figcaption className="text-xs text-muted-foreground">
        {t('platform.feedFilters.previewTitle')}
      </figcaption>
      {shown.length === 0 ? (
        <p className="text-row text-warning">{t('platform.feedFilters.previewEmpty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((filter, index) => (
            <li
              key={filter.key}
              className={
                index === 0
                  ? 'rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background'
                  : 'rounded-full border px-3 py-1 text-xs text-muted-foreground'
              }
            >
              {filter.label_id}
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

function FeedFiltersCard({ filters }: { filters: FeedFilter[] }) {
  const { t } = useTranslation()
  const save = useSaveFeedFilter()
  const reorder = useReorderFeedFilters()
  const remove = useDeleteFeedFilter()
  const [editing, setEditing] = useState<FeedFilter | 'new' | null>(null)
  const [removing, setRemoving] = useState<FeedFilter | null>(null)
  const keys = filters.map((filter) => filter.key)
  const busy = reorder.isPending || save.isPending

  const move = (index: number, step: number) =>
    reorder
      .mutateAsync(moveItem(keys, index, step))
      .catch((error: unknown) => toast.error(feedFilterErrorText(error)))

  const toggle = (filter: FeedFilter, enabled: boolean) =>
    save
      .mutateAsync({ ...feedFilterDraft(filter), enabled })
      .then(() =>
        toast.success(
          enabled
            ? t('platform.feedFilters.turnedOn', { name: filter.label_id })
            : t('platform.feedFilters.turnedOff', { name: filter.label_id }),
        ),
      )
      .catch((error: unknown) => toast.error(feedFilterErrorText(error)))

  return (
    <SettingsCard title={t('platform.feedFilters.title')} subtitle={t('platform.feedFilters.subtitle')}>
      <Button size="sm" variant="outline" className="self-start" onClick={() => setEditing('new')}>
        <PlusIcon />
        {t('platform.feedFilters.add')}
      </Button>
      <Preview filters={filters} />
      {filters.length === 0 ? (
        <p className="border-y py-6 text-center text-row text-muted-foreground">
          {t('platform.feedFilters.empty')}
        </p>
      ) : (
        <Table>
          <caption className="sr-only">{t('platform.feedFilters.title')}</caption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('platform.feedFilters.cols.order')}</TableHead>
              <TableHead>{t('platform.feedFilters.cols.tab')}</TableHead>
              <TableHead>{t('platform.feedFilters.cols.rule')}</TableHead>
              <TableHead>{t('platform.feedFilters.cols.icon')}</TableHead>
              <TableHead>{t('platform.feedFilters.cols.enabled')}</TableHead>
              <TableHead>{t('platform.feedFilters.cols.updated')}</TableHead>
              <TableHead>
                <span className="sr-only">{t('platform.feedFilters.cols.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filters.map((filter, index) => (
              <TableRow key={filter.key} className="align-top">
                <TableCell className="py-2">
                  <span className="inline-flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('platform.feedFilters.moveUp', { name: filter.label_id })}
                      disabled={index === 0 || busy}
                      onClick={() => void move(index, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('platform.feedFilters.moveDown', { name: filter.label_id })}
                      disabled={index === filters.length - 1 || busy}
                      onClick={() => void move(index, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                  </span>
                </TableCell>
                <TableCell className="py-2 whitespace-normal">
                  <p className="text-row font-medium">{filter.label_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('platform.feedFilters.english', { label: filter.label_en })}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{filter.key}</p>
                </TableCell>
                <TableCell className="py-2 text-xs whitespace-normal">
                  <span className="block">{t(`platform.feedFilters.sorts.${filter.sort}`)}</span>
                  <span className="block text-muted-foreground">
                    {t(`platform.feedFilters.contents.${filter.content ?? 'all'}`)}
                  </span>
                </TableCell>
                <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                  {filter.icon ?? '–'}
                </TableCell>
                <TableCell className="py-2">
                  <Switch
                    checked={filter.enabled}
                    disabled={busy}
                    aria-label={t('platform.feedFilters.enableLabel', { name: filter.label_id })}
                    onCheckedChange={(enabled) => void toggle(filter, enabled)}
                  />
                </TableCell>
                <TableCell className="py-2 text-xs whitespace-normal text-muted-foreground">
                  {filter.updated_at
                    ? filter.updated_by?.name
                      ? t('platform.versions.changedBy', {
                          time: stamp(filter.updated_at),
                          name: filter.updated_by.name,
                        })
                      : t('platform.versions.changed', { time: stamp(filter.updated_at) })
                    : '–'}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={t('platform.feedFilters.editLabel', { name: filter.label_id })}
                      onClick={() => setEditing(filter)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={t('platform.feedFilters.deleteLabel', { name: filter.label_id })}
                      onClick={() => setRemoving(filter)}
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
        <FeedFilterDialog
          editing={editing === 'new' ? null : editing}
          keys={keys}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <Confirm
        open={removing !== null}
        title={t('platform.feedFilters.deleteTitle', { name: removing?.label_id ?? '' })}
        body={t('platform.feedFilters.deleteBody')}
        action={t('app.delete')}
        destructive
        pending={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove
            .mutateAsync(removing.key)
            .then(() => {
              toast.success(t('platform.feedFilters.deleted', { name: removing.label_id }))
              setRemoving(null)
            })
            .catch((error: unknown) => toast.error(feedFilterErrorText(error)))
        }
      />
    </SettingsCard>
  )
}

export function FeedFiltersSection() {
  const { t } = useTranslation()
  const filters = useFeedFilters()
  return (
    <SectionFrame
      title={t('platform.feedFilters.pageTitle')}
      description={t('platform.feedFilters.pageDescription')}
    >
      <QueryContent query={filters}>{(data) => <FeedFiltersCard filters={data} />}</QueryContent>
    </SectionFrame>
  )
}
