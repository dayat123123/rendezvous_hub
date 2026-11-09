import { LoaderCircleIcon, PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dot } from '@/components/badges'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/controls'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { fromJakartaInput, jakartaInput } from '@/features/community/logic'
import { useFaq } from '@/features/faq/hooks'
import { Confirm } from '@/features/nasabah/components/confirm'
import { FormError, QueryContent, SectionFrame } from '@/features/settings/components/settings-ui'
import { FieldText } from '@/features/system/components/system-ui'
import { errorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'

import { useEndIncident, useIncidents, useSaveIncident } from '../hooks'
import { incidentProblems, type IncidentForm, type IncidentProblems } from '../logic'
import {
  INCIDENT_BODY_MAX,
  INCIDENT_BODY_MIN,
  INCIDENT_TITLE_MAX,
  INCIDENT_TITLE_MIN,
  incidentLevels,
  type Incident,
  type IncidentLevel,
} from '../types'

const NO_ARTICLE = 'none'

const levelTone = { info: 'neutral', warning: 'warn', critical: 'late' } as const

function LevelText({ level }: { level: IncidentLevel }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <Dot tone={levelTone[level]} />
      {t(`help.admin.incidents.levels.${level}`)}
    </span>
  )
}

function StatusText({ incident, now }: { incident: Incident; now: Date }) {
  const { t } = useTranslation()
  if (incident.active)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
        <Dot tone="ok" />
        {t('help.admin.incidents.active')}
      </span>
    )
  const scheduled = Date.parse(incident.starts_at) > now.getTime()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Dot tone="neutral" />
      {scheduled ? t('help.admin.incidents.scheduled') : t('help.admin.incidents.ended')}
    </span>
  )
}

function emptyForm(incident: Incident | null): IncidentForm {
  return {
    title_id: incident?.title_id ?? '',
    title_en: incident?.title_en ?? '',
    body_id: incident?.body_id ?? '',
    body_en: incident?.body_en ?? '',
    level: incident?.level ?? 'warning',
    starts: jakartaInput(incident?.starts_at ?? null),
    ends: jakartaInput(incident?.ends_at ?? null),
    faq_article_id: incident?.faq_article_id ?? null,
  }
}

function useProblemText(problems: IncidentProblems) {
  const { t } = useTranslation()
  const text = (key: keyof IncidentForm) => {
    const problem = problems[key]
    if (!problem) return undefined
    if (problem === 'title')
      return t('help.admin.incidents.problems.title', { min: INCIDENT_TITLE_MIN, max: INCIDENT_TITLE_MAX })
    if (problem === 'body')
      return t('help.admin.incidents.problems.body', { min: INCIDENT_BODY_MIN, max: INCIDENT_BODY_MAX })
    if (problem === 'order') return t('help.admin.incidents.problems.order')
    return t('help.admin.incidents.problems.date')
  }
  return text
}

