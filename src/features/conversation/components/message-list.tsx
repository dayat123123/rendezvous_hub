import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDownIcon, LoaderCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import type { AgentNote } from '@/features/customer/types'
import { cn } from '@/lib/utils'

import { compareMessages } from '../cache'
import { buildRows, type MessageRow } from '../rows'
import { isStaffMessage, type ChatMessage, type PendingMessage } from '../types'
import { MessageBubble, NoteMessage, PendingBubble, SystemMessage } from './message-bubble'

type Props = {
  messages: ChatMessage[]
  notes?: AgentNote[]
  pending: PendingMessage[]
  meId: string
  customerReadAt: string | null
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  onFindOlder?: (id: string) => Promise<boolean>
  followSignal?: number
  trustedHost: (host: string) => boolean
  onReply?: (message: ChatMessage) => void
  onResend: (pending: PendingMessage) => void
  onDiscard: (pending: PendingMessage) => void
}

const NEAR_BOTTOM = 96
const JUMP_DISTANCE = 300
const SMOOTH_SCREENS = 2
const FOLLOW_MS = 10_000
const FLASH_MS = 1400
const MAX_BADGE = 99
const FLOAT_HOLD = 1500

function incoming(message: ChatMessage, meId: string) {
  return message.sender_id !== meId && !isStaffMessage(message)
}

