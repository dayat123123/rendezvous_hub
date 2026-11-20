import { AuthError } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as PresenceApiModule from '@/features/presence/api'
import { presenceApi } from '@/features/presence/api'
import type * as SupabaseModule from '@/lib/supabase'
import { agentFixture } from '@/test/fixtures'

import { LoginPage } from './components/login-page'
import { MfaEnrollPage, MfaVerifyPage } from './components/mfa-pages'
import { PasswordPage } from './components/password-page'
import { useAuth } from './hooks'

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  mfa: {
    listFactors: vi.fn(),
    enroll: vi.fn(),
    unenroll: vi.fn(),
    challengeAndVerify: vi.fn(),
  },
}))

const db = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('@/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof SupabaseModule>()
  return { ...actual, supabase: () => ({ auth }), rpc: db.rpc }
})

type Security = { mfa_required: boolean; mfa_enrolled: boolean; aal: string }

const noMfa: Security = { mfa_required: false, mfa_enrolled: false, aal: 'aal1' }
const securityQueue: Security[] = []

function answerSecurity(...values: Security[]) {
  securityQueue.splice(0, securityQueue.length, ...values)
}

function nextSecurity() {
  const value = securityQueue.length > 1 ? securityQueue.shift() : securityQueue[0]
  return value ?? noMfa
}

vi.mock('@/features/presence/api', async (importOriginal) => {
  const actual = await importOriginal<typeof PresenceApiModule>()
  return { ...actual, presenceApi: { ...actual.presenceApi, me: vi.fn(), setStatus: vi.fn() } }
})

const session = (mustChange: boolean) => ({
  data: { session: { access_token: 'token', user: { user_metadata: { must_change_password: mustChange } } } },
  error: null,
})

function Gate() {
  const phase = useAuth((state) => state.phase)
  if (phase.kind === 'password') return <PasswordPage />
  if (phase.kind === 'mfaVerify') return <MfaVerifyPage />
  if (phase.kind === 'mfaEnroll') return <MfaEnrollPage />
  if (phase.kind === 'ready') return <p>Ruang kerja {phase.agent.display_name}</p>
  return <LoginPage idleMinutes={30} />
}

function resetMocks() {
  useAuth.setState({ phase: { kind: 'signedOut' }, busy: false, error: null })
  Object.values(auth).forEach((mock) => {
    if (typeof mock === 'function') mock.mockReset()
  })
  Object.values(auth.mfa).forEach((mock) => mock.mockReset())
  db.rpc
    .mockReset()
    .mockImplementation((name: string) =>
      Promise.resolve(name === 'agent_security_status' ? nextSecurity() : null),
    )
  answerSecurity(noMfa)
  vi.mocked(presenceApi.me).mockReset().mockResolvedValue(agentFixture)
  vi.mocked(presenceApi.setStatus).mockReset().mockResolvedValue(agentFixture)
  auth.signInWithPassword.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
}

async function signIn(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(screen.getByLabelText('Email'), ' rina@olt.test ')
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Masuk' }))
}

describe('login without TOTP', () => {
  beforeEach(resetMocks)

  it('goes from email and password straight to the workspace', async () => {
    const user = userEvent.setup()
    auth.getSession.mockResolvedValue(session(false))
    render(<Gate />)

    await signIn(user, 'rahasia-sekali')

    expect(await screen.findByText('Ruang kerja Rina')).toBeInTheDocument()
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'rina@olt.test',
      password: 'rahasia-sekali',
    })
    expect(presenceApi.setStatus).toHaveBeenCalledWith('offline')
  })

  it('leaves the status alone for staff who do not handle tickets', async () => {
    const user = userEvent.setup()
    auth.getSession.mockResolvedValue(session(false))
    vi.mocked(presenceApi.me).mockResolvedValue({
      ...agentFixture,
      display_name: 'Kirana',
      roles: ['compliance'],
    })
    render(<Gate />)

    await signIn(user, 'rahasia-sekali')

    expect(await screen.findByText('Ruang kerja Kirana')).toBeInTheDocument()
    expect(presenceApi.setStatus).not.toHaveBeenCalled()
  })

  it('asks for a new password first while the temporary one is still in use', async () => {
    const user = userEvent.setup()
    auth.getSession.mockResolvedValueOnce(session(true)).mockResolvedValue(session(false))
    auth.updateUser.mockResolvedValue({ data: { user: {} }, error: null })
    render(<Gate />)

    await signIn(user, 'Sementara-12345678')
    expect(await screen.findByRole('heading', { name: 'Ganti password' })).toBeInTheDocument()
    expect(presenceApi.setStatus).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Password baru'), 'kata-sandi-baru-123')
    await user.type(screen.getByLabelText('Ulangi password baru'), 'kata-sandi-baru-123')
    await user.click(screen.getByRole('button', { name: 'Simpan password' }))

    expect(await screen.findByText('Ruang kerja Rina')).toBeInTheDocument()
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: 'kata-sandi-baru-123',
      data: { must_change_password: false },
    })
  })

  it('rejects a wrong password and stays on the login form', async () => {
    const user = userEvent.setup()
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthError('Invalid login credentials', 400, 'invalid_credentials'),
    })
    render(<Gate />)

    await signIn(user, 'salah')

    expect(await screen.findByRole('alert')).toHaveTextContent('Email atau password salah.')
    expect(auth.getSession).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument()
  })

  it('explains a temporarily locked account with the time it opens again', async () => {
    const user = userEvent.setup()
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: new AuthError('account_locked:2026-11-20T03:15:00Z', 400, 'invalid_credentials'),
    })
    render(<Gate />)

    await signIn(user, 'salah-lagi')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Akun dikunci sementara')
    expect(alert).toHaveTextContent('10.15')
    expect(auth.getSession).not.toHaveBeenCalled()
  })
})

