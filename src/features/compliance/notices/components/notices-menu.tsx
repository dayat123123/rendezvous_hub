import { useNavigate } from '@tanstack/react-router'
import { ShieldAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dot, FlagText } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { useAgent } from '@/features/auth/hooks'
import { isCompliance } from '@/features/presence/types'
import { useOpenTicket } from '@/features/tickets/hooks'
import { stamp } from '@/lib/time'

import { useComplianceNotices, useMarkNoticesSeen } from '../hooks'
import type { ComplianceNotice } from '../types'

function NoticeSource({ notice }: { notice: ComplianceNotice }) {
  const { t } = useTranslation()
  if (notice.source === 'agent' && notice.actor_name)
    return <>{t('complianceNotices.byAgent', { name: notice.actor_name })}</>
  return <>{t(`complianceNotices.source.${notice.source}`)}</>
}

export function ComplianceNoticesMenu() {
  const { t } = useTranslation()
  const agent = useAgent()
  const compliance = isCompliance(agent)
  const notices = useComplianceNotices(true)
  const markSeen = useMarkNoticesSeen()
  const navigate = useNavigate()
  const openTicket = useOpenTicket()
  const [open, setOpen] = useState(false)
  const unseen = notices.data?.unseen ?? 0
  const items = notices.data?.items ?? []

  const show = (ticketId: string) => {
    setOpen(false)
    if (compliance) void navigate({ to: '/compliance/cases', search: { case: ticketId } })
    else openTicket(ticketId)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && unseen > 0 && !markSeen.isPending) markSeen.mutate()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={
            unseen > 0 ? t('complianceNotices.titleUnseen', { count: unseen }) : t('complianceNotices.title')
          }
        >
          <ShieldAlertIcon />
          {unseen > 0 ? (
            <span
              aria-hidden="true"
              className="tabular absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive-solid px-1 text-label font-medium text-destructive-foreground"
            >
              {unseen > 9 ? '9+' : unseen}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">{t('complianceNotices.title')}</p>
          <p className="text-xs text-muted-foreground">{t('complianceNotices.hint')}</p>
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-4 text-row text-muted-foreground">
            {notices.isPending ? t('app.loading') : t('complianceNotices.empty')}
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto" aria-label={t('complianceNotices.title')}>
            {items.map((notice) => (
              <li key={notice.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => show(notice.ticket_id)}
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                >
                  <span className="flex items-center gap-2 text-row">
                    {notice.seen ? null : <Dot tone="late" />}
                    <FlagText flag={notice.flag} />
                    <span className="font-mono text-xs">{notice.ticket_number}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {stamp(notice.created_at)}
                    </span>
                  </span>
                  {notice.reason ? (
                    <span className="line-clamp-2 text-xs text-foreground">{notice.reason}</span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    <NoticeSource notice={notice} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
