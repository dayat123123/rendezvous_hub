import { BadgeCheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/primitives'
import { ToneBadge } from '@/features/system/components/system-ui'
import type { WaitTone } from '@/lib/sla'
import { cn } from '@/lib/utils'

import { profileLabel } from '../logic'
import { traderStatuses, type ProfileRef, type TraderStatus } from '../types'

const statusTones: Record<TraderStatus, WaitTone | 'neutral'> = {
  pending: 'warn',
  active: 'ok',
  paused: 'neutral',
  suspended: 'late',
  rejected: 'neutral',
  revoked: 'late',
  withdrawn: 'neutral',
}

export function TraderStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation()
  const known = (traderStatuses as readonly string[]).includes(status)
  return (
    <ToneBadge tone={known ? statusTones[status as TraderStatus] : 'neutral'} className={className}>
      {known ? t(`trade.share.statuses.${status as TraderStatus}`) : status}
    </ToneBadge>
  )
}

export function ProfileCell({ profile, className }: { profile: ProfileRef | null; className?: string }) {
  const { t } = useTranslation()
  const name = profileLabel(profile)
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <Avatar name={name} />
      <span className="min-w-0">
        <span className="flex items-center gap-1 truncate text-row font-medium">
          {name}
          {profile?.is_verified ? (
            <BadgeCheckIcon className="size-3.5 shrink-0 text-info" aria-label={t('trade.share.verified')} />
          ) : null}
        </span>
        {profile?.username ? (
          <span className="block truncate font-mono text-xs text-muted-foreground">@{profile.username}</span>
        ) : null}
      </span>
    </span>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  titleId,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  titleId?: string
}) {
  return (
    <section aria-labelledby={titleId} className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={titleId} className="text-panel font-semibold">
            {title}
          </h2>
          {description ? <p className="max-w-3xl text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-row">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}