export function MessageList({
  messages,
  notes,
  pending,
  meId,
  customerReadAt,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onFindOlder,
  followSignal = 0,
  trustedHost,
  onReply,
  onResend,
  onDiscard,
}: Props) {
  const { t } = useTranslation()
  const rows = useMemo(() => buildRows(messages, pending, { notes }), [messages, pending, notes])
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const anchor = useRef<{ key: string; delta: number; count: number } | null>(null)
  const lastKey = useRef<string | undefined>(undefined)
  const lastCount = useRef(0)
  const initialized = useRef(false)
  const [unseen, setUnseen] = useState(0)
  const [away, setAway] = useState(false)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [reveal, setReveal] = useState<string | null>(null)
  const newest = useRef(messages[messages.length - 1])
  const followed = useRef(followSignal)
  const followUntil = useRef(0)
  const seeking = useRef(false)
  const flashTimer = useRef<number | undefined>(undefined)
  const floatTimer = useRef<number | undefined>(undefined)
  const [floating, setFloating] = useState<{ label: string; shown: boolean } | null>(null)
  const badgeId = useId()

  useEffect(() => () => window.clearTimeout(floatTimer.current), [])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'day' ? 36 : 64),
    overscan: 12,
    getItemKey: (index) => rows[index]?.key ?? index,
  })

  const distanceToEnd = () => {
    const element = scrollRef.current
    return element ? element.scrollHeight - element.scrollTop - element.clientHeight : 0
  }

  const behaviorFor = useCallback((distance: number): ScrollBehavior => {
    const element = scrollRef.current
    if (!element) return 'auto'
    return Math.abs(distance) > element.clientHeight * SMOOTH_SCREENS ? 'auto' : 'smooth'
  }, [])

  const scrollToEnd = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      if (rows.length === 0) return
      virtualizer.scrollToIndex(rows.length - 1, { align: 'end', behavior })
      setUnseen(0)
    },
    [rows.length, virtualizer],
  )

  const jumpToLatest = () => scrollToEnd(behaviorFor(distanceToEnd()))

  const requestOlder = useCallback(() => {
    const element = scrollRef.current
    if (!element || !hasOlder || loadingOlder || anchor.current || seeking.current) return
    const first = virtualizer.getVirtualItems().find((item) => item.end > element.scrollTop)
    const row = first ? rows[first.index] : undefined
    if (first && row)
      anchor.current = { key: row.key, delta: first.start - element.scrollTop, count: rows.length }
    onLoadOlder()
  }, [hasOlder, loadingOlder, onLoadOlder, rows, virtualizer])

  useLayoutEffect(() => {
    const saved = anchor.current
    if (!saved || rows.length === saved.count) return
    anchor.current = null
    const index = rows.findIndex((row) => row.key === saved.key)
    if (index < 0) return
    const offset = virtualizer.getOffsetForIndex(index, 'start')
    if (offset) virtualizer.scrollToOffset(offset[0] - saved.delta)
  }, [rows, virtualizer])

  useEffect(() => {
    if (!loadingOlder && anchor.current && rows.length === anchor.current.count && !hasOlder)
      anchor.current = null
  }, [loadingOlder, hasOlder, rows.length])

  useEffect(() => {
    if (followSignal === followed.current) return
    followed.current = followSignal
    followUntil.current = Date.now() + FOLLOW_MS
    requestAnimationFrame(() => scrollToEnd())
  }, [followSignal, scrollToEnd])

  useEffect(() => {
    const previous = newest.current
    newest.current = messages[messages.length - 1]
    if (!previous || atBottom.current) return
    const count = messages.filter(
      (message) => compareMessages(message, previous) > 0 && incoming(message, meId),
    ).length
    if (count > 0) setUnseen((value) => value + count)
  }, [messages, meId])

  useEffect(() => {
    const last = rows[rows.length - 1]
    if (!last) return
    if (!initialized.current) {
      initialized.current = true
      lastKey.current = last.key
      lastCount.current = rows.length
      requestAnimationFrame(() => virtualizer.scrollToIndex(rows.length - 1, { align: 'end' }))
      return
    }
    const newLast = last.key !== lastKey.current
    const grew = rows.length > lastCount.current
    lastKey.current = last.key
    lastCount.current = rows.length
    if (!newLast && !grew) return
    const ownMessage =
      newLast && (last.kind === 'pending' || (last.kind === 'message' && last.message.sender_id === meId))
    const following = newLast && followUntil.current > Date.now()
    if (following) followUntil.current = 0
    if (atBottom.current || ownMessage || following) requestAnimationFrame(() => scrollToEnd())
  }, [rows, meId, scrollToEnd, virtualizer])

  useEffect(() => {
    if (!reveal) return
    const index = rows.findIndex((row) => row.key === reveal)
    if (index < 0) return
    setReveal(null)
    const element = scrollRef.current
    const offset = virtualizer.getOffsetForIndex(index, 'center')
    const distance = element && offset ? offset[0] - element.scrollTop : 0
    virtualizer.scrollToIndex(index, { align: 'center', behavior: behaviorFor(distance) })
    window.clearTimeout(flashTimer.current)
    setHighlighted(reveal)
    flashTimer.current = window.setTimeout(() => setHighlighted(null), FLASH_MS)
  }, [reveal, rows, virtualizer, behaviorFor])

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const findOriginal = useRef<(id: string) => Promise<void>>(() => Promise.resolve())
  useLayoutEffect(() => {
    findOriginal.current = async (id: string) => {
      if (seeking.current) return
      atBottom.current = false
      if (rows.some((row) => row.key === id)) {
        setReveal(id)
        return
      }
      seeking.current = true
      const found = hasOlder && onFindOlder ? await onFindOlder(id).catch(() => false) : false
      seeking.current = false
      if (found) {
        setReveal(id)
        return
      }
      atBottom.current = distanceToEnd() < NEAR_BOTTOM
      toast.error(t('conversation.replyNotFound'))
    }
  })
  const onQuote = useCallback((id: string) => void findOriginal.current(id), [])

  const onScroll = () => {
    const element = scrollRef.current
    if (!element) return
    const distance = distanceToEnd()
    atBottom.current = distance < NEAR_BOTTOM
    setAway(distance > JUMP_DISTANCE)
    if (atBottom.current && unseen > 0) setUnseen(0)
    if (element.scrollTop < 240) requestOlder()
    showFloatingDate(element.scrollTop)
  }

  const showFloatingDate = (scrollTop: number) => {
    window.clearTimeout(floatTimer.current)
    const top = virtualizer.getVirtualItems().find((item) => item.end > scrollTop)
    const day = top ? rows.slice(0, top.index + 1).findLast((row) => row.kind === 'day') : undefined
    if (atBottom.current || !top || day?.kind !== 'day' || rows[top.index]?.kind === 'day') {
      setFloating((current) => (current ? { ...current, shown: false } : current))
      return
    }
    setFloating({ label: day.label, shown: true })
    floatTimer.current = window.setTimeout(
      () => setFloating((current) => (current ? { ...current, shown: false } : current)),
      FLOAT_HOLD,
    )
  }

  const renderRow = (row: MessageRow) => {
    if (row.kind === 'day') {
      return (
        <div className="flex items-center gap-3 px-(--pane-px) pt-4 pb-1">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{row.label}</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )
    }
    if (row.kind === 'note') return <NoteMessage note={row.note} />
    if (row.kind === 'pending') {
      return (
        <PendingBubble
          pending={row.pending}
          onResend={() => onResend(row.pending)}
          onDiscard={() => onDiscard(row.pending)}
        />
      )
    }
    const message = row.message
    if (message.kind === 'system' || message.kind === 'csat') return <SystemMessage message={message} />
    const staff = isStaffMessage(message)
    return (
      <MessageBubble
        message={message}
        staff={staff}
        first={row.first}
        last={row.last}
        read={staff && customerReadAt !== null && customerReadAt >= message.created_at}
        trustedHost={trustedHost}
        onReply={onReply}
        onQuote={onQuote}
        highlighted={highlighted === message.id}
      />
    )
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
      >
        {loadingOlder ? (
          <div className="flex justify-center py-2 text-xs text-muted-foreground" role="status">
            <LoaderCircleIcon className="mr-1.5 size-3.5 animate-spin" />
            {t('conversation.loadOlder')}
          </div>
        ) : null}
        {rows.length === 0 ? (
          <EmptyState className="h-full" title={t('conversation.emptyHistory')} />
        ) : (
          <div style={{ height: virtualizer.getTotalSize() }} className="relative w-full">
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]
              if (!row) return null
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  {renderRow(row)}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {floating ? (
        <div
          aria-hidden="true"
          data-testid="floating-date"
          className={cn(
            'pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full border bg-popover px-3 py-1 text-xs text-muted-foreground shadow-float transition-opacity motion-reduce:transition-none',
            floating.shown ? 'opacity-100 duration-150' : 'opacity-0 duration-300',
          )}
        >
          {floating.label}
        </div>
      ) : null}
      {away || unseen > 0 ? (
        <Button
          size="icon"
          variant="outline"
          className="absolute right-4 bottom-3 size-10 rounded-full bg-popover text-muted-foreground shadow-float hover:text-foreground"
          aria-label={t('conversation.jumpToLatest')}
          aria-describedby={unseen > 0 ? badgeId : undefined}
          onClick={jumpToLatest}
        >
          <ChevronDownIcon className="size-5" />
          {unseen > 0 ? (
            <>
              <span
                aria-hidden="true"
                className="tabular absolute -top-1.5 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground"
              >
                {unseen > MAX_BADGE ? `${MAX_BADGE}+` : unseen}
              </span>
              <span id={badgeId} className="sr-only">
                {t('conversation.newMessages', { count: unseen })}
              </span>
            </>
          ) : null}
        </Button>
      ) : null}
    </div>
  )
}
