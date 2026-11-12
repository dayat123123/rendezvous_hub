import { LoaderCircleIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui/controls'
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
import { FieldText } from '@/features/system/components/system-ui'
import { feedFilterErrorText } from '@/lib/error-text'

import { useSaveFeedFilter } from '../hooks'
import { cleanFeedFilterDraft, feedFilterDraft, feedFilterProblems } from '../logic'
import {
  FEED_FILTER_ICON_MAX,
  FEED_FILTER_KEY_MAX,
  FEED_FILTER_LABEL_MAX,
  feedContents,
  feedSorts,
  type FeedContent,
  type FeedFilter,
  type FeedFilterDraft,
  type FeedSort,
} from '../types'

const ALL_POSTS = 'all'

function FeedFilterForm({
  editing,
  keys,
  onClose,
}: {
  editing: FeedFilter | null
  keys: readonly string[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const save = useSaveFeedFilter()
  const [draft, setDraft] = useState<FeedFilterDraft>(() => feedFilterDraft(editing))
  const [checked, setChecked] = useState(false)
  const current = cleanFeedFilterDraft(draft)
  const problems = feedFilterProblems(current, { creating: editing === null, keys })
  const shown = checked ? problems : {}
  const labelText = (problem: 'required' | 'length' | undefined) =>
    problem === 'required'
      ? t('platform.feedFilters.problems.labelRequired')
      : problem === 'length'
        ? t('platform.feedFilters.problems.labelLength', { max: FEED_FILTER_LABEL_MAX })
        : undefined
  const text = {
    key:
      shown.key === 'taken'
        ? t('platform.feedFilters.problems.keyTaken')
        : shown.key === 'format'
          ? t('platform.feedFilters.problems.keyFormat')
          : undefined,
    labelId: labelText(shown.labelId),
    labelEn: labelText(shown.labelEn),
    icon: shown.icon ? t('platform.feedFilters.problems.iconFormat') : undefined,
  }
  const field = (name: string, error: string | undefined) => ({
    id: `${id}-${name}`,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': `${id}-${name}-text`,
  })
  const set = (patch: Partial<FeedFilterDraft>) => setDraft((value) => ({ ...value, ...patch }))

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setChecked(true)
        if (Object.keys(problems).length > 0) return
        save
          .mutateAsync(current)
          .then(() => {
            toast.success(t('platform.feedFilters.saved', { name: current.label_id }))
            onClose()
          })
          .catch((error: unknown) => toast.error(feedFilterErrorText(error)))
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-key`}>{t('platform.feedFilters.fields.key')}</Label>
        <Input
          {...field('key', text.key)}
          autoFocus={!editing}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          disabled={editing !== null}
          maxLength={FEED_FILTER_KEY_MAX}
          placeholder="trending"
          value={draft.key}
          onChange={(event) => set({ key: event.target.value })}
        />
        <FieldText
          id={`${id}-key-text`}
          error={text.key}
          hint={editing ? t('platform.feedFilters.hints.keyLocked') : t('platform.feedFilters.hints.key')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-labelId`}>{t('platform.feedFilters.fields.labelId')}</Label>
          <Input
            {...field('labelId', text.labelId)}
            autoFocus={editing !== null}
            maxLength={FEED_FILTER_LABEL_MAX}
            value={draft.label_id}
            onChange={(event) => set({ label_id: event.target.value })}
          />
          <FieldText
            id={`${id}-labelId-text`}
            error={text.labelId}
            hint={`${current.label_id.length}/${FEED_FILTER_LABEL_MAX}`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-labelEn`}>{t('platform.feedFilters.fields.labelEn')}</Label>
          <Input
            {...field('labelEn', text.labelEn)}
            maxLength={FEED_FILTER_LABEL_MAX}
            value={draft.label_en}
            onChange={(event) => set({ label_en: event.target.value })}
          />
          <FieldText
            id={`${id}-labelEn-text`}
            error={text.labelEn}
            hint={`${current.label_en.length}/${FEED_FILTER_LABEL_MAX}`}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-sort`}>{t('platform.feedFilters.fields.sort')}</Label>
          <Select value={draft.sort} onValueChange={(value) => set({ sort: value as FeedSort })}>
            <SelectTrigger id={`${id}-sort`} className="w-full" aria-describedby={`${id}-sort-text`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {feedSorts.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {t(`platform.feedFilters.sorts.${sort}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldText id={`${id}-sort-text`} hint={t('platform.feedFilters.hints.sort')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-content`}>{t('platform.feedFilters.fields.content')}</Label>
          <Select
            value={draft.content ?? ALL_POSTS}
            onValueChange={(value) => set({ content: value === ALL_POSTS ? null : (value as FeedContent) })}
          >
            <SelectTrigger id={`${id}-content`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_POSTS}>{t('platform.feedFilters.contents.all')}</SelectItem>
              {feedContents.map((content) => (
                <SelectItem key={content} value={content}>
                  {t(`platform.feedFilters.contents.${content}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-icon`}>{t('platform.feedFilters.fields.icon')}</Label>
        <Input
          {...field('icon', text.icon)}
          autoComplete="off"
          spellCheck={false}
          className="font-mono sm:max-w-60"
          maxLength={FEED_FILTER_ICON_MAX}
          placeholder="trending_up"
          value={draft.icon ?? ''}
          onChange={(event) => set({ icon: event.target.value })}
        />
        <FieldText id={`${id}-icon-text`} error={text.icon} hint={t('platform.feedFilters.hints.icon')} />
      </div>
      <label className="flex items-start gap-2 text-row">
        <Switch className="mt-0.5" checked={draft.enabled} onCheckedChange={(enabled) => set({ enabled })} />
        <span>
          <span className="block font-medium">{t('platform.feedFilters.fields.enabled')}</span>
          <span className="block text-xs text-muted-foreground">
            {t('platform.feedFilters.hints.enabled')}
          </span>
        </span>
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
          {t('app.cancel')}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t('app.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function FeedFilterDialog({
  editing,
  keys,
  onClose,
}: {
  editing: FeedFilter | null
  keys: readonly string[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl" closeLabel={t('app.close')}>
        <DialogHeader>
          <DialogTitle>
            {editing ? t('platform.feedFilters.editTitle') : t('platform.feedFilters.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('platform.feedFilters.formHint')}</DialogDescription>
        </DialogHeader>
        <FeedFilterForm editing={editing} keys={keys} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
