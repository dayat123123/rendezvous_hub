import type { AgentProfile } from '@/features/presence/types'
import type { ApiError } from '@/lib/errors'

export type AuthStep =
  | { kind: 'signedOut' }
  | { kind: 'password' }
  | { kind: 'mfaVerify' }
  | { kind: 'mfaEnroll' }
  | { kind: 'verified' }

export type SignOutReason = 'manual' | 'idle' | 'expired' | 'notStaff'

export type AuthPhase =
  | { kind: 'checking' }
  | { kind: 'signedOut'; reason?: SignOutReason }
  | { kind: 'password' }
  | { kind: 'mfaVerify' }
  | { kind: 'mfaEnroll' }
  | { kind: 'ready'; agent: AgentProfile }

export type AuthState = {
  phase: AuthPhase
  busy: boolean
  error: ApiError | null
}

export type SecurityStatus = {
  mfa_required: boolean
  mfa_enrolled: boolean
  aal: string
}

export type MfaEnrollment = {
  factorId: string
  qrCode: string
  secret: string
}
