import { useTranslation } from 'react-i18next'

import { TicketStatusText } from '@/components/badges'
import { ErrorState } from '@/components/states'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/controls'
import { Avatar, Skeleton } from '@/components/ui/primitives'
import { CustomerAccount } from '@/features/nasabah/components/customer-account'
import { useTopicName } from '@/features/tickets/hooks'
import { customerName, type Ticket } from '@/features/tickets/types'
import { shortDate } from '@/lib/time'

import { useHistory } from '../hooks'
import type { HistoryItem } from '../types'
import { NotesSection } from './notes-section'

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 py-1" aria-busy="true">
      <Skeleton className="h-2 w-3/4" />
      <Skeleton className="h-2 w-1/2" />
      <Skeleton className="h-2 w-2/3" />
    </div>
  )
}

function ListItem({ title, meta, side }: { title: React.ReactNode; meta: string; side: React.ReactNode }) {
  return (
    <li className="py-2 first:pt-1">
      <div className="flex items-start justify-between gap-3 text-row">
        <span className="tabular min-w-0 font-medium">{title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{side}</span>
      </div>
      <div className="tabular mt-0.5 text-xs text-muted-foreground">{meta}</div>
    </li>
  )
}

export function HistoryList({
  items,
  topicName,
}: {
  items: HistoryItem[]
  topicName: (code: string) => string
}) {
  const { t } = useTranslation()
  if (items.length === 0)
    return <p className="py-1 text-row text-muted-foreground">{t('customer.noHistory')}</p>
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <ListItem
          key={item.id}
          title={<span className="font-mono text-xs">{item.ticket_number}</span>}
          side={<TicketStatusText status={item.status} />}
          meta={`${topicName(item.topic)} · ${shortDate(item.created_at)}${item.agent ? ` · ${item.agent}` : ''}${
            item.rating ? ` · ${t('customer.rating', { rating: item.rating })}` : ''
          }`}
        />
      ))}
    </ul>
  )
}

function HistorySection({ customerId, currentId }: { customerId: string; currentId: string }) {
  const topicName = useTopicName()
  const history = useHistory(customerId)
  if (history.isPending) return <SectionSkeleton />
  if (history.isError) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />
  return <HistoryList items={history.data.filter((item) => item.id !== currentId)} topicName={topicName} />
}

export function CustomerHeader({ ticket }: { ticket: Pick<Ticket, 'customer' | 'guest'> }) {
  const { t } = useTranslation()
  const name = customerName(ticket)
  const username = ticket.customer?.username
  const guestLogin = ticket.guest?.login_id?.trim()
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <Avatar name={name || '?'} className="size-9 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-panel font-medium">{name}</p>
        {ticket.guest ? (
          <>
            <p className="truncate text-xs font-medium text-warning">{t('help.guest.customer')}</p>
            <p className="truncate text-xs text-muted-foreground">
              {guestLogin
                ? t('help.guest.claimedLogin', { loginId: guestLogin })
                : `${t('help.guest.loginId')}: ${t('help.guest.notFilled')}`}
            </p>
          </>
        ) : username ? (
          <p className="truncate font-mono text-xs text-muted-foreground">@{username}</p>
        ) : null}
      </div>
    </div>
  )
}

export function IntakeAnswers({ answers }: { answers: NonNullable<Ticket['intake']> }) {
  return (
    <dl className="flex flex-col gap-2 py-1 text-row">
      {answers.map((answer) => (
        <div key={answer.key}>
          <dt className="text-xs text-muted-foreground">{answer.label}</dt>
          <dd className="break-words">{answer.display ?? answer.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function CustomerPanel({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation()
  const customerId = ticket.customer?.id
  const intake = ticket.intake ?? []
  return (
    <aside aria-label={t('customer.title')} className="flex h-full flex-col bg-subtle">
      <CustomerHeader ticket={ticket} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {customerId ? (
          <Accordion type="multiple" defaultValue={['intake', 'account', 'history', 'notes']}>
            {intake.length > 0 ? (
              <AccordionItem value="intake">
                <AccordionTrigger>{t('help.ticket.intake')}</AccordionTrigger>
                <AccordionContent>
                  <IntakeAnswers answers={intake} />
                </AccordionContent>
              </AccordionItem>
            ) : null}
            {ticket.topic_sop ? (
              <AccordionItem value="sop">
                <AccordionTrigger>{t('help.ticket.sop')}</AccordionTrigger>
                <AccordionContent>
                  <p className="py-1 text-row whitespace-pre-line">{ticket.topic_sop}</p>
                </AccordionContent>
              </AccordionItem>
            ) : null}
            <CustomerAccount ticketId={ticket.id} guest={Boolean(ticket.guest)} />
            <AccordionItem value="history">
              <AccordionTrigger>{t('customer.history')}</AccordionTrigger>
              <AccordionContent>
                <HistorySection customerId={customerId} currentId={ticket.id} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="notes" className="border-b-0">
              <AccordionTrigger>{t('customer.notes')}</AccordionTrigger>
              <AccordionContent>
                <NotesSection customerId={customerId} ticketId={ticket.id} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}
      </div>
    </aside>
  )
}
