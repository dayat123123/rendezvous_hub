import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LockedForm } from '@/components/locked-form'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/controls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FieldMessage,
  FormError,
  QueryContent,
  SectionFrame,
  SettingsCard,
} from '@/features/settings/components/settings-ui'
import { useLockedEdit } from '@/hooks/use-locked-edit'
import { stamp } from '@/lib/time'

import { useSaveSurveyConfig, useSurveyConfig } from '../hooks'
import { surveyConfig, surveyDraft, surveyProblems, surveyValid, type SurveyDraft } from '../logic'
import {
  SURVEY_LOW_MAX,
  SURVEY_LOW_MIN,
  SURVEY_QUESTION_MAX,
  SURVEY_QUESTION_MIN,
  SURVEY_REASON_MAX,
  SURVEY_REASON_MIN,
  SURVEY_REASONS_MAX,
  type AdminSurveyConfig,
  type SurveyReason,
} from '../types'

const scales = [3, 5] as const

function LastChanged({ data }: { data: AdminSurveyConfig }) {
  const { t } = useTranslation()
  if (!data.updated_at) return null
  return (
    <p className="text-xs text-muted-foreground">
      {data.updated_by
        ? t('settings.lastChangedBy', { time: stamp(data.updated_at), name: data.updated_by })
        : t('settings.lastChanged', { time: stamp(data.updated_at) })}
    </p>
  )
}

function SurveyForm({ data }: { data: AdminSurveyConfig }) {
  const { t } = useTranslation()
  const id = useId()
  const save = useSaveSurveyConfig()
  const lock = useLockedEdit()
  const [draft, setDraft] = useState<SurveyDraft>(() => surveyDraft(data.config))
  const [touched, setTouched] = useState(false)
  const problems = surveyProblems(draft)
  const shown = touched ? problems : { reasons: [] }
  const set = <K extends keyof SurveyDraft>(key: K, value: SurveyDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))
  const setReason = (index: number, key: keyof SurveyReason, value: string) =>
    setDraft((current) => ({
      ...current,
      reasons: current.reasons.map((reason, position) =>
        position === index ? { ...reason, [key]: value } : reason,
      ),
    }))
  const questions = [
    ['question_id', 'questionId'],
    ['question_en', 'questionEn'],
  ] as const
  return (
    <LockedForm
      lock={lock}
      name={t('help.admin.survey.title')}
      className="flex flex-col gap-4"
      confirmTitle={t('help.admin.survey.confirmTitle')}
      confirmBody={t('help.admin.survey.confirmBody', {
        scale: draft.scale,
        low: draft.low_max.trim(),
        reasons: draft.reasons.length,
      })}
      saving={save.isPending}
      onCheck={() => {
        setTouched(true)
        return surveyValid(problems)
      }}
      onReset={() => {
        setDraft(surveyDraft(data.config))
        setTouched(false)
      }}
      onSave={() => save.mutateAsync(surveyConfig(draft))}
      status={<LastChanged data={data} />}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {questions.map(([key, label]) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-${key}`}>{t(`help.admin.survey.${label}`)}</Label>
            <Input
              id={`${id}-${key}`}
              maxLength={SURVEY_QUESTION_MAX}
              value={draft[key]}
              aria-invalid={shown[key] ? true : undefined}
              onChange={(event) => set(key, event.target.value)}
            />
            <FieldMessage
              error={
                shown[key]
                  ? t('help.admin.survey.questionInvalid', {
                      min: SURVEY_QUESTION_MIN,
                      max: SURVEY_QUESTION_MAX,
                    })
                  : undefined
              }
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">{t('help.admin.survey.scale')}</legend>
          <RadioGroup
            value={String(draft.scale)}
            disabled={!lock.editing}
            onValueChange={(value) => set('scale', value === '3' ? 3 : 5)}
            className="flex gap-5"
          >
            {scales.map((scale) => (
              <label key={scale} className="flex items-center gap-2 text-row">
                <RadioGroupItem value={String(scale)} />
                {t(scale === 3 ? 'help.admin.survey.scales.three' : 'help.admin.survey.scales.five')}
              </label>
            ))}
          </RadioGroup>
        </fieldset>
        <div className="flex w-64 flex-col gap-1.5">
          <Label htmlFor={`${id}-low`}>{t('help.admin.survey.lowMax')}</Label>
          <Input
            id={`${id}-low`}
            inputMode="numeric"
            maxLength={1}
            value={draft.low_max}
            aria-invalid={shown.low_max ? true : undefined}
            onChange={(event) => set('low_max', event.target.value)}
          />
          <FieldMessage
            error={
              shown.low_max
                ? t('settings.numberRange', { min: SURVEY_LOW_MIN, max: SURVEY_LOW_MAX })
                : undefined
            }
            hint={t('help.admin.survey.lowMaxHint')}
          />
        </div>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          {t('help.admin.survey.reasons', { used: draft.reasons.length, max: SURVEY_REASONS_MAX })}
        </legend>
        <p className="text-xs text-muted-foreground">{t('help.admin.survey.reasonsHint')}</p>
        {draft.reasons.map((reason, index) => {
          const problem = shown.reasons[index] ?? {}
          const number = index + 1
          return (
            <div key={index} className="flex flex-col gap-1">
              <div className="grid grid-cols-[10rem_1fr_1fr_auto] items-center gap-2">
                <Input
                  aria-label={t('help.admin.survey.reasonCode', { number })}
                  maxLength={32}
                  className="font-mono text-xs"
                  value={reason.code}
                  aria-invalid={problem.code ? true : undefined}
                  onChange={(event) => setReason(index, 'code', event.target.value)}
                />
                <Input
                  aria-label={t('help.admin.survey.reasonId', { number })}
                  maxLength={SURVEY_REASON_MAX}
                  value={reason.id}
                  aria-invalid={problem.id ? true : undefined}
                  onChange={(event) => setReason(index, 'id', event.target.value)}
                />
                <Input
                  aria-label={t('help.admin.survey.reasonEn', { number })}
                  maxLength={SURVEY_REASON_MAX}
                  value={reason.en}
                  aria-invalid={problem.en ? true : undefined}
                  onChange={(event) => setReason(index, 'en', event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('help.admin.survey.removeReason', { number })}
                  onClick={() =>
                    set(
                      'reasons',
                      draft.reasons.filter((_, position) => position !== index),
                    )
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
              {problem.code || problem.id || problem.en ? (
                <FieldMessage
                  error={
                    problem.code
                      ? t('help.admin.survey.codeInvalid')
                      : t('help.admin.survey.labelInvalid', {
                          min: SURVEY_REASON_MIN,
                          max: SURVEY_REASON_MAX,
                        })
                  }
                />
              ) : null}
            </div>
          )
        })}
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={draft.reasons.length >= SURVEY_REASONS_MAX}
            onClick={() => set('reasons', [...draft.reasons, { code: '', id: '', en: '' }])}
          >
            <PlusIcon />
            {t('help.admin.survey.addReason')}
          </Button>
        </div>
      </fieldset>
      <FormError error={save.error} />
    </LockedForm>
  )
}

export function SurveySection() {
  const { t } = useTranslation()
  const config = useSurveyConfig()
  return (
    <SectionFrame title={t('help.admin.survey.title')} description={t('help.admin.survey.description')}>
      <QueryContent query={config}>
        {(data) => (
          <SettingsCard title={t('help.admin.survey.cardTitle')}>
            <SurveyForm key={data.updated_at ?? 'initial'} data={data} />
          </SettingsCard>
        )}
      </QueryContent>
    </SectionFrame>
  )
}
