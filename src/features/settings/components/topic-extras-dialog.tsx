import { LoaderCircleIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { useSaveTopicExtras } from '../hooks'
import {
  cleanExtras,
  emptyField,
  emptyOption,
  emptyReply,
  extrasProblems,
  MAX_INTAKE,
  MAX_OPTIONS,
  MAX_REPLIES,
  MAX_REPLY,
  MAX_SOP,
  topicExtras,
  type ExtrasProblems,
} from '../topic-extras'
import {
  intakeTypes,
  type IntakeField,
  type IntakeOption,
  type IntakeType,
  type TopicConfig,
  type TopicExtras,
} from '../types'
import { FieldMessage, FormError } from './settings-ui'

type Problem = (path: string) => string | undefined

function TextField({
  id,
  label,
  value,
  max,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  max: number
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        maxLength={max}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldMessage error={error} />
    </div>
  )
}

function OptionRow({
  prefix,
  option,
  index,
  problem,
  onChange,
  onRemove,
}: {
  prefix: string
  option: IntakeOption
  index: number
  problem: Problem
  onChange: (option: IntakeOption) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const path = `${prefix}.options.${index}`
  const id = path.replaceAll('.', '-')
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
      <TextField
        id={`${id}-value`}
        label={t('help.extras.optionValue')}
        value={option.value}
        max={32}
        error={problem(`${path}.value`)}
        onChange={(value) => onChange({ ...option, value })}
      />
      <TextField
        id={`${id}-label-id`}
        label={t('help.extras.labelId')}
        value={option.label_id}
        max={60}
        error={problem(`${path}.label_id`)}
        onChange={(label_id) => onChange({ ...option, label_id })}
      />
      <TextField
        id={`${id}-label-en`}
        label={t('help.extras.labelEn')}
        value={option.label_en}
        max={60}
        error={problem(`${path}.label_en`)}
        onChange={(label_en) => onChange({ ...option, label_en })}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="mt-6"
        aria-label={t('help.extras.removeOption', { number: index + 1 })}
        onClick={onRemove}
      >
        <Trash2Icon />
      </Button>
    </div>
  )
}

function FieldCard({
  field,
  index,
  problem,
  onChange,
  onRemove,
}: {
  field: IntakeField
  index: number
  problem: Problem
  onChange: (field: IntakeField) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const prefix = `intake.${index}`
  const id = `intake-${index}`
  const setOption = (position: number, option: IntakeOption) =>
    onChange({ ...field, options: field.options.map((item, at) => (at === position ? option : item)) })
  return (
    <fieldset
      className="flex flex-col gap-3 rounded-lg border p-3"
      aria-label={t('help.extras.fieldNumber', { number: index + 1 })}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">{t('help.extras.fieldNumber', { number: index + 1 })}</h4>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={t('help.extras.removeField', { number: index + 1 })}
          onClick={onRemove}
        >
          <Trash2Icon />
          {t('app.delete')}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
        <TextField
          id={`${id}-key`}
          label={t('help.extras.key')}
          value={field.key}
          max={32}
          error={problem(`${prefix}.key`)}
          onChange={(key) => onChange({ ...field, key })}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-type`}>{t('help.extras.type')}</Label>
          <Select
            value={field.type}
            onValueChange={(value) => {
              const type = value as IntakeType
              onChange({
                ...field,
                type,
                options:
                  type === 'choice' && field.options.length === 0
                    ? [emptyOption(), emptyOption()]
                    : field.options,
              })
            }}
          >
            <SelectTrigger id={`${id}-type`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intakeTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`help.extras.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-9 items-center gap-2 self-end text-sm font-medium sm:mb-0.5">
          <Switch
            checked={field.required}
            onCheckedChange={(required) => onChange({ ...field, required })}
            aria-label={t('help.extras.required')}
          />
          {t('help.extras.required')}
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id={`${id}-label-id`}
          label={t('help.extras.questionId')}
          value={field.label_id}
          max={80}
          error={problem(`${prefix}.label_id`)}
          onChange={(label_id) => onChange({ ...field, label_id })}
        />
        <TextField
          id={`${id}-label-en`}
          label={t('help.extras.questionEn')}
          value={field.label_en}
          max={80}
          error={problem(`${prefix}.label_en`)}
          onChange={(label_en) => onChange({ ...field, label_en })}
        />
      </div>
      {field.type === 'choice' ? (
        <div className="flex flex-col gap-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">{t('help.extras.options')}</p>
          {field.options.map((option, position) => (
            <OptionRow
              key={position}
              prefix={prefix}
              option={option}
              index={position}
              problem={problem}
              onChange={(next) => setOption(position, next)}
              onRemove={() =>
                onChange({ ...field, options: field.options.filter((_, at) => at !== position) })
              }
            />
          ))}
          <FieldMessage error={problem(`${prefix}.options`)} />
          <div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={field.options.length >= MAX_OPTIONS}
              onClick={() => onChange({ ...field, options: [...field.options, emptyOption()] })}
            >
              <PlusIcon />
              {t('help.extras.addOption')}
            </Button>
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}

export function TopicExtrasDialog({ topic, onClose }: { topic: TopicConfig; onClose: () => void }) {
  const { t } = useTranslation()
  const save = useSaveTopicExtras()
  const [draft, setDraft] = useState<TopicExtras>(() => topicExtras(topic))
  const [problems, setProblems] = useState<ExtrasProblems | null>(null)
  const sop = draft.sop ?? ''

  const update = (next: TopicExtras) => {
    setDraft(next)
    if (problems) setProblems(extrasProblems(next))
  }
  const problem: Problem = (path) => {
    const code = problems?.[path]
    return code ? t(`help.extras.errors.${code}`) : undefined
  }
  const setField = (index: number, field: IntakeField) =>
    update({ ...draft, intake: draft.intake.map((item, at) => (at === index ? field : item)) })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = extrasProblems(draft)
    setProblems(found)
    if (Object.keys(found).length > 0) return
    try {
      await save.mutateAsync({ code: topic.code, extras: cleanExtras(draft) })
      toast.success(t('help.extras.saved', { name: topic.name_id }))
      onClose()
    } catch {
      return
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        closeLabel={t('app.close')}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t('help.extras.title', { name: topic.name_id })}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-6" noValidate onSubmit={(event) => void submit(event)}>
          <section className="flex flex-col gap-3" aria-labelledby="extras-intake-title">
            <div>
              <h3 id="extras-intake-title" className="text-sm font-semibold">
                {t('help.extras.intake')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('help.extras.intakeHint', { max: MAX_INTAKE })}
              </p>
            </div>
            {draft.intake.map((field, index) => (
              <FieldCard
                key={index}
                field={field}
                index={index}
                problem={problem}
                onChange={(next) => setField(index, next)}
                onRemove={() => update({ ...draft, intake: draft.intake.filter((_, at) => at !== index) })}
              />
            ))}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.intake.length >= MAX_INTAKE}
                onClick={() => update({ ...draft, intake: [...draft.intake, emptyField()] })}
              >
                <PlusIcon />
                {t('help.extras.addField')}
              </Button>
            </div>
          </section>
          <section className="flex flex-col gap-3 border-t pt-4" aria-labelledby="extras-replies-title">
            <div>
              <h3 id="extras-replies-title" className="text-sm font-semibold">
                {t('help.extras.replies')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('help.extras.repliesHint', { max: MAX_REPLIES, length: MAX_REPLY })}
              </p>
            </div>
            {draft.customer_replies.map((reply, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                <TextField
                  id={`reply-${index}-id`}
                  label={t('help.extras.replyId', { number: index + 1 })}
                  value={reply.id}
                  max={MAX_REPLY}
                  error={problem(`replies.${index}.id`)}
                  onChange={(id) =>
                    update({
                      ...draft,
                      customer_replies: draft.customer_replies.map((item, at) =>
                        at === index ? { ...item, id } : item,
                      ),
                    })
                  }
                />
                <TextField
                  id={`reply-${index}-en`}
                  label={t('help.extras.replyEn', { number: index + 1 })}
                  value={reply.en}
                  max={MAX_REPLY}
                  error={problem(`replies.${index}.en`)}
                  onChange={(en) =>
                    update({
                      ...draft,
                      customer_replies: draft.customer_replies.map((item, at) =>
                        at === index ? { ...item, en } : item,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-6"
                  aria-label={t('help.extras.removeReply', { number: index + 1 })}
                  onClick={() =>
                    update({
                      ...draft,
                      customer_replies: draft.customer_replies.filter((_, at) => at !== index),
                    })
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.customer_replies.length >= MAX_REPLIES}
                onClick={() =>
                  update({ ...draft, customer_replies: [...draft.customer_replies, emptyReply()] })
                }
              >
                <PlusIcon />
                {t('help.extras.addReply')}
              </Button>
            </div>
          </section>
          <section className="flex flex-col gap-1.5 border-t pt-4">
            <Label htmlFor="extras-sop" className="text-sm font-semibold">
              {t('help.extras.sop')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('help.extras.sopHint')}</p>
            <Textarea
              id="extras-sop"
              rows={6}
              maxLength={MAX_SOP}
              value={sop}
              aria-invalid={problem('sop') ? true : undefined}
              onChange={(event) => update({ ...draft, sop: event.target.value })}
            />
            <p className="tabular text-right text-xs text-muted-foreground">
              {sop.length}/{MAX_SOP}
            </p>
          </section>
          {problems && Object.keys(problems).length > 0 ? (
            <p role="alert" className="text-row text-destructive">
              {t('help.extras.fixErrors')}
            </p>
          ) : null}
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
