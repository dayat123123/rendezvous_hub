import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRightIcon, LoaderCircleIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { PriorityText } from '@/components/badges'
import { Button } from '@/components/ui/button'
import {
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui/controls'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAgent } from '@/features/auth/hooks'
import { isSuperAdmin } from '@/features/presence/types'
import { ticketPriorities } from '@/features/tickets/types'
import { cn } from '@/lib/utils'

import { useAdminOptions, useSaveTopic, useSaveTopicPicker, useTopicConfigs, useTopicPicker } from '../hooks'
import {
  topicFlags,
  topicIcons,
  topicStyles,
  type TopicConfig,
  type TopicIcon,
  type TopicPicker,
  type TopicStyle,
} from '../types'
import { ActiveBadge, FieldMessage, FormError, QueryContent, SectionFrame } from './settings-ui'
import { TopicExtrasDialog } from './topic-extras-dialog'
import { iconGlyphs } from './topic-icons'

type Message =
  | 'settings.invalidTopicCode'
  | 'settings.invalidName'
  | 'settings.requiredField'
  | 'settings.helpUrlHint'
  | 'settings.topicDescriptionHint'

const topicSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,31}$/, 'settings.invalidTopicCode'),
  name_id: z.string().trim().min(2, 'settings.invalidName').max(40, 'settings.invalidName'),
  name_en: z.string().trim().min(2, 'settings.invalidName').max(40, 'settings.invalidName'),
  description_id: z.string().trim().max(120, 'settings.topicDescriptionHint'),
  description_en: z.string().trim().max(120, 'settings.topicDescriptionHint'),
  icon: z.enum(topicIcons),
  style: z.enum(topicStyles),
  flags: z.array(z.enum(topicFlags)),
  skill: z.string().min(1, 'settings.requiredField'),
  default_priority: z.enum(ticketPriorities),
  help_url: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^https:\/\/[A-Za-z0-9.-]+(\/\S*)?$/.test(value),
      'settings.helpUrlHint',
    ),
  sort_order: z
    .string()
    .trim()
    .refine((value) => /^\d{1,3}$/.test(value)),
  active: z.boolean(),
})

type TopicForm = z.infer<typeof topicSchema>

function TopicCard({
  icon,
  name,
  description,
  style,
}: {
  icon: TopicIcon | null
  name: string
  description: string
  style: TopicStyle
}) {
  const Glyph = iconGlyphs[icon ?? 'help']
  const danger = style === 'danger'
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          danger ? 'bg-danger/10 text-danger' : 'bg-muted text-foreground',
        )}
      >
        <Glyph className="size-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-sm font-medium', danger && 'text-danger')}>{name || '–'}</span>
        {description ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </div>
  )
}

