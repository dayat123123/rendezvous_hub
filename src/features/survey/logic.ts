import {
  SURVEY_LOW_MAX,
  SURVEY_LOW_MIN,
  SURVEY_QUESTION_MAX,
  SURVEY_QUESTION_MIN,
  SURVEY_REASON_MAX,
  SURVEY_REASON_MIN,
  SURVEY_REASONS_MAX,
  type SurveyConfig,
  type SurveyReason,
} from './types'

export type SurveyDraft = {
  question_id: string
  question_en: string
  scale: 3 | 5
  low_max: string
  reasons: SurveyReason[]
}

export type SurveyProblems = {
  question_id?: boolean
  question_en?: boolean
  low_max?: boolean
  reasons: Partial<Record<keyof SurveyReason, boolean>>[]
  tooMany?: boolean
}

const codePattern = /^[a-z][a-z0-9_]{1,31}$/

const within = (value: string, min: number, max: number) => {
  const length = value.trim().length
  return length >= min && length <= max
}

export function surveyDraft(config: Partial<SurveyConfig>): SurveyDraft {
  return {
    question_id: config.question?.id ?? '',
    question_en: config.question?.en ?? '',
    scale: config.scale === 3 ? 3 : 5,
    low_max: String(config.low_max ?? 2),
    reasons: (config.reasons ?? []).map((reason) => ({ ...reason })),
  }
}

export function surveyProblems(draft: SurveyDraft): SurveyProblems {
  const codes = draft.reasons.map((reason) => reason.code.trim())
  const low = draft.low_max.trim()
  return {
    question_id: !within(draft.question_id, SURVEY_QUESTION_MIN, SURVEY_QUESTION_MAX) || undefined,
    question_en: !within(draft.question_en, SURVEY_QUESTION_MIN, SURVEY_QUESTION_MAX) || undefined,
    low_max:
      !(/^\d$/.test(low) && Number(low) >= SURVEY_LOW_MIN && Number(low) <= SURVEY_LOW_MAX) || undefined,
    tooMany: draft.reasons.length > SURVEY_REASONS_MAX || undefined,
    reasons: draft.reasons.map((reason, index) => {
      const code = codes[index] ?? ''
      const problems: Partial<Record<keyof SurveyReason, boolean>> = {}
      if (!codePattern.test(code) || codes.indexOf(code) !== index) problems.code = true
      if (!within(reason.id, SURVEY_REASON_MIN, SURVEY_REASON_MAX)) problems.id = true
      if (!within(reason.en, SURVEY_REASON_MIN, SURVEY_REASON_MAX)) problems.en = true
      return problems
    }),
  }
}

export function surveyValid(problems: SurveyProblems) {
  return (
    !problems.question_id &&
    !problems.question_en &&
    !problems.low_max &&
    !problems.tooMany &&
    problems.reasons.every((reason) => Object.keys(reason).length === 0)
  )
}

export function surveyConfig(draft: SurveyDraft): SurveyConfig {
  return {
    question: { id: draft.question_id.trim(), en: draft.question_en.trim() },
    scale: draft.scale,
    low_max: Number(draft.low_max.trim()),
    reasons: draft.reasons.map((reason) => ({
      code: reason.code.trim(),
      id: reason.id.trim(),
      en: reason.en.trim(),
    })),
  }
}

export function reasonLabel(reasons: SurveyReason[] | undefined, code: string, language: string) {
  const reason = reasons?.find((item) => item.code === code)
  if (!reason) return code
  return language.startsWith('en') ? reason.en : reason.id
}
