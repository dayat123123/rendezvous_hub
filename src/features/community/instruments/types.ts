import type { StaffRef } from '../types'

export const INSTRUMENT_NAME_MAX = 80
export const INSTRUMENT_DESCRIPTION_MAX = 300
export const INSTRUMENT_ALIASES_MAX = 10

export type InstrumentUsage = {
  code: string
  posts: number
  posts_7d: number
  watchers: number
  room_id: string | null
  room_members: number
}

export type MarketInstrument = {
  code: string
  kind: 'index'
  name: string
  description: string | null
  aliases: string[]
  position: number
  enabled: boolean
  room_enabled: boolean
  created_at: string
  updated_at: string
  updated_by: StaffRef
  usage: InstrumentUsage
}

export type InstrumentCheck = InstrumentUsage & {
  role: 'code' | 'alias'
  valid: boolean
  instrument: string | null
  alias_of: string | null
  stock_format: boolean
}

export type InstrumentDraft = {
  code: string
  name: string
  aliases: string[]
  description: string | null
  enabled: boolean
  room_enabled: boolean
}

export type InstrumentWarning = {
  token: string
  role: 'code' | 'alias'
  posts: number
  watchers: number
  room: boolean
  roomMembers: number
  instrument: string | null
  aliasOf: string | null
  stockFormat: boolean
}
