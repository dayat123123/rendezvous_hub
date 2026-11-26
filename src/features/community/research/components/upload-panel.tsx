import {
  CircleAlertIcon,
  CircleCheckIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LoaderCircleIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAgent } from '@/features/auth/hooks'
import { formatBytes } from '@/lib/time'
import { cn, uuid } from '@/lib/utils'

import { useUploadReport } from '../hooks'
import { DOCUMENT_ACCEPT, documentExt, researchErrorText } from '../logic'
import {
  guessTarget,
  planStaged,
  stagedKind,
  targetOf,
  zipsOf,
  type Staged,
  type StagedProblem,
} from '../staging'
import { RESEARCH_DOCUMENT_MAX_BYTES, RESEARCH_MAX_DOCUMENTS, type UploadItem } from '../types'
import { useReportText } from './report-text'

function StateIcon({ item }: { item: UploadItem }) {
  if (item.state === 'done') return <CircleCheckIcon className="size-4 shrink-0 text-success" aria-hidden />
  if (item.state === 'failed')
    return <CircleAlertIcon className="size-4 shrink-0 text-destructive" aria-hidden />
  if (item.state === 'uploading')
    return <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
  return <FileArchiveIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
}

function KindIcon({ item }: { item: Staged }) {
  const className = 'size-4 shrink-0 text-muted-foreground'
  if (item.kind === 'zip') return <FileArchiveIcon className={className} aria-hidden />
  if (item.kind === 'other') return <FileIcon className={className} aria-hidden />
  return documentExt(item.file.name) === 'xlsx' ? (
    <FileSpreadsheetIcon className={className} aria-hidden />
  ) : (
    <FileTextIcon className={className} aria-hidden />
  )
}

