import { toCsv } from './csv'
import type {
  DateRange,
  HelpArticleRow,
  HelpMissRow,
  HelpTopicRow,
  RatingReasonByAgent,
  RatingReasonByTopic,
} from './types'

export type HelpCsvKind = 'topics' | 'articles' | 'misses' | 'reasons-topic' | 'reasons-agent'

export function helpCsvName(kind: HelpCsvKind, range: DateRange) {
  const prefix = kind.startsWith('reasons') ? 'laporan-alasan' : 'laporan-bantuan'
  const suffix = kind.replace('reasons-', '')
  const name = { topics: 'topik', articles: 'artikel', misses: 'pencarian', topic: 'topik', agent: 'cs' }[
    suffix
  ]
  return `${prefix}-${name ?? suffix}-${range.from}-${range.to}.csv`
}

export function helpTopicsCsv(rows: HelpTopicRow[], headers: string[]) {
  return toCsv([
    headers,
    ...rows.map((row) => [
      row.topic,
      row.name,
      row.tickets,
      row.median_first_response_minutes,
      row.median_resolution_minutes,
    ]),
  ])
}

export function helpArticlesCsv(rows: HelpArticleRow[], headers: string[]) {
  return toCsv([
    headers,
    ...rows.map((row) => [
      row.question,
      row.readers,
      row.helpful,
      row.not_helpful,
      row.helpful_percent,
      row.tickets_after,
      row.prevented,
    ]),
  ])
}

export function helpMissesCsv(rows: HelpMissRow[], headers: string[]) {
  return toCsv([headers, ...rows.map((row) => [row.query, row.language, row.count])])
}

export function reasonsByTopicCsv(
  rows: RatingReasonByTopic[],
  headers: string[],
  topicName: (code: string) => string,
  reasonName: (code: string) => string,
) {
  return toCsv([
    headers,
    ...rows.map((row) => [row.topic, topicName(row.topic), row.reason, reasonName(row.reason), row.count]),
  ])
}

export function reasonsByAgentCsv(
  rows: RatingReasonByAgent[],
  headers: string[],
  reasonName: (code: string) => string,
) {
  return toCsv([
    headers,
    ...rows.map((row) => [row.agent_name, row.reason, reasonName(row.reason), row.count]),
  ])
}
