import { LoaderCircleIcon, PlusIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'
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
import { Textarea } from '@/components/ui/textarea'
import { FieldText } from '@/features/system/components/system-ui'
import { instrumentErrorText } from '@/lib/error-text'

import { STOCK_CODE_INPUT_MAX } from '../types'
import { useInstrumentCheck, useSaveInstrument } from './hooks'
import {
  cleanInstrumentDraft,
  collisionWarnings,
  instrumentDraft,
  instrumentProblems,
  listText,
  mergeAliases,
  parseAliases,
} from './logic'
import {
  INSTRUMENT_ALIASES_MAX,
  INSTRUMENT_DESCRIPTION_MAX,
  INSTRUMENT_NAME_MAX,
  type InstrumentDraft,
  type InstrumentWarning,
  type MarketInstrument,
} from './types'

function WarningText({ warning, code }: { warning: InstrumentWarning; code: string }) {
  const { t, i18n } = useTranslation()
  const usage = [
    warning.posts > 0 ? t('moderation.instruments.warnings.posts', { count: warning.posts }) : null,
    warning.watchers > 0 ? t('moderation.instruments.warnings.watchers', { count: warning.watchers }) : null,
    warning.room ? t('moderation.instruments.warnings.room', { count: warning.roomMembers }) : null,
  ].filter((item): item is string => item !== null)
  const alias = warning.role === 'alias'
  const lines = [
    usage.length > 0
      ? t(alias ? 'moderation.instruments.warnings.aliasUsed' : 'moderation.instruments.warnings.codeUsed', {
          token: warning.token,
          list: listText(usage, i18n.language),
          code,
        })
      : null,
    warning.instrument
      ? t(
          alias
            ? 'moderation.instruments.warnings.aliasIsInstrument'
            : 'moderation.instruments.warnings.codeIsInstrument',
          { token: warning.token },
        )
      : null,
    warning.aliasOf
      ? t('moderation.instruments.warnings.aliasOf', { token: warning.token, code: warning.aliasOf })
      : null,
    warning.stockFormat ? t('moderation.instruments.warnings.stockFormat', { token: warning.token }) : null,
  ].filter((item): item is string => item !== null)
  return (
    <li className="flex flex-col gap-0.5">
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </li>
  )
}

function AliasField({
  id,
  aliases,
  pending,
  error,
  disabled,
  onPending,
  onChange,
}: {
  id: string
  aliases: string[]
  pending: string
  error: string | undefined
  disabled: boolean
  onPending: (value: string) => void
  onChange: (aliases: string[]) => void
}) {
  const { t } = useTranslation()
  const add = () => {
    const parsed = parseAliases(pending)
    if (parsed.length === 0) return
    onChange(mergeAliases(aliases, parsed))
    onPending('')
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-alias`}>{t('moderation.instruments.fields.aliases')}</Label>
      <div className="flex gap-2">
        <Input
          id={`${id}-alias`}
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase sm:max-w-60"
          maxLength={STOCK_CODE_INPUT_MAX * 2}
          placeholder="JCI"
          disabled={disabled}
          value={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-alias-text`}
          onChange={(event) => onPending(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ',') return
            event.preventDefault()
            add()
          }}
        />
        <Button type="button" variant="outline" disabled={disabled} onClick={add}>
          <PlusIcon />
          {t('moderation.instruments.addAlias')}
        </Button>
      </div>
      {aliases.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('moderation.instruments.aliasList')}>
          {aliases.map((alias) => (
            <li
              key={alias}
              className="inline-flex items-center gap-1 rounded-sm border py-px pr-0.5 pl-1.5 font-mono text-xs"
            >
              {alias}
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={disabled}
                aria-label={t('moderation.instruments.removeAlias', { alias })}
                onClick={() => onChange(aliases.filter((item) => item !== alias))}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <FieldText
        id={`${id}-alias-text`}
        error={error}
        hint={t('moderation.instruments.hints.aliases', { max: INSTRUMENT_ALIASES_MAX })}
      />
    </div>
  )
}

function InstrumentForm({ editing, onClose }: { editing: MarketInstrument | null; onClose: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  const check = useInstrumentCheck()
  const save = useSaveInstrument()
  const [draft, setDraft] = useState<InstrumentDraft>(() => instrumentDraft(editing))
  const [pending, setPending] = useState('')
  const [checked, setChecked] = useState(false)
  const [review, setReview] = useState<InstrumentWarning[] | null>(null)
  const creating = editing === null
  const current = cleanInstrumentDraft(draft, pending)
  const problems = instrumentProblems(current, creating)
  const shown = checked ? problems : {}
  const busy = check.isPending || save.isPending
  const text = {
    code: shown.code ? t('moderation.instruments.problems.code') : undefined,
    name: shown.name
      ? shown.name === 'required'
        ? t('moderation.instruments.problems.nameRequired')
        : t('moderation.instruments.problems.nameLength', { max: INSTRUMENT_NAME_MAX })
      : undefined,
    description: shown.description
      ? t('moderation.instruments.problems.descriptionLength', { max: INSTRUMENT_DESCRIPTION_MAX })
      : undefined,
    aliases: shown.aliases
      ? t(`moderation.instruments.problems.aliases.${shown.aliases}`, { max: INSTRUMENT_ALIASES_MAX })
      : undefined,
  }
  const set = (patch: Partial<InstrumentDraft>) => {
    setReview(null)
    setDraft((value) => ({ ...value, ...patch }))
  }
  const persist = () =>
    save
      .mutateAsync(current)
      .then(() => {
        toast.success(t('moderation.instruments.saved', { code: current.code }))
        onClose()
      })
      .catch((error: unknown) => toast.error(instrumentErrorText(error)))

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setChecked(true)
        if (Object.keys(problems).length > 0) return
        check
          .mutateAsync({ code: current.code, aliases: current.aliases })
          .then((entries) => {
            const warnings = collisionWarnings(entries, editing)
            if (warnings.length > 0) setReview(warnings)
            else void persist()
          })
          .catch((error: unknown) => toast.error(instrumentErrorText(error)))
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-code`}>{t('moderation.instruments.fields.code')}</Label>
          <Input
            id={`${id}-code`}
            autoFocus={creating}
            autoComplete="off"
            spellCheck={false}
            className="font-mono uppercase"
            disabled={!creating || busy}
            maxLength={STOCK_CODE_INPUT_MAX}
            placeholder="IHSG"
            value={draft.code}
            aria-invalid={text.code ? true : undefined}
            aria-describedby={`${id}-code-text`}
            onChange={(event) => set({ code: event.target.value })}
          />
          <FieldText
            id={`${id}-code-text`}
            error={text.code}
            hint={
              creating ? t('moderation.instruments.hints.code') : t('moderation.instruments.hints.codeLocked')
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>{t('moderation.instruments.fields.name')}</Label>
          <Input
            id={`${id}-name`}
            autoFocus={!creating}
            maxLength={INSTRUMENT_NAME_MAX}
            disabled={busy}
            value={draft.name}
            aria-invalid={text.name ? true : undefined}
            aria-describedby={`${id}-name-text`}
            onChange={(event) => set({ name: event.target.value })}
          />
          <FieldText
            id={`${id}-name-text`}
            error={text.name}
            hint={`${current.name.length}/${INSTRUMENT_NAME_MAX}`}
          />
        </div>
      </div>
      <AliasField
        id={id}
        aliases={draft.aliases}
        pending={pending}
        error={text.aliases}
        disabled={busy}
        onPending={(value) => {
          setReview(null)
          setPending(value)
        }}
        onChange={(aliases) => set({ aliases })}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-description`}>{t('moderation.instruments.fields.description')}</Label>
        <Textarea
          id={`${id}-description`}
          rows={3}
          maxLength={INSTRUMENT_DESCRIPTION_MAX}
          disabled={busy}
          value={draft.description ?? ''}
          aria-invalid={text.description ? true : undefined}
          aria-describedby={`${id}-description-text`}
          onChange={(event) => set({ description: event.target.value })}
        />
        <FieldText
          id={`${id}-description-text`}
          error={text.description}
          hint={`${(current.description ?? '').length}/${INSTRUMENT_DESCRIPTION_MAX}`}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-row">
          <Switch
            className="mt-0.5"
            checked={draft.enabled}
            disabled={busy}
            onCheckedChange={(enabled) => set({ enabled })}
          />
          <span>
            <span className="block font-medium">{t('moderation.instruments.fields.enabled')}</span>
            <span className="block text-xs text-muted-foreground">
              {t('moderation.instruments.hints.enabled')}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-row">
          <Switch
            className="mt-0.5"
            checked={draft.room_enabled}
            disabled={busy}
            onCheckedChange={(roomEnabled) => set({ room_enabled: roomEnabled })}
          />
          <span>
            <span className="block font-medium">{t('moderation.instruments.fields.roomEnabled')}</span>
            <span className="block text-xs text-muted-foreground">
              {t('moderation.instruments.hints.roomEnabled')}
            </span>
          </span>
        </label>
      </div>
      {review ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-warning/40 p-3 text-row">
          <p className="flex items-center gap-2 font-medium text-warning">
            <TriangleAlertIcon className="size-4 shrink-0" />
            {t('moderation.instruments.warnings.title')}
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {review.map((warning) => (
              <WarningText key={`${warning.role}:${warning.token}`} warning={warning} code={current.code} />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t('moderation.instruments.warnings.confirmHint')}</p>
        </div>
      ) : null}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={review ? () => setReview(null) : onClose}
        >
          {review ? t('moderation.instruments.warnings.back') : t('app.cancel')}
        </Button>
        {review ? (
          <Button type="button" variant="destructive" disabled={busy} onClick={() => void persist()}>
            {save.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
            {t('moderation.instruments.warnings.confirm')}
          </Button>
        ) : (
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
            {t('app.save')}
          </Button>
        )}
      </DialogFooter>
    </form>
  )
}

export function InstrumentDialog({
  editing,
  onClose,
}: {
  editing: MarketInstrument | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" closeLabel={t('app.close')}>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t('moderation.instruments.editTitle', { code: editing.code })
              : t('moderation.instruments.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('moderation.instruments.formHint')}</DialogDescription>
        </DialogHeader>
        <InstrumentForm editing={editing} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
