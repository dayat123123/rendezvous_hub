import { LoaderCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorText } from '@/lib/error-text'

import { authApi } from '../api'
import { useAuth } from '../hooks'
import type { MfaEnrollment } from '../types'
import { AuthError, AuthFrame, FieldError, SubmitButton } from './auth-frame'

const codePattern = /^\d{6}$/

function CodeForm({
  label,
  submitLabel,
  onSubmit,
}: {
  label: string
  submitLabel: string
  onSubmit: (code: string) => void
}) {
  const { t } = useTranslation()
  const busy = useAuth((state) => state.busy)
  const [code, setCode] = useState('')
  const [invalid, setInvalid] = useState(false)
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const clean = code.replace(/\s/g, '')
        if (!codePattern.test(clean)) {
          setInvalid(true)
          return
        }
        setInvalid(false)
        onSubmit(clean)
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="mfa-code">{label}</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={7}
          className="font-mono tracking-[0.3em]"
          value={code}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? 'mfa-code-error' : undefined}
          onChange={(event) => setCode(event.target.value)}
        />
        <FieldError id="mfa-code-error" message={invalid ? t('auth.mfaCodeInvalid') : undefined} />
      </div>
      <SubmitButton busy={busy} label={submitLabel} busyLabel={t('auth.mfaVerifying')} />
    </form>
  )
}

function OtherAccount() {
  const { t } = useTranslation()
  const signOut = useAuth((state) => state.signOut)
  return (
    <Button variant="link" className="self-center" onClick={() => void signOut('manual')}>
      {t('auth.useOtherAccount')}
    </Button>
  )
}

export function MfaVerifyPage() {
  const { t } = useTranslation()
  const error = useAuth((state) => state.error)
  const verifyMfa = useAuth((state) => state.verifyMfa)
  return (
    <AuthFrame title={t('auth.mfaTitle')} subtitle={t('auth.mfaSubtitle')}>
      {error ? <AuthError message={errorText(error)} /> : null}
      <CodeForm
        label={t('auth.mfaCode')}
        submitLabel={t('auth.mfaVerify')}
        onSubmit={(code) => void verifyMfa(code)}
      />
      <p className="text-xs text-muted-foreground">{t('auth.mfaLost')}</p>
      <OtherAccount />
    </AuthFrame>
  )
}

type Enrollment =
  { state: 'loading' } | { state: 'ready'; value: MfaEnrollment } | { state: 'failed'; error: unknown }

export function MfaEnrollPage() {
  const { t } = useTranslation()
  const error = useAuth((state) => state.error)
  const confirmEnrollment = useAuth((state) => state.confirmEnrollment)
  const [enrollment, setEnrollment] = useState<Enrollment>({ state: 'loading' })
  const started = useRef(false)

  const load = useCallback(() => {
    authApi.startEnrollment().then(
      (value) => setEnrollment({ state: 'ready', value }),
      (caught: unknown) => setEnrollment({ state: 'failed', error: caught }),
    )
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    load()
  }, [load])

  const retry = () => {
    setEnrollment({ state: 'loading' })
    load()
  }

  return (
    <AuthFrame title={t('auth.enrollTitle')} subtitle={t('auth.enrollSubtitle')}>
      {error ? <AuthError message={errorText(error)} /> : null}
      {enrollment.state === 'loading' ? (
        <p className="flex items-center gap-2 text-row text-muted-foreground" aria-busy="true">
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
          {t('auth.enrollLoading')}
        </p>
      ) : null}
      {enrollment.state === 'failed' ? (
        <>
          <AuthError message={errorText(enrollment.error)} />
          <Button variant="outline" onClick={retry}>
            {t('app.retry')}
          </Button>
        </>
      ) : null}
      {enrollment.state === 'ready' ? (
        <>
          <img
            src={enrollment.value.qrCode}
            alt={t('auth.enrollQrAlt')}
            className="size-44 self-center rounded-md border bg-qr p-2"
          />
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{t('auth.enrollManual')}</p>
            <code className="rounded-md bg-muted px-2 py-1.5 font-mono text-sm tracking-wider break-all select-all">
              {enrollment.value.secret}
            </code>
          </div>
          <CodeForm
            label={t('auth.enrollCode')}
            submitLabel={t('auth.enrollConfirm')}
            onSubmit={(code) => void confirmEnrollment(enrollment.value.factorId, code)}
          />
        </>
      ) : null}
      <OtherAccount />
    </AuthFrame>
  )
}
