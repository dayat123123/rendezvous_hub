export type ComplianceNotice = {
  id: number
  ticket_id: string
  ticket_number: string
  flag: 'complaint' | 'fraud'
  reason: string | null
  source: 'agent' | 'customer' | 'system'
  actor_name: string | null
  created_at: string
  seen: boolean
}

export type ComplianceNotices = { unseen: number; last_seen_id: number; items: ComplianceNotice[] }
