import { EllipsisIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dot } from '@/components/badges'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ActiveBadge, QueryContent, SectionFrame } from '@/features/settings/components/settings-ui'
import { iconGlyphs } from '@/features/settings/components/topic-icons'
import { errorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'

import { useFaq, useFaqMisses, useSetFaqStatus } from '../hooks'
import { filterArticles, helpfulPercent, type FaqFilter } from '../logic'
import {
  faqSorts,
  faqStatuses,
  type FaqArticle,
  type FaqCategory,
  type FaqOverview,
  type FaqStatus,
} from '../types'
import { ArticleDialog } from './article-dialog'
import { CategoryDialog } from './category-dialog'
import { FlagsDialog } from './flags-dialog'
import { CommentsDialog, VersionsDialog } from './history-dialogs'

const statusTone = { draft: 'warn', published: 'ok', archived: 'neutral' } as const

type Open =
  | { kind: 'article'; article: FaqArticle | null; key: number }
  | { kind: 'category'; category: FaqCategory | null; key: number }
  | { kind: 'versions' | 'comments' | 'flags'; id: string }

function StatusBadge({ status }: { status: FaqStatus }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Dot tone={statusTone[status]} />
      {t(`faq.status.${status}`)}
    </span>
  )
}

function ArticleActions({ article, onOpen }: { article: FaqArticle; onOpen: (open: Open) => void }) {
  const { t } = useTranslation()
  const setStatus = useSetFaqStatus()
  const change = (status: FaqStatus) =>
    setStatus.mutate(
      { id: article.id, status },
      {
        onSuccess: () => toast.success(t(`faq.statusChanged.${status}`)),
        onError: (error) => toast.error(errorText(error)),
      },
    )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('faq.actions', { question: article.question_id })}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onOpen({ kind: 'article', article, key: Date.now() })}>
          {t('app.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpen({ kind: 'versions', id: article.id })}>
          {t('faq.history')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpen({ kind: 'comments', id: article.id })}>
          {t('faq.comments')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpen({ kind: 'flags', id: article.id })}>
          {t('help.faqFlags.menu', { count: article.open_flags ?? 0 })}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {article.status !== 'published' ? (
          <DropdownMenuItem onSelect={() => change('published')}>{t('faq.publish')}</DropdownMenuItem>
        ) : null}
        {article.status === 'published' ? (
          <DropdownMenuItem onSelect={() => change('draft')}>{t('faq.unpublish')}</DropdownMenuItem>
        ) : null}
        {article.status !== 'archived' ? (
          <DropdownMenuItem onSelect={() => change('archived')}>{t('faq.archive')}</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ArticlesTable({ data, onOpen }: { data: FaqOverview; onOpen: (open: Open) => void }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FaqFilter>({
    query: '',
    status: 'all',
    category: 'all',
    sort: 'order',
  })
  const categoryName = (id: string) => data.categories.find((category) => category.id === id)?.name_id ?? '–'
  const rows = filterArticles(data.articles, filter)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-64">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t('faq.search')}
            placeholder={t('faq.search')}
            className="pl-8"
            value={filter.query}
            onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
          />
        </div>
        <Select
          value={filter.status}
          onValueChange={(value) =>
            setFilter((current) => ({ ...current, status: value as FaqFilter['status'] }))
          }
        >
          <SelectTrigger className="w-44" aria-label={t('faq.filterStatus')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('faq.allActive')}</SelectItem>
            {faqStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`faq.status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filter.category}
          onValueChange={(value) => setFilter((current) => ({ ...current, category: value }))}
        >
          <SelectTrigger className="w-48" aria-label={t('faq.filterCategory')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('faq.allCategories')}</SelectItem>
            {data.categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filter.sort}
          onValueChange={(value) =>
            setFilter((current) => ({ ...current, sort: value as FaqFilter['sort'] }))
          }
        >
          <SelectTrigger className="w-52" aria-label={t('faq.sortLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {faqSorts.map((sort) => (
              <SelectItem key={sort} value={sort}>
                {t(`faq.sort.${sort}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={data.articles.length === 0 ? t('faq.emptyArticles') : t('faq.noMatch')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">{t('settings.colOrder')}</TableHead>
              <TableHead>{t('faq.colQuestion')}</TableHead>
              <TableHead>{t('faq.category')}</TableHead>
              <TableHead>{t('settings.colStatus')}</TableHead>
              <TableHead className="text-right">{t('faq.colViews')}</TableHead>
              <TableHead className="text-right">{t('faq.colHelpful')}</TableHead>
              <TableHead className="text-right">{t('faq.colTicketsAfter')}</TableHead>
              <TableHead>{t('faq.colUpdated')}</TableHead>
              <TableHead>
                <span className="sr-only">{t('faq.actionsColumn')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((article) => {
              const percent = helpfulPercent(article)
              return (
                <TableRow key={article.id}>
                  <TableCell className="tabular text-right">{article.sort_order}</TableCell>
                  <TableCell className="max-w-80">
                    <span className="block truncate">{article.question_id}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {article.question_en}
                    </span>
                    {article.open_flags ? (
                      <button
                        type="button"
                        onClick={() => onOpen({ kind: 'flags', id: article.id })}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-warning outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <Dot tone="warn" />
                        {t('help.faqFlags.badge', { count: article.open_flags })}
                      </button>
                    ) : null}
                  </TableCell>
                  <TableCell>{categoryName(article.category_id)}</TableCell>
                  <TableCell>
                    <StatusBadge status={article.status} />
                  </TableCell>
                  <TableCell className="tabular text-right">{formatNumber(article.views)}</TableCell>
                  <TableCell
                    className="tabular text-right"
                    title={t('faq.helpfulDetail', { yes: article.helpful, no: article.not_helpful })}
                  >
                    {percent === null ? '–' : `${percent}%`}
                  </TableCell>
                  <TableCell
                    className="tabular text-right"
                    title={t('faq.ticketsAfterHint', { readers: article.readers })}
                  >
                    {formatNumber(article.tickets_after)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {stamp(article.updated_at)}
                    {article.updated_by_name ? ` · ${article.updated_by_name}` : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    <ArticleActions article={article} onOpen={onOpen} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function CategoriesCard({ data, onOpen }: { data: FaqOverview; onOpen: (open: Open) => void }) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4" aria-labelledby="faq-categories-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="faq-categories-title" className="text-sm font-semibold">
          {t('faq.categories')}
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpen({ kind: 'category', category: null, key: Date.now() })}
        >
          <PlusIcon />
          {t('faq.addCategory')}
        </Button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.categories.map((category) => {
          const Glyph = iconGlyphs[category.icon ?? 'help']
          return (
            <li key={category.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() => onOpen({ kind: 'category', category, key: Date.now() })}
                aria-label={t('faq.editCategoryNamed', { name: category.name_id })}
              >
                <Glyph className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{category.name_id}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('faq.articleCount', { count: category.article_count })}
                  </span>
                </span>
                <ActiveBadge active={category.active} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function MissesCard() {
  const { t } = useTranslation()
  const misses = useFaqMisses(30)
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4" aria-labelledby="faq-misses-title">
      <div>
        <h3 id="faq-misses-title" className="text-sm font-semibold">
          {t('faq.missesTitle')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('faq.missesHint')}</p>
      </div>
      <QueryContent query={misses}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState title={t('faq.noMisses')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('faq.colQuery')}</TableHead>
                  <TableHead>{t('faq.colLanguage')}</TableHead>
                  <TableHead className="text-right">{t('faq.colCount')}</TableHead>
                  <TableHead>{t('faq.colLastSearched')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.language}-${item.query}`}>
                    <TableCell>{item.query}</TableCell>
                    <TableCell className="text-xs uppercase">{item.language}</TableCell>
                    <TableCell className="tabular text-right">{formatNumber(item.count)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{stamp(item.last_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        }
      </QueryContent>
    </section>
  )
}

export function FaqSection() {
  const { t } = useTranslation()
  const faq = useFaq()
  const [open, setOpen] = useState<Open | null>(null)
  const close = () => setOpen(null)
  const target =
    open?.kind === 'versions' || open?.kind === 'comments' || open?.kind === 'flags'
      ? faq.data?.articles.find((article) => article.id === open.id)
      : undefined
  return (
    <SectionFrame
      title={t('faq.title')}
      description={t('faq.description')}
      action={
        <Button
          disabled={!faq.data || faq.data.categories.length === 0}
          onClick={() => setOpen({ kind: 'article', article: null, key: Date.now() })}
        >
          <PlusIcon />
          {t('faq.addArticle')}
        </Button>
      }
    >
      <QueryContent query={faq}>
        {(data) => (
          <div className="flex flex-col gap-4">
            <ArticlesTable data={data} onOpen={setOpen} />
            <CategoriesCard data={data} onOpen={setOpen} />
            <MissesCard />
            {open?.kind === 'article' ? (
              <ArticleDialog
                key={open.key}
                article={open.article}
                categories={data.categories}
                onClose={close}
              />
            ) : null}
            {open?.kind === 'category' ? (
              <CategoryDialog key={open.key} category={open.category} onClose={close} />
            ) : null}
          </div>
        )}
      </QueryContent>
      {target && open?.kind === 'versions' ? <VersionsDialog article={target} onClose={close} /> : null}
      {target && open?.kind === 'comments' ? <CommentsDialog article={target} onClose={close} /> : null}
      {target && open?.kind === 'flags' ? <FlagsDialog article={target} onClose={close} /> : null}
    </SectionFrame>
  )
}
