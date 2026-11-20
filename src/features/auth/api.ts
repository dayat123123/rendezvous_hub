import { ApiError, toApiError } from '@/lib/errors'
import { rpc, supabase } from '@/lib/supabase'

import type { AuthStep, MfaEnrollment, SecurityStatus } from './types'

type Result<T> = { data: T; error: null } | { data: unknown; error: unknown }

async function unwrap<T>(promise: Promise<Result<T>>): Promise<NonNullable<T>> {
  const result = await promise
  if (result.error || result.data === null || result.data === undefined) throw toApiError(result.error)
  return result.data as NonNullable<T>
}

export const MFA_ISSUER = 'Rendezvous Hub'

export const authApi = {
  signIn: async (email: string, password: string) => {
    await unwrap(supabase().auth.signInWithPassword({ email, password }))
  },

  nextStep: async (): Promise<AuthStep> => {
    const { session } = await unwrap(supabase().auth.getSession())
    if (!session) return { kind: 'signedOut' }
    const security = await rpc<SecurityStatus>('agent_security_status')
    if (security.aal !== 'aal2') {
      if (security.mfa_enrolled) return { kind: 'mfaVerify' }
      if (security.mfa_required) return { kind: 'mfaEnroll' }
    }
    return session.user.user_metadata?.must_change_password === true
      ? { kind: 'password' }
      : { kind: 'verified' }
  },

  verifyMfa: async (code: string) => {
    const factors = await unwrap(supabase().auth.mfa.listFactors())
    const factor = factors.totp[0]
    if (!factor) throw new ApiError('mfa_required')
    await unwrap(supabase().auth.mfa.challengeAndVerify({ factorId: factor.id, code }))
  },

  startEnrollment: async (): Promise<MfaEnrollment> => {
    const factors = await unwrap(supabase().auth.mfa.listFactors())
    for (const stale of factors.all) {
      if (stale.factor_type === 'totp' && stale.status === 'unverified') {
        await unwrap(supabase().auth.mfa.unenroll({ factorId: stale.id }))
      }
    }
    const enrolled = await unwrap(supabase().auth.mfa.enroll({ factorType: 'totp', issuer: MFA_ISSUER }))
    return { factorId: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret }
  },

  confirmEnrollment: async (factorId: string, code: string) => {
    await unwrap(supabase().auth.mfa.challengeAndVerify({ factorId, code }))
  },

  changePassword: async (password: string) => {
    await unwrap(supabase().auth.updateUser({ password, data: { must_change_password: false } }))
    await rpc('agent_password_changed').catch(() => undefined)
  },

  signOut: async () => {
    await supabase().auth.signOut({ scope: 'local' })
  },
}
