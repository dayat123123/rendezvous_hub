import { TriangleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { GUEST_REPEAT_ALERT, guestProblems, type TicketGuest } from '@/features/tickets/types'
import { cn } from '@/lib/utils'

const sopItems = ['noData', 'resetOnly', 'noChanges', 'noSecrets'] as const

export function GuestBanner({ guest }: { guest: TicketGuest }) {
  const { t } = useTranslation()
  const loginId = guest.login_id?.trim()
  const repeated = Boolean(loginId) && guest.recent_24h >= GUEST_REPEAT_ALERT
  return (
    <section
      role="note"
      aria-label={t('help.guest.title')}
      className="flex shrink-0 gap-2.5 border-b border-warning/40 bg-warning/10 px-(--pane-px) py-2.5 text-xs"
    >
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-row font-medium text-warning">{t('help.guest.title')}</p>
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5">
          <div className="flex gap-1">
            <dt className="text-muted-foreground">{t('help.guest.loginId')}:</dt>
            <dd className={cn(loginId ? 'font-mono font-medium' : 'text-muted-foreground italic')}>
              {loginId || t('help.guest.notFilled')}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-muted-foreground">{t('help.guest.problemLabel')}:</dt>
            <dd className="font-medium">
              {(guestProblems as readonly string[]).includes(guest.problem)
                ? t(`help.guest.problem.${guest.problem}`)
                : guest.problem}
            </dd>
          </div>
        </dl>
        {loginId ? (
          <p
            data-alert={repeated || undefined}
            className={cn(
              'tabular self-start',
              repeated ? 'rounded-sm bg-danger/10 px-1 font-medium text-danger' : 'text-muted-foreground',
            )}
          >
            {t('help.guest.recent', { count: guest.recent_24h })}
            {repeated ? ` · ${t('help.guest.repeatHint')}` : null}
          </p>
        ) : null}
        <div>
          <p className="font-medium">{t('help.guest.sopTitle')}</p>
          <ul className="mt-0.5 list-disc pl-4">
            {sopItems.map((item) => (
              <li key={item}>{t(`help.guest.sop.${item}`)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
