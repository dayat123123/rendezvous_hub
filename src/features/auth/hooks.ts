import { create } from 'zustand'

import { presenceApi } from '@/features/presence/api'
import { worksTickets, type AgentProfile } from '@/features/presence/types'
import { toApiError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

import { authApi } from './api'
import type { AuthPhase, AuthState, SignOutReason } from './types'

type AuthActions = {
  start: () => Promise<void>
  recheck: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  verifyMfa: (code: string) => Promise<void>
  confirmEnrollment: (factorId: string, code: string) => Promise<void>
  changePassword: (password: string) => Promise<void>
  signOut: (reason?: SignOutReason) => Promise<void>
  updateAgent: (agent: AgentProfile) => void
}

const cleanups = new Set<() => void>()

export function onSignedOut(cleanup: () => void) {
  cleanups.add(cleanup)
  return () => {
    cleanups.delete(cleanup)
  }
}

let watching = false

export const useAuth = create<AuthState & AuthActions>((set, get) => {
  const advance = async (fresh: boolean) => {
    try {
      const step = await authApi.nextStep()
      let phase: AuthPhase
      switch (step.kind) {
        case 'verified': {
          const me = await presenceApi.me()
          const agent = fresh && worksTickets(me) ? await presenceApi.setStatus('offline') : me
          phase = { kind: 'ready', agent }
          break
        }
        case 'signedOut':
          phase = { kind: 'signedOut' }
          break
        default:
          phase = step
      }
      set({ phase, busy: false, error: null })
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.code === 'mfa_required') {
        const step = await authApi.nextStep().catch(() => null)
        if (step?.kind === 'mfaVerify' || step?.kind === 'mfaEnroll') {
          set({ phase: step, busy: false, error: null })
          return
        }
      }
      if (apiError.code === 'agent_required') {
        await authApi.signOut().catch(() => undefined)
        set({ phase: { kind: 'signedOut', reason: 'notStaff' }, busy: false, error: null })
        return
      }
      if (apiError.code === 'session_revoked') {
        await authApi.signOut().catch(() => undefined)
        set({ phase: { kind: 'signedOut', reason: 'expired' }, busy: false, error: null })
        return
      }
      set({ phase: { kind: 'signedOut' }, busy: false, error: apiError })
    }
  }

  const watch = () => {
    if (watching) return
    watching = true
    supabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && get().phase.kind === 'ready') {
        cleanups.forEach((cleanup) => cleanup())
        set({ phase: { kind: 'signedOut', reason: 'expired' }, busy: false, error: null })
      }
    })
  }

  const attempt = async (action: () => Promise<void>) => {
    set({ busy: true, error: null })
    try {
      await action()
      await advance(true)
    } catch (error) {
      set({ busy: false, error: toApiError(error) })
    }
  }

  return {
    phase: { kind: 'checking' },
    busy: false,
    error: null,

    start: async () => {
      watch()
      await advance(false)
    },

    recheck: async () => {
      if (get().phase.kind === 'ready') cleanups.forEach((cleanup) => cleanup())
      await advance(false)
    },

    signIn: (email, password) => attempt(() => authApi.signIn(email.trim(), password)),

    verifyMfa: (code) => attempt(() => authApi.verifyMfa(code)),

    confirmEnrollment: (factorId, code) => attempt(() => authApi.confirmEnrollment(factorId, code)),

    changePassword: (password) => attempt(() => authApi.changePassword(password)),

    signOut: async (reason = 'manual') => {
      const phase = get().phase
      if (phase.kind === 'ready' && worksTickets(phase.agent))
        await presenceApi.setStatus('offline').catch(() => undefined)
      await authApi.signOut().catch(() => undefined)
      cleanups.forEach((cleanup) => cleanup())
      set({ phase: { kind: 'signedOut', reason }, busy: false, error: null })
    },

    updateAgent: (agent) => {
      if (get().phase.kind === 'ready') set({ phase: { kind: 'ready', agent } })
    },
  }
})

export function useAgent(): AgentProfile {
  const phase = useAuth((state) => state.phase)
  if (phase.kind !== 'ready') throw new Error('Agent is not ready')
  return phase.agent
}