function TopicDialog({ topic, onClose }: { topic: TopicConfig | null; onClose: () => void }) {
  const { t } = useTranslation()
  const agent = useAgent()
  const options = useAdminOptions()
  const save = useSaveTopic()
  const editing = topic !== null
  const canFlag = isSuperAdmin(agent)
  const skills = options.data?.skills ?? []
  const form = useForm<TopicForm>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      code: topic?.code ?? '',
      name_id: topic?.name_id ?? '',
      name_en: topic?.name_en ?? '',
      description_id: topic?.description_id ?? '',
      description_en: topic?.description_en ?? '',
      icon: topic?.icon ?? 'help',
      style: topic?.style ?? 'normal',
      flags: (topic?.flags ?? []).filter((flag): flag is (typeof topicFlags)[number] =>
        (topicFlags as readonly string[]).includes(flag),
      ),
      skill: topic?.skill ?? 'general',
      default_priority: ticketPriorities.find((priority) => priority === topic?.default_priority) ?? 'P3',
      help_url: topic?.help_url ?? '',
      sort_order: String(topic?.sort_order ?? 100),
      active: topic?.active ?? true,
    },
  })
  const errors = form.formState.errors
  const message = (value?: string) => (value ? t(value as Message) : undefined)
  const [nameId, descriptionId, icon, style] = useWatch({
    control: form.control,
    name: ['name_id', 'description_id', 'icon', 'style'],
  })

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        code: values.code.trim(),
        name_id: values.name_id.trim(),
        name_en: values.name_en.trim(),
        description_id: values.description_id.trim() || null,
        description_en: values.description_en.trim() || null,
        icon: values.icon,
        style: values.style,
        flags: [...values.flags].sort(),
        skill: values.skill,
        default_priority: values.default_priority,
        help_url: values.help_url.trim() || null,
        sort_order: Number(values.sort_order),
        active: values.active,
      })
      onClose()
    } catch {
      return
    }
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        closeLabel={t('app.close')}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {editing ? t('settings.editTopicTitle', { name: topic.name_id }) : t('settings.addTopic')}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-code">{t('settings.topicCode')}</Label>
            <Input
              id="topic-code"
              disabled={editing}
              autoFocus={!editing}
              maxLength={32}
              aria-invalid={errors.code ? true : undefined}
              {...form.register('code')}
            />
            <FieldMessage error={message(errors.code?.message)} hint={t('settings.topicCodeHint')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topic-name-id">{t('settings.topicNameId')}</Label>
              <Input
                id="topic-name-id"
                maxLength={40}
                autoFocus={editing}
                aria-invalid={errors.name_id ? true : undefined}
                {...form.register('name_id')}
              />
              <FieldMessage error={message(errors.name_id?.message)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topic-name-en">{t('settings.topicNameEn')}</Label>
              <Input
                id="topic-name-en"
                maxLength={40}
                aria-invalid={errors.name_en ? true : undefined}
                {...form.register('name_en')}
              />
              <FieldMessage error={message(errors.name_en?.message)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topic-description-id">{t('settings.topicDescriptionId')}</Label>
              <Textarea
                id="topic-description-id"
                rows={2}
                maxLength={120}
                aria-invalid={errors.description_id ? true : undefined}
                {...form.register('description_id')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topic-description-en">{t('settings.topicDescriptionEn')}</Label>
              <Textarea
                id="topic-description-en"
                rows={2}
                maxLength={120}
                aria-invalid={errors.description_en ? true : undefined}
                {...form.register('description_en')}
              />
            </div>
          </div>
          <FieldMessage hint={t('settings.topicDescriptionHint')} />
          <div className="flex flex-col gap-1.5">
            <span id="topic-icon-label" className="text-sm font-medium">
              {t('settings.topicIcon')}
            </span>
            <Controller
              control={form.control}
              name="icon"
              render={({ field }) => (
                <div role="radiogroup" aria-labelledby="topic-icon-label" className="flex flex-wrap gap-1.5">
                  {topicIcons.map((key) => {
                    const Glyph = iconGlyphs[key]
                    const selected = field.value === key
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={t(`settings.topicIcons.${key}`)}
                        title={t(`settings.topicIcons.${key}`)}
                        onClick={() => field.onChange(key)}
                        className={cn(
                          'flex size-9 items-center justify-center rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                          selected ? 'border-foreground bg-muted' : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <Glyph className="size-4" aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topic-style">{t('settings.topicStyle')}</Label>
              <Controller
                control={form.control}
                name="style"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="topic-style" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {topicStyles.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`settings.topicStyles.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <fieldset className="flex flex-col gap-1.5" disabled={!canFlag}>
              <legend className="mb-1.5 text-sm font-medium">{t('settings.topicFlags')}</legend>
              <Controller
                control={form.control}
                name="flags"
                render={({ field }) => (
                  <div className="flex h-9 items-center gap-4">
                    {topicFlags.map((flag) => (
                      <label key={flag} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(flag)}
                          disabled={!canFlag}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked === true
                                ? [...field.value, flag]
                                : field.value.filter((value) => value !== flag),
                            )
                          }
                        />
                        {t(`settings.topicFlagNames.${flag}`)}
                      </label>
                    ))}
                  </div>
                )}
              />
              <FieldMessage hint={t('settings.topicFlagsHint')} />
            </fieldset>
          </div>
          <div role="group" aria-label={t('settings.topicPreview')} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t('settings.topicPreview')}</span>
            <TopicCard icon={icon} name={nameId} description={descriptionId} style={style} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topic-skill">{t('settings.topicSkill')}</Label>
              <Controller
                control={form.control}
                name="skill"
                render={({ field }) => (
                  <Select
                    value={skills.some((skill) => skill.code === field.value) ? field.value : undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="topic-skill" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skills.map((skill) => (
                        <SelectItem key={skill.code} value={skill.code}>
                          {skill.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex w-36 flex-col gap-1.5">
              <Label htmlFor="topic-priority">{t('settings.defaultPriority')}</Label>
              <Controller
                control={form.control}
                name="default_priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="topic-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketPriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-help">{t('settings.helpUrl')}</Label>
            <Input
              id="topic-help"
              type="url"
              inputMode="url"
              placeholder="https://"
              aria-invalid={errors.help_url ? true : undefined}
              {...form.register('help_url')}
            />
            <FieldMessage error={message(errors.help_url?.message)} hint={t('settings.helpUrlHint')} />
          </div>
          <div className="grid grid-cols-[auto_1fr] items-end gap-4">
            <div className="flex w-40 flex-col gap-1.5">
              <Label htmlFor="topic-sort">{t('settings.sortOrder')}</Label>
              <Input
                id="topic-sort"
                inputMode="numeric"
                maxLength={3}
                aria-invalid={errors.sort_order ? true : undefined}
                {...form.register('sort_order')}
              />
            </div>
            <Controller
              control={form.control}
              name="active"
              render={({ field }) => (
                <label className="flex h-9 items-center justify-between gap-3 text-sm font-medium">
                  {t('settings.topicActive')}
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          </div>
          <FieldMessage
            error={errors.sort_order ? t('settings.numberRange', { min: 0, max: 999 }) : undefined}
          />
          <FormError error={save.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={save.isPending} onClick={onClose}>
              {t('app.cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
              {t('app.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PickerTextForm({ picker }: { picker: TopicPicker }) {
  const { t } = useTranslation()
  const save = useSaveTopicPicker()
  const [draft, setDraft] = useState({
    title_id: picker.title?.id ?? '',
    title_en: picker.title?.en ?? '',
    hint_id: picker.hint?.id ?? '',
    hint_en: picker.hint?.en ?? '',
  })
  const field = (key: keyof typeof draft, label: string, max: number) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`topic-picker-${key}`}>{label}</Label>
      <Input
        id={`topic-picker-${key}`}
        maxLength={max}
        value={draft[key]}
        onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
      />
    </div>
  )
  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(
          {
            title_id: draft.title_id.trim(),
            title_en: draft.title_en.trim(),
            hint_id: draft.hint_id.trim(),
            hint_en: draft.hint_en.trim(),
          },
          { onSuccess: () => toast.success(t('settings.pickerSaved')) },
        )
      }}
    >
      <div>
        <h3 className="text-sm font-semibold">{t('settings.pickerTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('settings.pickerDescription')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field('title_id', t('settings.pickerTitleId'), 80)}
        {field('title_en', t('settings.pickerTitleEn'), 80)}
        {field('hint_id', t('settings.pickerHintId'), 160)}
        {field('hint_en', t('settings.pickerHintEn'), 160)}
      </div>
      <FormError error={save.error} />
      <div>
        <Button type="submit" variant="outline" size="sm" disabled={save.isPending}>
          {save.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {t('settings.savePicker')}
        </Button>
      </div>
    </form>
  )
}

export function TopicsSection() {
  const { t, i18n } = useTranslation()
  const topics = useTopicConfigs()
  const options = useAdminOptions()
  const picker = useTopicPicker()
  const [editing, setEditing] = useState<{ topic: TopicConfig | null; key: number } | null>(null)
  const [extras, setExtras] = useState<{ topic: TopicConfig; key: number } | null>(null)
  const skillName = (code: string) => options.data?.skills.find((skill) => skill.code === code)?.name ?? code
  const english = i18n.language.startsWith('en')
  return (
    <SectionFrame
      title={t('settings.topics')}
      description={t('settings.topicsDescription')}
      action={
        <Button onClick={() => setEditing({ topic: null, key: Date.now() })}>
          <PlusIcon />
          {t('settings.addTopic')}
        </Button>
      }
    >
      {picker.data ? <PickerTextForm picker={picker.data} /> : null}
      <QueryContent query={topics}>
        {(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t('settings.colOrder')}</TableHead>
                <TableHead>{t('settings.colCode')}</TableHead>
                <TableHead>{t('settings.colName')}</TableHead>
                <TableHead>{t('settings.colDescription')}</TableHead>
                <TableHead>{t('settings.colStyle')}</TableHead>
                <TableHead>{t('settings.colSkill')}</TableHead>
                <TableHead>{t('settings.colDefaultPriority')}</TableHead>
                <TableHead>{t('settings.colHelpLink')}</TableHead>
                <TableHead>{t('help.extras.column')}</TableHead>
                <TableHead>{t('settings.colStatus')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('app.edit')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((topic) => {
                const Glyph = iconGlyphs[topic.icon ?? 'help']
                const description = english ? topic.description_en : topic.description_id
                return (
                  <TableRow key={topic.code}>
                    <TableCell className="tabular text-right">{topic.sort_order}</TableCell>
                    <TableCell className="font-mono text-xs">{topic.code}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Glyph
                          className={cn('size-4 shrink-0', topic.style === 'danger' && 'text-danger')}
                          aria-hidden="true"
                        />
                        <span>
                          {topic.name_id} <span className="text-muted-foreground">/ {topic.name_en}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="max-w-64 text-xs text-muted-foreground">
                      {description ?? '–'}
                    </TableCell>
                    <TableCell className={cn('text-xs', topic.style === 'danger' && 'text-danger')}>
                      {t(`settings.topicStyles.${topic.style}`)}
                    </TableCell>
                    <TableCell>{skillName(topic.skill)}</TableCell>
                    <TableCell>
                      <PriorityText priority={topic.default_priority} />
                    </TableCell>
                    <TableCell className="max-w-56 truncate" title={topic.help_url ?? undefined}>
                      {topic.help_url ?? '–'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t('help.extras.summary', {
                        intake: topic.intake?.length ?? 0,
                        replies: topic.customer_replies?.length ?? 0,
                      })}
                      {topic.sop ? ` · ${t('help.extras.hasSop')}` : ''}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={topic.active} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditing({ topic, key: Date.now() })}
                      >
                        {t('app.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        aria-label={t('help.extras.openNamed', { name: topic.name_id })}
                        onClick={() => setExtras({ topic, key: Date.now() })}
                      >
                        {t('help.extras.open')}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </QueryContent>
      {editing ? (
        <TopicDialog key={editing.key} topic={editing.topic} onClose={() => setEditing(null)} />
      ) : null}
      {extras ? (
        <TopicExtrasDialog key={extras.key} topic={extras.topic} onClose={() => setExtras(null)} />
      ) : null}
    </SectionFrame>
  )
}
