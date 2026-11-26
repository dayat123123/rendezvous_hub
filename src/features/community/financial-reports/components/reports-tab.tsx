import { LoaderCircleIcon, SearchIcon, TriangleAlertIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ErrorState, ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { useAgent } from '@/features/auth/hooks'
import { useDebounced } from '@/hooks/use-now'
import { formatNumber } from '@/lib/time'
import { cn } from '@/lib/utils'

import { useFinreportConfig, useFinreportFiles } from '../hooks'
import { entityFilter, hasActiveFiles } from '../logic'
import { FINREPORT_MAX_BYTES, fileStatuses, type FileStatus, type FinreportConfig } from '../types'
import { FilesTable } from './files-table'
import { PostingSettings } from './posting-settings'
import { ReportSheet } from './report-sheet'
import { useReportText } from './report-text'
import { UploadPanel } from './upload-panel'

const ALL = 'all'

function AccountNotice({ config }: { config: FinreportConfig }) {
  const { t } = useReportText()
  const account = config.official_account
  if (account && config.official_active) return null
  return (
    <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-row text-warning">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      {account
        ? t('moderation.finreport.notice.inactive', { name: `@${account.username}` })
        : t('moderation.finreport.notice.noAccount')}
    </p>
  )
}

export function ReportsTab({ onOpenPost }: { onOpenPost?: (postId: string) => void }) {
  const { t } = useReportText()
  const agent = useAgent()
  const canPost = agent.community_permissions.includes('community.post')
  const [status, setStatus] = useState<FileStatus | null>(null)
  const [entityText, setEntityText] = useState('')
  const entity = entityFilter(useDebounced(entityText, 300))
  const filter = useMemo(() => ({ status, entity }), [status, entity])
  const files = useFinreportFiles(filter)
  const config = useFinreportConfig()
  const [selected, setSelected] = useState<string | null>(null)
  const items = useMemo(() => files.data?.pages.flatMap((page) => page.items) ?? [], [files.data])
  const counts = files.data?.pages[0]?.counts ?? {}
  const filtered = status !== null || entity !== null

  return (
    <section className="flex flex-col gap-4" aria-label={t('moderation.finreport.title')}>
      <header className="min-w-0">
        <h2 className="text-panel font-semibold">{t('moderation.finreport.title')}</h2>
        <p className="max-w-3xl text-row text-muted-foreground">{t('moderation.finreport.subtitle')}</p>
      </header>
      {config.data ? <AccountNotice config={config.data} /> : null}
      {canPost ? (
        <UploadPanel maxBytes={config.data?.max_file_bytes ?? FINREPORT_MAX_BYTES} />
      ) : (
        <p className="text-xs text-muted-foreground">{t('moderation.finreport.upload.readOnly')}</p>
      )}
      <section aria-labelledby="finreport-files-title" className="flex flex-col gap-3">
        <h3 id="finreport-files-title" className="text-sm font-medium">
          {t('moderation.finreport.list.title')}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={status ?? ALL}
            onValueChange={(value) =>
              setStatus(fileStatuses.includes(value as FileStatus) ? (value as FileStatus) : null)
            }
            aria-label={t('moderation.finreport.filters.status')}
          >
            <ToggleGroupItem value={ALL}>{t('moderation.finreport.filters.all')}</ToggleGroupItem>
            {fileStatuses.map((item) => (
              <ToggleGroupItem key={item} value={item}>
                {t('moderation.finreport.filters.count', {
                  label: t(`moderation.finreport.statuses.${item}`),
                  value: formatNumber(counts[item] ?? 0),
                })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="relative ml-auto w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              value={entityText}
              maxLength={13}
              onChange={(event) => setEntityText(event.target.value)}
              placeholder={t('moderation.finreport.filters.entityPlaceholder')}
              aria-label={t('moderation.finreport.filters.entity')}
              className="h-8 pl-8 uppercase placeholder:normal-case"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('moderation.finreport.filters.countsHint')}
          {hasActiveFiles(items) ? ` ${t('moderation.finreport.list.live')}` : ''}
        </p>
        {files.data ? (
          <div
            className={cn('flex flex-col gap-3 transition-opacity', files.isPlaceholderData && 'opacity-60')}
            aria-busy={files.isFetching}
          >
            {items.length > 0 ? (
              <FilesTable files={items} canPost={canPost} onOpen={setSelected} />
            ) : (
              <p className="border-y py-6 text-center text-row text-muted-foreground">
                {filtered
                  ? t('moderation.finreport.list.emptyFiltered')
                  : t('moderation.finreport.list.empty')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="tabular text-xs text-muted-foreground" role="status">
                {t('moderation.finreport.list.shown', { count: items.length })}
              </span>
              {files.hasNextPage ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={files.isFetchingNextPage}
                  onClick={() => void files.fetchNextPage()}
                >
                  {files.isFetchingNextPage ? <LoaderCircleIcon className="animate-spin" /> : null}
                  {t('moderation.finreport.list.loadMore')}
                </Button>
              ) : items.length > 0 ? (
                <span className="text-xs text-muted-foreground">{t('moderation.finreport.list.end')}</span>
              ) : null}
            </div>
          </div>
        ) : files.isError ? (
          <ErrorState error={files.error} onRetry={() => void files.refetch()} />
        ) : (
          <ListSkeleton rows={5} />
        )}
      </section>
      <PostingSettings />
      <ReportSheet
        id={selected}
        onClose={() => setSelected(null)}
        onOpen={setSelected}
        onOpenPost={onOpenPost}
      />
    </section>
  )
}
