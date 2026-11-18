import { staffRoles, type StaffRole } from './types'

export const pickableRoles = staffRoles.filter((role) => role !== 'community')

export const includedInSuperAdmin: readonly StaffRole[] = ['product', 'cs_content']

export const coveredBySuperAdmin = (role: StaffRole, roles: readonly string[]) =>
  roles.includes('cs_super_admin') && includedInSuperAdmin.includes(role)

export function rolesToSave(roles: readonly string[], community: readonly string[]): StaffRole[] {
  const chosen = pickableRoles.filter((role) => roles.includes(role) && !coveredBySuperAdmin(role, roles))
  return chosen.length === 0 && community.length > 0 ? ['community'] : chosen
}

export function shownRoles(roles: readonly string[]): string[] {
  const visible = roles.filter(
    (role) => !(role === 'community' && roles.length > 1) && !coveredBySuperAdmin(role as StaffRole, roles),
  )
  return visible.length > 0 ? visible : [...roles]
}
