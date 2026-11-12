import {
  FEED_FILTER_LABEL_MAX,
  feedFilterIconPattern,
  feedFilterKeyPattern,
  type FeedFilter,
  type FeedFilterDraft,
} from './types'

export function feedFilterDraft(filter: FeedFilter | null): FeedFilterDraft {
  return {
    key: filter?.key ?? '',
    label_en: filter?.label_en ?? '',
    label_id: filter?.label_id ?? '',
    sort: filter?.sort ?? 'latest',
    content: filter?.content ?? null,
    icon: filter?.icon ?? null,
    enabled: filter?.enabled ?? true,
  }
}

export function cleanFeedFilterDraft(draft: FeedFilterDraft): FeedFilterDraft {
  const icon = (draft.icon ?? '').trim().toLowerCase()
  return {
    ...draft,
    key: draft.key.trim().toLowerCase(),
    label_en: draft.label_en.trim(),
    label_id: draft.label_id.trim(),
    icon: icon === '' ? null : icon,
  }
}

export type LabelProblem = 'required' | 'length'

export type FeedFilterProblems = {
  key?: 'format' | 'taken'
  labelEn?: LabelProblem
  labelId?: LabelProblem
  icon?: 'format'
}

const labelProblem = (value: string): LabelProblem | undefined =>
  value === '' ? 'required' : value.length > FEED_FILTER_LABEL_MAX ? 'length' : undefined

export function feedFilterProblems(
  draft: FeedFilterDraft,
  options: { creating: boolean; keys: readonly string[] },
): FeedFilterProblems {
  const problems: FeedFilterProblems = {}
  if (options.creating) {
    if (!feedFilterKeyPattern.test(draft.key)) problems.key = 'format'
    else if (options.keys.includes(draft.key)) problems.key = 'taken'
  }
  const en = labelProblem(draft.label_en)
  if (en) problems.labelEn = en
  const id = labelProblem(draft.label_id)
  if (id) problems.labelId = id
  if (draft.icon !== null && !feedFilterIconPattern.test(draft.icon)) problems.icon = 'format'
  return problems
}
