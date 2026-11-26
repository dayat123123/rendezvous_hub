import { CircleAlertIcon, CircleCheckIcon, FileArchiveIcon, LoaderCircleIcon, UploadIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAgent } from '@/features/auth/hooks'
import { formatBytes } from '@/lib/time'
import { cn, uuid } from '@/lib/utils'

import { useUploadReport } from '../hooks'
import { researchErrorText, uploadProblem } from '../logic'
import type { UploadItem } from '../types'
import { useReportText } from './report-text'

function StateIcon({ item }: { item: UploadItem }) {
  if (item.state === 'done') return <CircleCheckIcon className="size-4 shrink-0 text-success" aria-hidden />
  if (item.state === 'failed')
    return <CircleAlertIcon className="size-4 shrink-0 text-destructive" aria-hidden />
  if (item.state === 'uploading')
    return <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
  return <FileArchiveIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
}

export function UploadPanel({ maxBytes }: { maxBytes: number }) {
  const { t } = useReportText()
  const agent = useAgent()
  const upload = useUploadReport()
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const busy = items.some((item) => item.state === 'waiting' || item.state === 'uploading')
  const limit = formatBytes(maxBytes)

  const patch = (id: string, change: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)))

  const problemText = (file: File) => {
    const problem = uploadProblem(file, maxBytes)
    return problem ? t(`moderation.research.upload.problems.${problem}`, { size: limit }) : null
  }

  const start = async (files: File[]) => {
    const batch = files.map((file) => {
      const error = problemText(file)
      const item: UploadItem = {
        id: uuid(),
        name: file.name,
        size: file.size,
        state: error ? 'failed' : 'waiting',
        error,
        file: null,
      }
      return { file, item }
    })
    setItems((current) => [...batch.map(({ item }) => item), ...current])
    let accepted = 0
    for (const { file, item } of batch) {
      if (item.state === 'failed') continue
      patch(item.id, { state: 'uploading' })
      try {
        const view = await upload.mutateAsync({ file, agentId: agent.id })
        patch(item.id, { state: 'done', file: view })
        accepted += 1
      } catch (error) {
        patch(item.id, { state: 'failed', error: researchErrorText(error) })
      }
    }
    if (accepted > 0) toast.success(t('moderation.research.upload.uploaded', { count: accepted }))
  }

  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (files.length > 0) void start(files)
  }

  return (
    <section aria-labelledby="research-upload-title" className="flex flex-col gap-2">
      <h3 id="research-upload-title" className="text-sm font-medium">
        {t('moderation.research.upload.title')}
      </h3>
      <div
        className={cn(
          'flex flex-col items-start gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors sm:flex-row sm:items-center',
          dragging ? 'border-primary bg-primary/5' : 'bg-subtle',
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          pick(event.dataTransfer.files)
        }}
      >
        <UploadIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 text-row text-muted-foreground">
          {dragging
            ? t('moderation.research.upload.drop')
            : t('moderation.research.upload.hint', { size: limit })}
        </p>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
          {t('moderation.research.upload.choose')}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          accept=".zip,application/zip"
          className="hidden"
          aria-label={t('moderation.research.upload.input')}
          onChange={(event) => {
            const files = event.target.files
            pick(files)
            event.target.value = ''
          }}
        />
      </div>
      {items.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('moderation.research.upload.results')}
            </span>
            <Button size="xs" variant="ghost" disabled={busy} onClick={() => setItems([])}>
              {t('moderation.research.upload.clear')}
            </Button>
          </div>
          <ul
            className="flex flex-col border-y"
            aria-live="polite"
            aria-label={t('moderation.research.upload.results')}
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 border-b px-1 py-2 text-row last:border-b-0"
              >
                <StateIcon item={item} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.name}</span>
                  {item.error ? <span className="block text-xs text-destructive">{item.error}</span> : null}
                </span>
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  {formatBytes(item.size)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t(`moderation.research.upload.states.${item.state}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
