export const incidentLevels = ['info', 'warning', 'critical'] as const
export type IncidentLevel = (typeof incidentLevels)[number]

export type Incident = {
  id: string
  title_id: string
  title_en: string
  body_id: string
  body_en: string
  level: IncidentLevel
  starts_at: string
  ends_at: string | null
  faq_article_id: string | null
  created_at: string
  updated_at: string
  updated_by_name: string | null
  active: boolean
  tickets: number
}

export type IncidentDraft = {
  id: string | null
  title_id: string
  title_en: string
  body_id: string
  body_en: string
  level: IncidentLevel
  starts_at: string | null
  ends_at: string | null
  faq_article_id: string | null
}

export const INCIDENT_TITLE_MIN = 3
export const INCIDENT_TITLE_MAX = 100
export const INCIDENT_BODY_MIN = 3
export const INCIDENT_BODY_MAX = 1000
