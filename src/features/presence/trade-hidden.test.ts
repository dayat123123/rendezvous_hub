import { describe, expect, it } from 'vitest'

import { settingsSections, visibleSettingsSections } from '@/features/settings/types'
import { superAdminTabs } from '@/features/system/types'
import { SHOW_TRADE_SHARE } from '@/lib/nav-config'

import { canOpenTradeShare, canOperateRelay } from './types'

describe('trade sharing while hidden', () => {
  it('keeps Berbagi Trade and Relay Trade out of every menu, even for Super Admins', () => {
    expect(SHOW_TRADE_SHARE).toBe(false)
    const admin = { roles: ['cs_super_admin'], trade_permissions: [] }
    const staff = { roles: ['compliance'], trade_permissions: ['trade_share.manage', 'trade_relay.operate'] }
    expect([admin, staff].map(canOpenTradeShare)).toEqual([false, false])
    expect([admin, staff].map(canOperateRelay)).toEqual([false, false])
    expect(visibleSettingsSections('integration')).not.toContain('tradeRelay')
    expect(settingsSections).not.toContain('tradeRelay')
    expect(superAdminTabs).toEqual(['map', 'status', 'healer', 'backup', 'alerts'])
  })
})
