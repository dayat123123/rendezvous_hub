import { cleanStock, stockCodePattern } from '../logic'
import {
  INSTRUMENT_ALIASES_MAX,
  INSTRUMENT_DESCRIPTION_MAX,
  INSTRUMENT_NAME_MAX,
  type InstrumentCheck,
  type InstrumentDraft,
  type InstrumentWarning,
  type MarketInstrument,
} from './types'

export function instrumentDraft(item: MarketInstrument | null): InstrumentDraft {
  return {
    code: item?.code ?? '',
    name: item?.name ?? '',
    aliases: item?.aliases ?? [],
    description: item?.description ?? null,
    enabled: item?.enabled ?? true,
    room_enabled: item?.room_enabled ?? true,
  }
}

export function parseAliases(text: string) {
  return text
    .split(/[\s,;]+/)
    .map(cleanStock)
    .filter((item) => item !== '')
}

export function mergeAliases(current: readonly string[], added: readonly string[]) {
  return [...new Set([...current, ...added])]
}

export function cleanInstrumentDraft(draft: InstrumentDraft, pending = ''): InstrumentDraft {
  const description = (draft.description ?? '').trim()
  const code = cleanStock(draft.code)
  return {
    ...draft,
    code,
    name: draft.name.trim(),
    aliases: mergeAliases(draft.aliases.map(cleanStock), parseAliases(pending)),
    description: description === '' ? null : description,
  }
}

export type InstrumentProblems = {
  code?: 'format'
  name?: 'required' | 'length'
  description?: 'length'
  aliases?: 'format' | 'max' | 'self'
}

export function instrumentProblems(draft: InstrumentDraft, creating: boolean): InstrumentProblems {
  const problems: InstrumentProblems = {}
  if (creating && !stockCodePattern.test(draft.code)) problems.code = 'format'
  if (draft.name === '') problems.name = 'required'
  else if (draft.name.length > INSTRUMENT_NAME_MAX) problems.name = 'length'
  if ((draft.description ?? '').length > INSTRUMENT_DESCRIPTION_MAX) problems.description = 'length'
  if (draft.aliases.some((alias) => !stockCodePattern.test(alias))) problems.aliases = 'format'
  else if (draft.aliases.includes(draft.code)) problems.aliases = 'self'
  else if (draft.aliases.length > INSTRUMENT_ALIASES_MAX) problems.aliases = 'max'
  return problems
}

export function collisionWarnings(
  checks: readonly InstrumentCheck[],
  editing: Pick<MarketInstrument, 'code'> | null,
): InstrumentWarning[] {
  const own = editing?.code ?? null
  return checks.flatMap((entry) => {
    if (own !== null && (entry.role === 'code' || entry.alias_of === own)) return []
    const warning: InstrumentWarning = {
      token: entry.code,
      role: entry.role,
      posts: entry.posts,
      watchers: entry.watchers,
      room: entry.room_id !== null,
      roomMembers: entry.room_members,
      instrument: entry.instrument !== null && entry.instrument !== own ? entry.instrument : null,
      aliasOf: entry.alias_of !== null && entry.alias_of !== own ? entry.alias_of : null,
      stockFormat: entry.stock_format,
    }
    const risky =
      warning.posts > 0 ||
      warning.watchers > 0 ||
      warning.room ||
      warning.instrument !== null ||
      warning.aliasOf !== null ||
      warning.stockFormat
    return risky ? [warning] : []
  })
}

export function listText(items: readonly string[], language: string) {
  return new Intl.ListFormat(language, { type: 'conjunction' }).format(items)
}
