import { rpc } from '@/lib/supabase'

import {
  emptyStats,
  type CustomerReport,
  type CustomerTrail,
  type DateRange,
  type HelpReport,
  type RatingReasons,
  type ReportSummary,
} from './types'

export const reportsApi = {
  summary: async (range: DateRange): Promise<ReportSummary> => {
    const raw = await rpc<Partial<ReportSummary>>('report_summary', { p_from: range.from, p_to: range.to })
    return {
      from: raw.from ?? range.from,
      to: raw.to ?? range.to,
      totals: { ...emptyStats, ...raw.totals },
      daily: (raw.daily ?? []).map((day) => ({ ...emptyStats, ...day })),
      agents: raw.agents ?? [],
      topics: raw.topics ?? [],
    }
  },
  customers: (range: DateRange, search: string) =>
    rpc<CustomerReport[]>('report_customers', {
      p_from: range.from,
      p_to: range.to,
      p_search: search.trim() === '' ? null : search.trim(),
    }),
  customerTrail: (customerId: string, range: DateRange) =>
    rpc<CustomerTrail>('report_customer_trail', {
      p_customer_id: customerId,
      p_from: range.from,
      p_to: range.to,
    }),
  ratingReasons: async (range: DateRange): Promise<RatingReasons> => {
    const raw = await rpc<Partial<RatingReasons>>('admin_rating_reasons', {
      p_from: range.from,
      p_to: range.to,
    })
    return { by_topic: raw.by_topic ?? [], by_agent: raw.by_agent ?? [] }
  },
  helpReport: async (range: DateRange): Promise<HelpReport> => {
    const raw = await rpc<Partial<HelpReport>>('admin_help_report', { p_from: range.from, p_to: range.to })
    return {
      from: raw.from ?? range.from,
      to: raw.to ?? range.to,
      topics: raw.topics ?? [],
      articles: raw.articles ?? [],
      misses: raw.misses ?? [],
    }
  },
}
