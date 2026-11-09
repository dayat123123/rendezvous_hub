import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { ticketsApi } from '@/features/tickets/api'
import { refreshTickets } from '@/features/tickets/hooks'
import type { TicketCaseFlag } from '@/features/tickets/types'
import { errorText } from '@/lib/error-text'
import { toApiError } from '@/lib/errors'

const knownErrors = ['reason_required', 'already_flagged', 'not_ticket_owner'] as const
type KnownError = (typeof knownErrors)[number]

const isKnown = (code: string): code is KnownError => (knownErrors as readonly string[]).includes(code)

export default function FlagTicketDialog({
  ticketId,
  flag,
  onClose,
}: {
  ticketId: string
  flag: TicketCaseFlag
  onClose: () => void
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (reason: string) => ticketsApi.flag(ticketId, flag, reason),
    onSuccess: () => {
      toast.success(t(`help.flag.done.${flag}`))
      refreshTickets(client, ticketId)
      onClose()
    },
    onError: (error) => {
      const apiError = toApiError(error)
      toast.error(isKnown(apiError.code) ? t(`help.flag.errors.${apiError.code}`) : errorText(apiError))
      refreshTickets(client, ticketId)
    },
  })
  return (
    <ReasonDialog
      open
      title={t(`help.flag.title.${flag}`)}
      description={t(`help.flag.description.${flag}`)}
      label={t('help.flag.reason')}
      hint={t('help.flag.hint')}
      action={t(`help.flag.action.${flag}`)}
      destructive={flag === 'fraud'}
      min={5}
      max={300}
      pending={mutation.isPending}
      onClose={onClose}
      onSubmit={(reason) => mutation.mutate(reason)}
    />
  )
}
