export type SurveyReason = { code: string; id: string; en: string }

export type SurveyConfig = {
  question: { id: string; en: string }
  scale: 3 | 5
  low_max: number
  reasons: SurveyReason[]
}

export type AdminSurveyConfig = {
  config: Partial<SurveyConfig>
  updated_at: string | null
  updated_by: string | null
}

export const SURVEY_QUESTION_MIN = 5
export const SURVEY_QUESTION_MAX = 120
export const SURVEY_REASON_MIN = 2
export const SURVEY_REASON_MAX = 60
export const SURVEY_REASONS_MAX = 8
export const SURVEY_LOW_MIN = 1
export const SURVEY_LOW_MAX = 4
