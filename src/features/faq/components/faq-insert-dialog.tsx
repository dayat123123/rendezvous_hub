import { FlagIcon, LoaderCircleIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDebounced } from '@/hooks/use-now'
import { errorText } from '@/lib/error-text'
import { cn, lengthValid } from '@/lib/utils'

import { useAgentFaqSearch, useAgentFlagFaq } from '../hooks'
import { FaqMarkdown } from '../markdown'
import type { AgentFaqArticle } from '../types'

function FlagForm({ article, onDone }: { article: AgentFaqArticle; onDone: () => void }) {
  const { t } = useTranslation()
  const flag = useAgentFlagFaq()
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const valid = lengthValid(note, 5, 300)
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border bg-subtle p-3"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (!valid) return
        flag.mutate(
          { articleId: article.id, note: note.trim() },
          {
            onSuccess: () => {
              toast.success(t('help.faqInsert.flagged'))
              onDone()
            },
            onError: (error) => toast.error(errorText(error)),
          },
        )
      }}
    >
      <Label htmlFor={`faq-flag-${article.id}`}>{t('help.faqInsert.flagNote')}</Label>
      <Textarea
        id={`faq-flag-${article.id}`}
        autoFocus
        rows={2}
        maxLength={300}
        value={note}
        aria-invalid={touched && !valid ? true : undefined}
        onChange={(event) => setNote(event.target.value)}
      />
      <p className={cn('text-xs', touched && !valid ? 'text-destructive' : 'text-muted-foreground')}>
        {t('help.faqInsert.flagHint')}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={flag.isPending} onClick={onDone}>
          {t('app.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={flag.isPending}>
          {flag.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t('help.faqInsert.flagSubmit')}
        </Button>
      </div>
    </form>
  )
}

function ArticlePreview({
  article,
  onInsert,
}: {
  article: AgentFaqArticle
  onInsert: (article: AgentFaqArticle) => void
}) {
  const { t } = useTranslation()
  const [flagging, setFlagging] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{article.question}</h3>
      <div className="max-h-64 overflow-y-auto rounded-lg border p-3">
        <FaqMarkdown text={article.answer} />
      </div>
      {article.open_flags > 0 ? (
        <p className="text-xs text-warning">{t('help.faqInsert.openFlags', { count: article.open_flags })}</p>
      ) : null}
      {flagging ? (
        <FlagForm article={article} onDone={() => setFlagging(false)} />
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setFlagging(true)}>
            <FlagIcon />
            {t('help.faqInsert.flag')}
          </Button>
          <Button type="button" size="sm" onClick={() => onInsert(article)}>
            {t('help.faqInsert.insert')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function FaqInsertDialog({
  language,
  onInsert,
  onClose,
}: {
  language: 'id' | 'en'
  onInsert: (article: AgentFaqArticle) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query.trim(), 250)
  const results = useAgentFaqSearch(debounced, language)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const items = results.data ?? []
  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" closeLabel={t('app.close')}>
        <DialogHeader>
          <DialogTitle>{t('help.faqInsert.title')}</DialogTitle>
          <DialogDescription>
            {t('help.faqInsert.description', { language: language.toUpperCase() })}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            aria-label={t('help.faqInsert.search')}
            placeholder={t('help.faqInsert.search')}
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {results.isError ? (
          <ErrorState error={results.error} onRetry={() => void results.refetch()} />
        ) : results.isPending ? (
          <p className="text-row text-muted-foreground">{t('app.loading')}</p>
        ) : items.length === 0 ? (
          <EmptyState title={t('help.faqInsert.empty')} />
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul
              aria-label={t('help.faqInsert.results')}
              className={cn(
                'flex max-h-80 flex-col overflow-y-auto rounded-lg border',
                results.isFetching && 'opacity-70',
              )}
            >
              {items.map((item) => (
                <li key={item.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={selected?.id === item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-row outline-none hover:bg-muted focus-visible:bg-muted',
                      selected?.id === item.id && 'bg-selected font-medium',
                    )}
                  >
                    {item.question}
                  </button>
                </li>
              ))}
            </ul>
            {selected ? <ArticlePreview key={selected.id} article={selected} onInsert={onInsert} /> : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
