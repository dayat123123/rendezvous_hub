import type { CustomerReply, IntakeField, IntakeOption, TopicConfig, TopicExtras } from './types'

export const MAX_INTAKE = 8
export const MAX_OPTIONS = 10
export const MAX_REPLIES = 6
export const MAX_REPLY = 40
export const MAX_SOP = 4000

export type ExtrasProblem =
  | 'key'
  | 'keyDuplicate'
  | 'label'
  | 'options'
  | 'optionValue'
  | 'optionDuplicate'
  | 'optionLabel'
  | 'reply'
  | 'sop'

export type ExtrasProblems = Record<string, ExtrasProblem>

const keyPattern = /^[a-z][a-z0-9_]{1,31}$/
const valuePattern = /^[a-z0-9_]{1,32}$/

const within = (text: string, min: number, max: number) => {
  const length = text.trim().length
  return length >= min && length <= max
}

export function topicExtras(topic: Pick<TopicConfig, 'intake' | 'customer_replies' | 'sop'>): TopicExtras {
  return {
    intake: (topic.intake ?? []).map((field) => ({ ...field, options: field.options ?? [] })),
    customer_replies: topic.customer_replies ?? [],
    sop: topic.sop ?? null,
  }
}

export const emptyField = (): IntakeField => ({
  key: '',
  type: 'text',
  label_id: '',
  label_en: '',
  required: false,
  options: [],
})

export const emptyOption = (): IntakeOption => ({ value: '', label_id: '', label_en: '' })

export const emptyReply = (): CustomerReply => ({ id: '', en: '' })

function fieldProblems(field: IntakeField, index: number, keys: Set<string>, problems: ExtrasProblems) {
  const key = field.key.trim()
  if (!keyPattern.test(key)) problems[`intake.${index}.key`] = 'key'
  else if (keys.has(key)) problems[`intake.${index}.key`] = 'keyDuplicate'
  keys.add(key)
  if (!within(field.label_id, 2, 80)) problems[`intake.${index}.label_id`] = 'label'
  if (!within(field.label_en, 2, 80)) problems[`intake.${index}.label_en`] = 'label'
  if (field.type !== 'choice') return
  if (field.options.length < 2 || field.options.length > MAX_OPTIONS)
    problems[`intake.${index}.options`] = 'options'
  const values = new Set<string>()
  field.options.forEach((option, position) => {
    const path = `intake.${index}.options.${position}`
    const value = option.value.trim()
    if (!valuePattern.test(value)) problems[`${path}.value`] = 'optionValue'
    else if (values.has(value)) problems[`${path}.value`] = 'optionDuplicate'
    values.add(value)
    if (!within(option.label_id, 1, 60)) problems[`${path}.label_id`] = 'optionLabel'
    if (!within(option.label_en, 1, 60)) problems[`${path}.label_en`] = 'optionLabel'
  })
}

export function extrasProblems(extras: TopicExtras): ExtrasProblems {
  const problems: ExtrasProblems = {}
  const keys = new Set<string>()
  extras.intake.forEach((field, index) => fieldProblems(field, index, keys, problems))
  extras.customer_replies.forEach((reply, index) => {
    if (!within(reply.id, 1, MAX_REPLY)) problems[`replies.${index}.id`] = 'reply'
    if (!within(reply.en, 1, MAX_REPLY)) problems[`replies.${index}.en`] = 'reply'
  })
  if ((extras.sop ?? '').trim().length > MAX_SOP) problems.sop = 'sop'
  return problems
}

export function cleanExtras(extras: TopicExtras): TopicExtras {
  const sop = (extras.sop ?? '').trim()
  return {
    intake: extras.intake.map((field) => ({
      key: field.key.trim(),
      type: field.type,
      label_id: field.label_id.trim(),
      label_en: field.label_en.trim(),
      required: field.required,
      options:
        field.type === 'choice'
          ? field.options.map((option) => ({
              value: option.value.trim(),
              label_id: option.label_id.trim(),
              label_en: option.label_en.trim(),
            }))
          : [],
    })),
    customer_replies: extras.customer_replies.map((reply) => ({ id: reply.id.trim(), en: reply.en.trim() })),
    sop: sop === '' ? null : sop,
  }
}
