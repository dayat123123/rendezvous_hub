import { fromJakartaInput } from '@/features/community/logic'

import {
  INCIDENT_BODY_MAX,
  INCIDENT_BODY_MIN,
  INCIDENT_TITLE_MAX,
  INCIDENT_TITLE_MIN,
  type IncidentLevel,
} from './types'

export type IncidentForm = {
  title_id: string
  title_en: string
  body_id: string
  body_en: string
  level: IncidentLevel
  starts: string
  ends: string
  faq_article_id: string | null
}

export type IncidentProblem = 'title' | 'body' | 'date' | 'order'
export type IncidentProblems = Partial<Record<keyof IncidentForm, IncidentProblem>>

const within = (value: string, min: number, max: number) => {
  const length = value.trim().length
  return length >= min && length <= max
}

export function incidentProblems(form: IncidentForm, now: Date = new Date()): IncidentProblems {
  const problems: IncidentProblems = {}
  if (!within(form.title_id, INCIDENT_TITLE_MIN, INCIDENT_TITLE_MAX)) problems.title_id = 'title'
  if (!within(form.title_en, INCIDENT_TITLE_MIN, INCIDENT_TITLE_MAX)) problems.title_en = 'title'
  if (!within(form.body_id, INCIDENT_BODY_MIN, INCIDENT_BODY_MAX)) problems.body_id = 'body'
  if (!within(form.body_en, INCIDENT_BODY_MIN, INCIDENT_BODY_MAX)) problems.body_en = 'body'
  const starts = form.starts.trim() === '' ? null : fromJakartaInput(form.starts.trim())
  const ends = form.ends.trim() === '' ? null : fromJakartaInput(form.ends.trim())
  if (form.starts.trim() !== '' && !starts) problems.starts = 'date'
  if (form.ends.trim() !== '' && !ends) problems.ends = 'date'
  else if (ends && ends <= (starts ?? now.toISOString())) problems.ends = 'order'
  return problems
}