function IncidentDialog({ incident, onClose }: { incident: Incident | null; onClose: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  const save = useSaveIncident()
  const faq = useFaq()
  const [form, setForm] = useState<IncidentForm>(() => emptyForm(incident))
  const [checked, setChecked] = useState(false)
  const problems = incidentProblems(form)
  const problemText = useProblemText(checked ? problems : {})
  const articles = (faq.data?.articles ?? []).filter(
    (article) => article.status === 'published' || article.id === incident?.faq_article_id,
  )
  const set = <K extends keyof IncidentForm>(key: K, value: IncidentForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const field = (key: keyof IncidentForm) => ({
    id: `${id}-${key}`,
    'aria-invalid': problemText(key) ? true : undefined,
    'aria-describedby': `${id}-${key}-text`,
  })

  const submit = async () => {
    setChecked(true)
    if (Object.keys(problems).length > 0) return
    try {
      await save.mutateAsync({
        id: incident?.id ?? null,
        title_id: form.title_id.trim(),
        title_en: form.title_en.trim(),
        body_id: form.body_id.trim(),
        body_en: form.body_en.trim(),
        level: form.level,
        starts_at: form.starts.trim() === '' ? null : fromJakartaInput(form.starts.trim()),
        ends_at: form.ends.trim() === '' ? null : fromJakartaInput(form.ends.trim()),
        faq_article_id: form.faq_article_id,
      })
      toast.success(t('help.admin.incidents.saved'))
      onClose()
    } catch {
      return
    }
  }

  const texts = [
    ['title_id', 'titleId', INCIDENT_TITLE_MAX],
    ['title_en', 'titleEn', INCIDENT_TITLE_MAX],
  ] as const
  const bodies = [
    ['body_id', 'bodyId'],
    ['body_en', 'bodyEn'],
  ] as const

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        closeLabel={t('app.close')}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {incident ? t('help.admin.incidents.editTitle') : t('help.admin.incidents.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {texts.map(([key, label, max]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-${key}`}>{t(`help.admin.incidents.fields.${label}`)}</Label>
                <Input
                  {...field(key)}
                  maxLength={max}
                  value={form[key]}
                  onChange={(event) => set(key, event.target.value)}
                />
                <FieldText id={`${id}-${key}-text`} error={problemText(key)} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {bodies.map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-${key}`}>{t(`help.admin.incidents.fields.${label}`)}</Label>
                <Textarea
                  {...field(key)}
                  rows={4}
                  maxLength={INCIDENT_BODY_MAX}
                  value={form[key]}
                  onChange={(event) => set(key, event.target.value)}
                />
                <FieldText id={`${id}-${key}-text`} error={problemText(key)} />
              </div>
            ))}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t('help.admin.incidents.fields.level')}</legend>
            <RadioGroup
              value={form.level}
              onValueChange={(value) => set('level', value as IncidentLevel)}
              className="flex flex-wrap gap-x-5 gap-y-2"
            >
              {incidentLevels.map((level) => (
                <label key={level} className="flex items-center gap-2 text-row">
                  <RadioGroupItem value={level} />
                  {t(`help.admin.incidents.levels.${level}`)}
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-starts`}>{t('help.admin.incidents.fields.starts')}</Label>
              <Input
                {...field('starts')}
                type="datetime-local"
                value={form.starts}
                onChange={(event) => set('starts', event.target.value)}
              />
              <FieldText
                id={`${id}-starts-text`}
                error={problemText('starts')}
                hint={t('help.admin.incidents.hints.starts')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-ends`}>{t('help.admin.incidents.fields.ends')}</Label>
              <Input
                {...field('ends')}
                type="datetime-local"
                value={form.ends}
                onChange={(event) => set('ends', event.target.value)}
              />
              <FieldText
                id={`${id}-ends-text`}
                error={problemText('ends')}
                hint={t('help.admin.incidents.hints.ends')}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-faq`}>{t('help.admin.incidents.fields.faq')}</Label>
            <Select
              value={form.faq_article_id ?? NO_ARTICLE}
              onValueChange={(value) => set('faq_article_id', value === NO_ARTICLE ? null : value)}
            >
              <SelectTrigger id={`${id}-faq`} className="w-full" aria-describedby={`${id}-faq-text`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ARTICLE}>{t('help.admin.incidents.noArticle')}</SelectItem>
                {articles.map((article) => (
                  <SelectItem key={article.id} value={article.id}>
                    {article.question_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldText id={`${id}-faq-text`} hint={t('help.admin.incidents.hints.faq')} />
          </div>
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

function IncidentsTable({
  items,
  onEdit,
  onEnd,
}: {
  items: Incident[]
  onEdit: (incident: Incident) => void
  onEnd: (incident: Incident) => void
}) {
  const { t } = useTranslation()
  const now = new Date()
  if (items.length === 0) return <EmptyState title={t('help.admin.incidents.empty')} />
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('help.admin.incidents.columns.title')}</TableHead>
          <TableHead>{t('help.admin.incidents.columns.level')}</TableHead>
          <TableHead>{t('help.admin.incidents.columns.window')}</TableHead>
          <TableHead>{t('help.admin.incidents.columns.status')}</TableHead>
          <TableHead className="text-right">{t('help.admin.incidents.columns.tickets')}</TableHead>
          <TableHead>{t('help.admin.incidents.columns.updated')}</TableHead>
          <TableHead>
            <span className="sr-only">{t('help.admin.incidents.columns.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((incident) => (
          <TableRow key={incident.id}>
            <TableCell className="max-w-72">
              <span className="block truncate font-medium">{incident.title_id}</span>
              <span className="block truncate text-xs text-muted-foreground">{incident.title_en}</span>
            </TableCell>
            <TableCell>
              <LevelText level={incident.level} />
            </TableCell>
            <TableCell className="tabular text-xs">
              {stamp(incident.starts_at)} –{' '}
              {incident.ends_at ? stamp(incident.ends_at) : t('help.admin.incidents.untilEnded')}
            </TableCell>
            <TableCell>
              <StatusText incident={incident} now={now} />
            </TableCell>
            <TableCell className="tabular text-right">{formatNumber(incident.tickets)}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {stamp(incident.updated_at)}
              {incident.updated_by_name ? ` · ${incident.updated_by_name}` : ''}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              <Button
                variant="ghost"
                size="xs"
                aria-label={t('help.admin.incidents.editNamed', { title: incident.title_id })}
                onClick={() => onEdit(incident)}
              >
                {t('app.edit')}
              </Button>
              {incident.active || Date.parse(incident.starts_at) > now.getTime() ? (
                <Button
                  variant="ghost"
                  size="xs"
                  aria-label={t('help.admin.incidents.endNamed', { title: incident.title_id })}
                  onClick={() => onEnd(incident)}
                >
                  {t('help.admin.incidents.endNow')}
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function IncidentsSection() {
  const { t } = useTranslation()
  const incidents = useIncidents()
  const end = useEndIncident()
  const [editing, setEditing] = useState<{ incident: Incident | null; key: number } | null>(null)
  const [ending, setEnding] = useState<Incident | null>(null)
  return (
    <SectionFrame
      title={t('help.admin.incidents.title')}
      description={t('help.admin.incidents.description')}
      action={
        <Button onClick={() => setEditing({ incident: null, key: Date.now() })}>
          <PlusIcon />
          {t('help.admin.incidents.add')}
        </Button>
      }
    >
      <QueryContent query={incidents}>
        {(items) => (
          <IncidentsTable
            items={items}
            onEdit={(incident) => setEditing({ incident, key: Date.now() })}
            onEnd={setEnding}
          />
        )}
      </QueryContent>
      {editing ? (
        <IncidentDialog key={editing.key} incident={editing.incident} onClose={() => setEditing(null)} />
      ) : null}
      <Confirm
        open={ending !== null}
        title={t('help.admin.incidents.endTitle')}
        body={t('help.admin.incidents.endBody', { title: ending?.title_id ?? '' })}
        action={t('help.admin.incidents.endNow')}
        destructive
        pending={end.isPending}
        onClose={() => setEnding(null)}
        onConfirm={() => {
          if (!ending) return
          end.mutate(ending.id, {
            onSuccess: () => {
              toast.success(t('help.admin.incidents.endedToast'))
              setEnding(null)
            },
            onError: (error) => {
              toast.error(errorText(error))
              setEnding(null)
            },
          })
        }}
      />
    </SectionFrame>
  )
}
