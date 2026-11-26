import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  CARD_LIMITS,
  cardBlockTypes,
  draftBlock,
  draftItem,
  draftMetric,
  metricTrends,
  moveItem,
  type CardDraft,
  type CardProblem,
  type CardProblems,
  type DraftBlock,
} from '../card-logic'
import { STOCK_CODE_INPUT_MAX } from '../types'

const NO_TREND = 'none'

function Problem({ problem, id }: { problem?: CardProblem; id?: string }) {
  const { t } = useTranslation()
  if (!problem) return null
  return (
    <p id={id} className="text-xs text-destructive">
      {t(`moderation.card.problems.${problem.code}`, 'max' in problem ? { max: problem.max } : {})}
    </p>
  )
}

function Field({
  id,
  label,
  hint,
  problem,
  touched,
  children,
}: {
  id: string
  label: string
  hint?: string
  problem?: CardProblem
  touched: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {touched ? <Problem problem={problem} /> : null}
    </div>
  )
}

function BlockBody({ block, onChange }: { block: DraftBlock; onChange: (block: DraftBlock) => void }) {
  const { t } = useTranslation()
  const id = useId()
  switch (block.type) {
    case 'paragraph':
      return (
        <Textarea
          aria-label={t('moderation.card.blocks.text')}
          rows={3}
          maxLength={CARD_LIMITS.text + 200}
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      )
    case 'list':
      return (
        <div className="flex flex-col gap-2">
          <ToggleGroup
            type="single"
            value={block.style}
            className="self-start"
            aria-label={t('moderation.card.blocks.listStyle')}
            onValueChange={(value) => {
              if (value === 'numbered' || value === 'bulleted') onChange({ ...block, style: value })
            }}
          >
            <ToggleGroupItem value="numbered">{t('moderation.card.blocks.numbered')}</ToggleGroupItem>
            <ToggleGroupItem value="bulleted">{t('moderation.card.blocks.bulleted')}</ToggleGroupItem>
          </ToggleGroup>
          <ol className="flex flex-col gap-1.5">
            {block.items.map((item, itemIndex) => (
              <li key={item.id} className="flex items-center gap-1.5">
                <span className="tabular w-5 shrink-0 text-right text-xs text-muted-foreground">
                  {block.style === 'numbered' ? `${itemIndex + 1}.` : '•'}
                </span>
                <Input
                  aria-label={t('moderation.card.blocks.item', { index: itemIndex + 1 })}
                  maxLength={CARD_LIMITS.item + 100}
                  value={item.text}
                  onChange={(event) =>
                    onChange({
                      ...block,
                      items: block.items.map((value) =>
                        value.id === item.id ? { ...value, text: event.target.value } : value,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={block.items.length <= 1}
                  aria-label={t('moderation.card.blocks.removeItem', { index: itemIndex + 1 })}
                  onClick={() =>
                    onChange({ ...block, items: block.items.filter((value) => value.id !== item.id) })
                  }
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="self-start"
            disabled={block.items.length >= CARD_LIMITS.items}
            onClick={() => onChange({ ...block, items: [...block.items, draftItem()] })}
          >
            <PlusIcon />
            {t('moderation.card.blocks.addItem')}
          </Button>
        </div>
      )
    case 'callout':
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-title`}>{t('moderation.card.blocks.calloutTitle')}</Label>
            <Input
              id={`${id}-title`}
              maxLength={CARD_LIMITS.calloutTitle + 50}
              value={block.title}
              onChange={(event) => onChange({ ...block, title: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-text`}>{t('moderation.card.blocks.calloutText')}</Label>
            <Textarea
              id={`${id}-text`}
              rows={2}
              maxLength={CARD_LIMITS.text + 200}
              value={block.text}
              onChange={(event) => onChange({ ...block, text: event.target.value })}
            />
          </div>
        </div>
      )
    case 'metrics':
      return (
        <div className="flex flex-col gap-2">
          <ol className="flex flex-col gap-2">
            {block.metrics.map((metric, row) => {
              const set = (patch: Partial<typeof metric>) =>
                onChange({
                  ...block,
                  metrics: block.metrics.map((value) =>
                    value.id === metric.id ? { ...value, ...patch } : value,
                  ),
                })
              const number = row + 1
              return (
                <li
                  key={metric.id}
                  className="grid grid-cols-2 items-center gap-1.5 sm:grid-cols-[1fr_1fr_1fr_7rem_auto]"
                >
                  <Input
                    aria-label={t('moderation.card.blocks.metricLabel', { index: number })}
                    placeholder={t('moderation.card.blocks.placeholders.label')}
                    maxLength={CARD_LIMITS.metricText + 20}
                    value={metric.label}
                    onChange={(event) => set({ label: event.target.value })}
                  />
                  <Input
                    aria-label={t('moderation.card.blocks.metricValue', { index: number })}
                    placeholder={t('moderation.card.blocks.placeholders.value')}
                    maxLength={CARD_LIMITS.metricText + 20}
                    value={metric.value}
                    onChange={(event) => set({ value: event.target.value })}
                  />
                  <Input
                    aria-label={t('moderation.card.blocks.metricChange', { index: number })}
                    placeholder={t('moderation.card.blocks.placeholders.change')}
                    maxLength={CARD_LIMITS.metricText + 20}
                    value={metric.change}
                    onChange={(event) => set({ change: event.target.value })}
                  />
                  <Select
                    value={metric.trend || NO_TREND}
                    onValueChange={(value) =>
                      set({ trend: metricTrends.find((trend) => trend === value) ?? '' })
                    }
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label={t('moderation.card.blocks.metricTrend', { index: number })}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TREND}>{t('moderation.card.trend.none')}</SelectItem>
                      {metricTrends.map((trend) => (
                        <SelectItem key={trend} value={trend}>
                          {t(`moderation.card.trend.${trend}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    disabled={block.metrics.length <= 1}
                    aria-label={t('moderation.card.blocks.removeMetric', { index: number })}
                    onClick={() =>
                      onChange({ ...block, metrics: block.metrics.filter((value) => value.id !== metric.id) })
                    }
                  >
                    <XIcon />
                  </Button>
                </li>
              )
            })}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={block.metrics.length >= CARD_LIMITS.metrics}
              onClick={() => onChange({ ...block, metrics: [...block.metrics, draftMetric()] })}
            >
              <PlusIcon />
              {t('moderation.card.blocks.addMetric')}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t('moderation.card.blocks.metricsHint', { max: CARD_LIMITS.metrics })}
            </span>
          </div>
        </div>
      )
  }
}

export function CardEditor({
  draft,
  problems,
  touched,
  onChange,
}: {
  draft: CardDraft
  problems: CardProblems
  touched: boolean
  onChange: (draft: CardDraft) => void
}) {
  const { t } = useTranslation()
  const set = (patch: Partial<CardDraft>) => onChange({ ...draft, ...patch })
  const setBlocks = (blocks: DraftBlock[]) => set({ blocks })
  const text = (key: 'stock' | 'badge' | 'title' | 'subtitle' | 'headline', max: number) => ({
    id: `card-${key}`,
    maxLength: max,
    value: draft[key],
    'aria-invalid': touched && problems[key] ? true : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set({ [key]: event.target.value }),
  })
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="card-stock"
          label={t('moderation.card.fields.stock')}
          hint={t('moderation.card.fields.stockHint')}
          problem={problems.stock}
          touched={touched}
        >
          <Input
            {...text('stock', STOCK_CODE_INPUT_MAX)}
            placeholder="BBCA"
            className="uppercase placeholder:normal-case"
          />
        </Field>
        <Field
          id="card-badge"
          label={t('moderation.card.fields.badge')}
          hint={t('moderation.card.fields.badgeHint')}
          problem={problems.badge}
          touched={touched}
        >
          <Input {...text('badge', CARD_LIMITS.badge + 20)} />
        </Field>
      </div>
      <Field
        id="card-title"
        label={t('moderation.card.fields.title')}
        problem={problems.title}
        touched={touched}
      >
        <Input {...text('title', CARD_LIMITS.title + 50)} />
      </Field>
      <Field
        id="card-subtitle"
        label={t('moderation.card.fields.subtitle')}
        hint={t('moderation.card.fields.subtitleHint')}
        problem={problems.subtitle}
        touched={touched}
      >
        <Input {...text('subtitle', CARD_LIMITS.subtitle + 50)} />
      </Field>
      <Field
        id="card-headline"
        label={t('moderation.card.fields.headline')}
        hint={t('moderation.card.fields.headlineHint')}
        problem={problems.headline}
        touched={touched}
      >
        <Input {...text('headline', CARD_LIMITS.headline + 50)} />
      </Field>
      <section aria-labelledby="card-blocks-title" className="flex flex-col gap-2">
        <h3 id="card-blocks-title" className="text-sm font-medium">
          {t('moderation.card.blocks.title')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('moderation.card.blocks.hint', { max: CARD_LIMITS.blocks })}
        </p>
        {draft.blocks.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {draft.blocks.map((block, index) => {
              const number = index + 1
              const label = t('moderation.card.blocks.label', {
                index: number,
                type: t(`moderation.card.blocks.types.${block.type}`),
              })
              return (
                <li key={block.id} aria-label={label} className="flex flex-col gap-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <span className="flex gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={index === 0}
                        aria-label={t('moderation.card.blocks.up', { index: number })}
                        onClick={() => setBlocks(moveItem(draft.blocks, index, -1))}
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={index === draft.blocks.length - 1}
                        aria-label={t('moderation.card.blocks.down', { index: number })}
                        onClick={() => setBlocks(moveItem(draft.blocks, index, 1))}
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={t('moderation.card.blocks.remove', { index: number })}
                        onClick={() => setBlocks(draft.blocks.filter((value) => value.id !== block.id))}
                      >
                        <Trash2Icon />
                      </Button>
                    </span>
                  </div>
                  <BlockBody
                    block={block}
                    onChange={(next) =>
                      setBlocks(draft.blocks.map((value) => (value.id === block.id ? next : value)))
                    }
                  />
                  {touched ? <Problem problem={problems.block[block.id]} /> : null}
                </li>
              )
            })}
          </ol>
        ) : null}
        <div
          role="group"
          aria-label={t('moderation.card.blocks.add')}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-xs font-medium text-muted-foreground">{t('moderation.card.blocks.add')}</span>
          {cardBlockTypes.map((type) => (
            <Button
              key={type}
              type="button"
              size="xs"
              variant="outline"
              disabled={draft.blocks.length >= CARD_LIMITS.blocks}
              onClick={() => setBlocks([...draft.blocks, draftBlock(type)])}
            >
              <PlusIcon />
              {t(`moderation.card.blocks.types.${type}`)}
            </Button>
          ))}
        </div>
        {touched ? <Problem problem={problems.blocks} /> : null}
      </section>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor="card-disclaimer">{t('moderation.card.fields.disclaimer')}</Label>
        <Textarea
          id="card-disclaimer"
          rows={2}
          maxLength={CARD_LIMITS.disclaimer + 50}
          value={draft.disclaimer}
          aria-invalid={touched && problems.disclaimer ? true : undefined}
          onChange={(event) => set({ disclaimer: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('moderation.card.fields.disclaimerHint')}</p>
        {touched ? <Problem problem={problems.disclaimer} /> : null}
      </div>
    </div>
  )
}
