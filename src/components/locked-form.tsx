import { LoaderCircleIcon, PencilIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import { Confirm } from '@/features/nasabah/components/confirm'
import type { LockedEdit } from '@/hooks/use-locked-edit'
import { cn } from '@/lib/utils'

function firstField(root: HTMLElement | null) {
  if (!root) return undefined
  return [...root.querySelectorAll<HTMLElement>('input, textarea, select, button')].find(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !(element instanceof HTMLInputElement && element.type === 'hidden'),
  )
}

export function EditButton({
  name,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children'> & { name: string }) {
  const { t } = useTranslation()
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-label={t('app.editNamed', { name })}
      className={className}
      {...props}
    >
      <PencilIcon />
      {t('app.edit')}
    </Button>
  )
}

type ReasonSpec = { label: string; hint?: string; min?: number; max?: number }

export function LockedForm({
  lock,
  reason,
  name,
  confirmTitle,
  confirmBody,
  confirmAction,
  destructive,
  saving,
  saveLabel,
  canSave = true,
  onCheck,
  onSave,
  onError,
  onReset,
  status,
  actions,
  className,
  footerClassName,
  autoComplete,
  children,
}: {
  lock: LockedEdit
  reason?: ReasonSpec
  name: string
  confirmTitle: string
  confirmBody: string
  confirmAction?: string
  destructive?: boolean
  saving: boolean
  saveLabel?: string
  canSave?: boolean
  onCheck?: () => boolean
  onSave: (reason?: string) => Promise<unknown>
  onError?: (error: unknown) => void
  onReset: () => void
  status?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  footerClassName?: string
  autoComplete?: string
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const fields = useRef<HTMLFieldSetElement>(null)
  const edit = useRef<HTMLButtonElement>(null)
  const previous = useRef(lock.editing)
  const { editing, confirming, setEditing, setConfirming } = lock

  useEffect(() => {
    if (previous.current === editing) return
    previous.current = editing
    if (editing) firstField(fields.current)?.focus()
    else edit.current?.focus()
  }, [editing])

  const cancel = () => {
    onReset()
    setEditing(false)
  }

  const confirm = (text?: string) =>
    void onSave(text).then(
      (result) => {
        setConfirming(false)
        if (result !== false) setEditing(false)
      },
      (error: unknown) => {
        setConfirming(false)
        onError?.(error)
      },
    )

  const form = (
    <form
      className={className}
      noValidate
      autoComplete={autoComplete}
      onSubmit={(event) => {
        event.preventDefault()
        if (!editing || saving) return
        if (onCheck && !onCheck()) return
        setConfirming(true)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !editing || confirming || saving) return
        if (!event.currentTarget.contains(event.target as Node)) return
        event.preventDefault()
        cancel()
      }}
    >
      <fieldset ref={fields} disabled={!editing} className="contents">
        {children}
      </fieldset>
      <div className={cn('flex flex-wrap items-center gap-2', footerClassName)}>
        {editing ? (
          <>
            <Button type="submit" size="sm" disabled={saving || !canSave}>
              {saving ? <LoaderCircleIcon className="animate-spin" /> : null}
              {saveLabel ?? t('app.save')}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={cancel}>
              {t('app.cancel')}
            </Button>
          </>
        ) : (
          <EditButton ref={edit} name={name} onClick={() => setEditing(true)} />
        )}
        {actions}
        {status}
      </div>
      {reason ? null : (
        <Confirm
          open={confirming}
          title={confirmTitle}
          body={confirmBody}
          action={confirmAction ?? saveLabel ?? t('app.save')}
          pending={saving}
          destructive={destructive}
          onClose={() => setConfirming(false)}
          onConfirm={() => confirm()}
        />
      )}
    </form>
  )

  if (!reason) return form
  return (
    <>
      {form}
      <ReasonDialog
        open={confirming}
        title={confirmTitle}
        description={confirmBody}
        label={reason.label}
        hint={reason.hint}
        min={reason.min}
        max={reason.max}
        action={confirmAction ?? saveLabel ?? t('app.save')}
        pending={saving}
        destructive={destructive}
        onClose={() => setConfirming(false)}
        onSubmit={confirm}
      />
    </>
  )
}