describe('login with TOTP', () => {
  beforeEach(resetMocks)

  it('asks enrolled staff for the authenticator code before the workspace', async () => {
    const user = userEvent.setup()
    auth.getSession.mockResolvedValue(session(false))
    answerSecurity(
      { mfa_required: true, mfa_enrolled: true, aal: 'aal1' },
      { mfa_required: true, mfa_enrolled: true, aal: 'aal2' },
    )
    auth.mfa.listFactors.mockResolvedValue({
      data: {
        all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }],
        totp: [{ id: 'factor-1' }],
        phone: [],
      },
      error: null,
    })
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: { access_token: 'aal2' }, error: null })
    render(<Gate />)

    await signIn(user, 'rahasia-sekali')
    expect(await screen.findByRole('heading', { name: 'Masukkan kode 2FA' })).toBeInTheDocument()
    expect(presenceApi.me).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Kode 2FA'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verifikasi' }))

    expect(await screen.findByText('Ruang kerja Rina')).toBeInTheDocument()
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'factor-1', code: '123456' })
  })

  it('keeps the code page open and explains a wrong code', async () => {
    const user = userEvent.setup()
    auth.getSession.mockResolvedValue(session(false))
    answerSecurity({ mfa_required: true, mfa_enrolled: true, aal: 'aal1' })
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [{ id: 'factor-1' }], phone: [] },
      error: null,
    })
    auth.mfa.challengeAndVerify.mockResolvedValue({
      data: null,
      error: new AuthError('Invalid TOTP code entered', 422, 'mfa_verification_failed'),
    })
    render(<Gate />)

    await signIn(user, 'rahasia-sekali')
    await user.type(await screen.findByLabelText('Kode 2FA'), '000000')
    await user.click(screen.getByRole('button', { name: 'Verifikasi' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Kode 2FA salah atau sudah kedaluwarsa')
    expect(screen.getByRole('heading', { name: 'Masukkan kode 2FA' })).toBeInTheDocument()
  })

  it('rejects a code that is not six digits without calling the server', async () => {
    const user = userEvent.setup()
    auth.getSession.mockResolvedValue(session(false))
    answerSecurity({ mfa_required: true, mfa_enrolled: true, aal: 'aal1' })
    render(<Gate />)

    await signIn(user, 'rahasia-sekali')
    await user.type(await screen.findByLabelText('Kode 2FA'), '12ab')
    await user.click(screen.getByRole('button', { name: 'Verifikasi' }))

    expect(await screen.findByText('Kode harus 6 digit angka')).toBeInTheDocument()
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled()
  })

  it('walks a Super Admin without 2FA through enrolment, then the temporary password', async () => {
    const user = userEvent.setup()
    auth.getSession
      .mockResolvedValueOnce(session(true))
      .mockResolvedValueOnce(session(true))
      .mockResolvedValue(session(false))
    answerSecurity(
      { mfa_required: true, mfa_enrolled: false, aal: 'aal1' },
      { mfa_required: true, mfa_enrolled: true, aal: 'aal2' },
    )
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [{ id: 'stale', factor_type: 'totp', status: 'unverified' }], totp: [], phone: [] },
      error: null,
    })
    auth.mfa.unenroll.mockResolvedValue({ data: { id: 'stale' }, error: null })
    auth.mfa.enroll.mockResolvedValue({
      data: {
        id: 'factor-2',
        type: 'totp',
        totp: {
          qr_code: 'data:image/svg+xml;utf-8,<svg/>',
          secret: 'JBSWY3DPEHPK3PXP',
          uri: 'otpauth://totp/x',
        },
      },
      error: null,
    })
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: { access_token: 'aal2' }, error: null })
    auth.updateUser.mockResolvedValue({ data: { user: {} }, error: null })
    render(<Gate />)

    await signIn(user, 'Sementara-12345678')
    expect(await screen.findByRole('heading', { name: 'Aktifkan 2FA' })).toBeInTheDocument()
    expect(
      await screen.findByRole('img', { name: 'Kode QR untuk aplikasi authenticator' }),
    ).toBeInTheDocument()
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'stale' })
    expect(auth.mfa.enroll).toHaveBeenCalledTimes(1)
    expect(auth.mfa.enroll).toHaveBeenCalledWith({ factorType: 'totp', issuer: 'Rendezvous Hub' })

    await user.type(screen.getByLabelText('Kode 6 digit dari aplikasi'), '654321')
    await user.click(screen.getByRole('button', { name: 'Aktifkan 2FA' }))

    expect(await screen.findByRole('heading', { name: 'Ganti password' })).toBeInTheDocument()
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'factor-2', code: '654321' })
  })
})
