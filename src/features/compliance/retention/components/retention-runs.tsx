import { CalculatorIcon, LoaderCircleIcon, PlayIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber } from '@/lib/time'

import { useRetentionPreview, useRunNow } from '../hooks'
import { retentionErrorText, totalDeleted } from '../logic'
import { purgeCategories, type PurgeCategory, type RetentionOverview, type RetentionRun } from '../types'
import { day, stamp, useRetentionText } from './retention-text'

function Preview() {
  const { t } = useRetentionText()
  const preview = useRetentionPreview()
  const data = preview.data
  return (
    <section className="flex flex-col gap-3 border-y py-4" aria-labelledby="retention-preview-title">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="retention-preview-title" className="text-panel font-semibold">
            {t('retention.runs.previewTitle')}
          </h2>
          <p className="max-w-3xl text-row text-muted-foreground">
            {t('retention.runs.previewHint', { limit: formatNumber(10000) })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={preview.isPending}
          onClick={() =>
            preview.mutate(undefined, { onError: (error) => toast.error(retentionErrorText(error)) })
          }
        >
          {preview.isPending ? <LoaderCircleIcon className="animate-spin" /> : <CalculatorIcon />}
          {t('retention.runs.preview')}
        </Button>
      </div>
      {data ? (
        <div className="flex flex-col gap-2" role="status">
          {!data.enabled ? (
            <p className="text-row text-warning">{t('retention.runs.previewStopped')}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-px overflow-hidden border-y bg-border md:grid-cols-5">
            {purgeCategories.map((category) => {
              const item = data.categories[category]
              return (
                <div key={category} className="flex min-w-0 flex-col gap-0.5 bg-background px-4 py-3">
                  <dt className="text-xs text-muted-foreground">{t(`retention.runs.purge.${category}`)}</dt>
                  <dd className="tabular text-metric font-medium">
                    {item.count === null
                      ? t('retention.runs.previewOff')
                      : `${formatNumber(item.count)}${item.more ? '+' : ''}`}
                  </dd>
                  {item.before ? (
                    <dd className="text-xs text-muted-foreground">
                      {t('retention.runs.previewBefore', { time: day(item.before) })}
                    </dd>
                  ) : null}
                </div>
              )
            })}
          </dl>
          <p className="text-xs text-muted-foreground">
            {t('retention.runs.previewAt', { time: stamp(data.computed_at) })}
          </p>
        </div>
      ) : null}
    </section>
  )
}

function listOf(t: ReturnType<typeof useRetentionText>['t'], categories: PurgeCategory[]) {
  return categories.map((category) => t(`retention.runs.purge.${category}`)).join(', ')
}

function RunNotes({ run }: { run: RetentionRun }) {
  const { t } = useRetentionText()
  const failed = Object.keys(run.errors) as PurgeCategory[]
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      {!run.enabled ? <span className="text-muted-foreground">{t('retention.runs.stopped')}</span> : null}
      {run.capped.length > 0 ? (
        <span className="text-warning">{t('retention.runs.capped', { list: listOf(t, run.capped) })}</span>
      ) : null}
      {failed.length > 0 ? (
        <span className="text-danger">{t('retention.runs.failed', { list: listOf(t, failed) })}</span>
      ) : null}
      {run.applied > 0 ? (
        <span className="text-muted-foreground">{t('retention.runs.applied', { count: run.applied })}</span>
      ) : null}
    </span>
  )
}

function Deleted({ run }: { run: RetentionRun }) {
  const { t } = useRetentionText()
  const items = purgeCategories.filter((category) => (run.deleted[category] ?? 0) > 0)
  if (items.length === 0) return <span className="text-muted-foreground">{t('retention.runs.nothing')}</span>
  return (
    <span className="flex flex-col gap-0.5">
      {items.map((category) => (
        <span key={category} className="tabular">
          {t(`retention.runs.purge.${category}`)}: {formatNumber(run.deleted[category] ?? 0)}
        </span>
      ))}
    </span>
  )
}

function RunNow() {
  const { t } = useRetentionText()
  const run = useRunNow()
  const [asking, setAsking] = useState(false)
  return (
    <>
      <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => setAsking(true)}>
        {run.isPending ? <LoaderCircleIcon className="animate-spin" /> : <PlayIcon />}
        {t('retention.runs.runNow')}
      </Button>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('retention.runs.runTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('retention.runs.runBody')}</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                run.mutate(undefined, {
                  onSuccess: (result) => {
                    if (result.skipped) toast.info(t('retention.runs.busy'))
                    else
                      toast.success(
                        t('retention.runs.ran', { count: totalDeleted({ deleted: result.deleted ?? {} }) }),
                      )
                  },
                  onError: (error) => toast.error(retentionErrorText(error)),
                })
              }
            >
              {t('retention.runs.runNow')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function RetentionRuns({ overview }: { overview: RetentionOverview }) {
  const { t } = useRetentionText()
  return (
    <div className="flex flex-col gap-4">
      <Preview />
      <section className="flex flex-col gap-3" aria-labelledby="retention-runs-title">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="retention-runs-title" className="flex-1 text-panel font-semibold">
            {t('retention.runs.title')}
          </h2>
          {overview.can_run ? <RunNow /> : null}
        </div>
        {overview.runs.length === 0 ? (
          <p className="border-y py-6 text-center text-row text-muted-foreground">
            {t('retention.runs.empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('retention.runs.columns.time')}</TableHead>
                <TableHead>{t('retention.runs.columns.source')}</TableHead>
                <TableHead>{t('retention.runs.columns.deleted')}</TableHead>
                <TableHead>{t('retention.runs.columns.files')}</TableHead>
                <TableHead>{t('retention.runs.columns.notes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.runs.map((run) => (
                <TableRow key={run.id} className="h-auto">
                  <TableCell className="tabular py-2 align-top text-xs whitespace-nowrap text-muted-foreground">
                    {stamp(run.finished_at)}
                  </TableCell>
                  <TableCell className="py-2 align-top text-xs">
                    {t(`retention.runs.sources.${run.source}`)}
                    {run.actor?.name ? (
                      <span className="block text-muted-foreground">{run.actor.name}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2 align-top text-xs">
                    <Deleted run={run} />
                  </TableCell>
                  <TableCell className="tabular py-2 align-top text-xs">
                    {formatNumber(run.files_queued)}
                  </TableCell>
                  <TableCell className="max-w-80 py-2 align-top">
                    <RunNotes run={run} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