export function UploadPanel({ maxBytes }: { maxBytes: number }) {
  const { t } = useReportText()
  const agent = useAgent()
  const upload = useUploadReport()
  const input = useRef<HTMLInputElement>(null)
  const [staged, setStaged] = useState<Staged[]>([])
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const limit = formatBytes(maxBytes)
  const plan = planStaged(staged, maxBytes)
  const zips = plan.zips
  const reports = plan.batches.length

  const problemText = (problem: StagedProblem) => {
    switch (problem.code) {
      case 'zip':
        return t(`moderation.research.upload.problems.${problem.problem}`, { size: limit })
      case 'document':
        return t(`moderation.research.documents.problems.${problem.problem}`, {
          size: formatBytes(RESEARCH_DOCUMENT_MAX_BYTES),
        })
      case 'tooManyDocuments':
        return t('moderation.research.upload.tooManyDocuments', { max: problem.max })
      default:
        return t(`moderation.research.upload.problems.${problem.code}`)
    }
  }

  const add = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (files.length === 0) return
    setStaged((current) => {
      const fresh: Staged[] = files.map((file) => ({
        id: uuid(),
        file,
        kind: stagedKind(file.name),
        target: null,
        error: null,
      }))
      const all = [...current, ...fresh]
      const allZips = zipsOf(all)
      return all.map((item) =>
        item.kind === 'document' && item.target === null
          ? { ...item, target: guessTarget(item.file.name, allZips) }
          : item,
      )
    })
  }

  const remove = (id: string) => setStaged((current) => current.filter((item) => item.id !== id))

  const retarget = (id: string, target: string) =>
    setStaged((current) => current.map((item) => (item.id === id ? { ...item, target } : item)))

  const patch = (id: string, change: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)))

  const submit = async () => {
    if (!plan.ready || busy) return
    setBusy(true)
    setStaged((current) => current.map((item) => ({ ...item, error: null })))
    const batches = plan.batches
    const fresh: UploadItem[] = batches.map(({ zip }) => ({
      id: zip.id,
      name: zip.file.name,
      size: zip.file.size,
      state: 'waiting',
      error: null,
      file: null,
      documents: 0,
    }))
    setItems((current) => [...fresh, ...current.filter((item) => !fresh.some((f) => f.id === item.id))])
    let accepted = 0
    for (const { zip, documents } of batches) {
      patch(zip.id, { state: 'uploading' })
      try {
        const view = await upload.mutateAsync({
          file: zip.file,
          agentId: agent.id,
          documents: documents.map((document) => document.file),
        })
        patch(zip.id, { state: 'done', file: view, documents: documents.length })
        const sent = new Set([zip.id, ...documents.map((document) => document.id)])
        setStaged((current) => current.filter((item) => !sent.has(item.id)))
        accepted += 1
      } catch (error) {
        const message = researchErrorText(error)
        patch(zip.id, { state: 'failed', error: message })
        setStaged((current) =>
          current.map((item) => (item.id === zip.id ? { ...item, error: message } : item)),
        )
      }
    }
    setBusy(false)
    if (accepted > 0) toast.success(t('moderation.research.upload.uploaded', { count: accepted }))
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
          add(event.dataTransfer.files)
        }}
      >
        <UploadIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 text-row text-muted-foreground">
          {dragging
            ? t('moderation.research.upload.drop')
            : t('moderation.research.upload.hint', {
                size: limit,
                documentSize: formatBytes(RESEARCH_DOCUMENT_MAX_BYTES),
                max: RESEARCH_MAX_DOCUMENTS,
              })}
        </p>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          <UploadIcon />
          {t('moderation.research.upload.choose')}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          accept={`.zip,application/zip,${DOCUMENT_ACCEPT}`}
          className="hidden"
          aria-label={t('moderation.research.upload.input')}
          onChange={(event) => {
            add(event.target.files)
            event.target.value = ''
          }}
        />
      </div>
      {staged.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t('moderation.research.upload.staged')}
          </span>
          <ul className="flex flex-col border-y" aria-label={t('moderation.research.upload.staged')}>
            {staged.map((item) => {
              const problem = plan.problems.get(item.id)
              const target = item.kind === 'document' ? targetOf(item, zips) : null
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-1 py-2 text-row last:border-b-0',
                    item.kind === 'document' && 'pl-6',
                  )}
                >
                  <KindIcon item={item} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.file.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[
                        t(`moderation.research.upload.kinds.${item.kind}`),
                        formatBytes(item.file.size),
                        item.kind === 'document' && target && zips.length > 1
                          ? t('moderation.research.upload.attachedTo', {
                              name: zips.find((zip) => zip.id === target)?.file.name ?? '',
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {problem ? (
                      <span className="block text-xs text-destructive">{problemText(problem)}</span>
                    ) : null}
                    {item.error ? <span className="block text-xs text-destructive">{item.error}</span> : null}
                  </span>
                  {item.kind === 'document' && zips.length > 1 ? (
                    <select
                      aria-label={t('moderation.research.upload.attachTo', { name: item.file.name })}
                      className="h-8 max-w-56 rounded-md border bg-background px-2 text-xs"
                      value={target ?? ''}
                      disabled={busy}
                      onChange={(event) => retarget(item.id, event.target.value)}
                    >
                      <option value="" disabled>
                        {t('moderation.research.upload.chooseReport')}
                      </option>
                      {zips.map((zip) => (
                        <option key={zip.id} value={zip.id}>
                          {zip.file.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    disabled={busy}
                    aria-label={t('moderation.research.upload.remove', { name: item.file.name })}
                    onClick={() => remove(item.id)}
                  >
                    <XIcon />
                  </Button>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStaged([])}>
              {t('moderation.research.upload.clearStaged')}
            </Button>
            <Button size="sm" disabled={!plan.ready || busy} onClick={() => void submit()}>
              {busy ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
              {t('moderation.research.upload.submit', { count: Math.max(reports, 1) })}
            </Button>
          </div>
        </div>
      ) : null}
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
                  {item.state === 'done' && item.documents > 0 ? (
                    <span className="block text-xs text-muted-foreground">
                      {t('moderation.research.upload.withDocuments', { count: item.documents })}
                    </span>
                  ) : null}
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
