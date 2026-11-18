import { describe, expect, it } from 'vitest'

import { pickableRoles, rolesToSave, shownRoles } from './roles'

describe('staff roles', () => {
  it('does not offer Komunitas as a role to pick', () => {
    expect(pickableRoles).toEqual(['cs_agent', 'cs_super_admin', 'compliance', 'product', 'cs_content'])
  })

  it('drops roles that Super Admin already covers', () => {
    expect(
      rolesToSave(['cs_agent', 'cs_super_admin', 'compliance', 'community', 'product', 'cs_content'], []),
    ).toEqual(['cs_agent', 'cs_super_admin', 'compliance'])
    expect(rolesToSave(['product', 'cs_content'], [])).toEqual(['product', 'cs_content'])
  })

  it('makes a staff Komunitas account only when community permissions are the only access', () => {
    expect(rolesToSave([], ['community.post'])).toEqual(['community'])
    expect(rolesToSave(['community'], ['community.post'])).toEqual(['community'])
    expect(rolesToSave(['cs_agent', 'community'], ['community.post'])).toEqual(['cs_agent'])
    expect(rolesToSave(['community'], [])).toEqual([])
  })

  it('lists stored roles without the redundant ones', () => {
    expect(shownRoles(['cs_super_admin', 'product', 'community', 'cs_content'])).toEqual(['cs_super_admin'])
    expect(shownRoles(['community'])).toEqual(['community'])
    expect(shownRoles(['product', 'community'])).toEqual(['product'])
  })
})
