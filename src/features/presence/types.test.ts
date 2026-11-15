import { describe, expect, it } from 'vitest'

import { agentFixture } from '@/test/fixtures'

import {
  actionBlock,
  canManageFeatures,
  canManageTradeShare,
  canOpenTradeShare,
  canOperateRelay,
  canReviewTradeShare,
  canViewTickets,
  isMonitor,
  isSuperAdmin,
  normalizeAgent,
  worksTickets,
  type AgentProfile,
  type AgentStatus,
} from './types'

describe('staff roles', () => {
  it('lets only agents work tickets while Super Admins watch them', () => {
    const agent = { roles: ['cs_agent'] }
    const monitor = { roles: ['cs_super_admin'] }
    const both = { roles: ['cs_agent', 'cs_super_admin'] }
    const compliance = { roles: ['compliance'] }

    expect([agent, monitor, both, compliance].map(worksTickets)).toEqual([true, false, true, false])
    expect([agent, monitor, both, compliance].map(canViewTickets)).toEqual([true, true, true, false])
    expect([agent, monitor, both, compliance].map(isMonitor)).toEqual([false, true, false, false])
    expect([agent, monitor, both, compliance].map(isSuperAdmin)).toEqual([false, true, true, false])
  })
})

describe('trade permissions', () => {
  it('reads trade_permissions from agent_me and gates each Berbagi Trade area', () => {
    const raw = { ...agentFixture, trade_permissions: undefined } as unknown as AgentProfile
    expect(normalizeAgent(raw).trade_permissions).toEqual([])

    const reviewer = { roles: ['compliance'], trade_permissions: ['trade_share.review'] }
    const manager = { roles: ['community'], trade_permissions: ['trade_share.manage'] }
    const operator = { roles: ['cs_agent'], trade_permissions: ['trade_relay.operate'] }
    const admin = { roles: ['cs_super_admin'], trade_permissions: [] }
    const plain = { roles: ['compliance'], trade_permissions: [] }
    const all = [reviewer, manager, operator, admin, plain]

    expect(all.map(canOpenTradeShare)).toEqual([true, true, false, true, false])
    expect(all.map(canReviewTradeShare)).toEqual([true, false, false, true, false])
    expect(all.map(canManageTradeShare)).toEqual([false, true, false, true, false])
    expect(all.map(canOperateRelay)).toEqual([false, false, true, true, false])
  })
})

describe('canManageFeatures', () => {
  it('opens Fitur & Kampanye to Super Admins and the product role only', () => {
    const roles = [
      ['cs_super_admin'],
      ['product'],
      ['cs_agent', 'product'],
      ['cs_agent'],
      ['compliance'],
      ['community'],
    ]
    expect(roles.map((value) => canManageFeatures({ roles: value }))).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ])
  })

  it('does not make the product role a Super Admin or a ticket worker', () => {
    const product = { roles: ['product'] }
    expect([isSuperAdmin(product), canViewTickets(product), worksTickets(product)]).toEqual([
      false,
      false,
      false,
    ])
  })
})

describe('actionBlock', () => {
  const statuses: AgentStatus[] = ['online', 'busy', 'break', 'offline']
  const agent = (status: AgentStatus, active_tickets = 1) => ({
    status,
    active_tickets,
    max_active_tickets: 3,
  })

  it('requires Online status and a free slot to take tickets or accept transfers', () => {
    for (const action of ['claim', 'acceptTransfer'] as const) {
      expect(statuses.map((status) => actionBlock(agent(status), action))).toEqual([
        null,
        'needOnline',
        'needOnline',
        'needOnline',
      ])
      expect(actionBlock(agent('online', 3), action)).toBe('capacity')
      expect(actionBlock(agent('offline', 3), action)).toBe('needOnline')
    }
  })

  it('blocks replies to customers only while Offline', () => {
    expect(statuses.map((status) => actionBlock(agent(status), 'reply'))).toEqual([
      null,
      null,
      null,
      'offline',
    ])
    expect(actionBlock(agent('online', 3), 'reply')).toBeNull()
  })
})
