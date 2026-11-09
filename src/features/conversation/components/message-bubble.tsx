import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  ReplyIcon,
} from 'lucide-react'
import { memo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/menu'
import type { AgentNote } from '@/features/customer/types'
import { clock } from '@/lib/time'
import { cn } from '@/lib/utils'

import { linkify } from '../linkify'
import { attachmentKind, fileKind, fileLabelType } from '../media'
import { SWIPE_TRIGGER, useSwipeReply } from '../swipe-reply'
import { systemText } from '../system-text'
import type { ChatMessage, PendingMessage } from '../types'
import { AttachmentFile, DocumentLabel } from './attachment-file'
import { AttachmentImage } from './attachment-image'
import { AttachmentVideo } from './attachment-video'

export const SystemMessage = memo(function SystemMessage({ message }: { message: ChatMessage }) {
  const { i18n } = useTranslation()
  return (
    <div className="flex justify-center px-(--pane-px) py-1.5" role="note">
      <p className="max-w-[80%] text-center text-xs text-muted-foreground">
        {systemText(message, i18n.language)} · <span className="tabular">{clock(message.created_at)}</span>
      </p>
    </div>
  )
})

export const NoteMessage = memo(function NoteMessage({ note }: { note: AgentNote }) {
  const { t } = useTranslation()
  return (
    <div className="px-(--pane-px) py-1.5" role="note">
      <div className="border-l-2 border-note-border bg-note px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {t('conversation.internalNote')}
          {note.author?.display_name ? ` · ${note.author.display_name}` : ''} ·{' '}
          <span className="tabular">{clock(note.created_at)}</span>
        </p>
        <p className="mt-0.5 text-sm leading-normal break-words whitespace-pre-wrap">{note.body}</p>
      </div>
    </div>
  )
})

function httpsHost(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' ? parsed.host : null
  } catch {
    return null
  }
}

function MessageText({ text, trusted }: { text: string; trusted: (host: string) => boolean }) {
  return (
    <p className="break-words whitespace-pre-wrap">
      {linkify(text).map((part, index): ReactNode => {
        if (part.kind === 'text') return part.text
        if (part.kind === 'url') {
          return <SafeLink key={index} url={part.href} title={part.text} trusted={trusted} inline />
        }
        return (
          <a key={index} href={part.href} className="break-all underline underline-offset-2">
            {part.text}
          </a>
        )
      })}
    </p>
  )
}

function SafeLink({
  url,
  title,
  trusted,
  inline = false,
}: {
  url: string
  title?: string
  trusted: (host: string) => boolean
  inline?: boolean
}) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const host = httpsHost(url)
  if (host === null) return <span>{url}</span>
  const open = () => window.open(url, '_blank', 'noopener,noreferrer')
  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => {
          if (trusted(host)) return
          event.preventDefault()
          setConfirming(true)
        }}
        className={
          inline
            ? 'break-all underline underline-offset-2'
            : 'mt-1 inline-flex max-w-full items-center gap-1 underline underline-offset-2'
        }
      >
        {inline ? (
          title || url
        ) : (
          <>
            <ExternalLinkIcon className="size-3.5 shrink-0" />
            <span className="truncate">{title || url}</span>
          </>
        )}
      </a>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('conversation.externalTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('conversation.externalBody', { host })}</AlertDialogDescription>
          <p className="text-xs break-all text-muted-foreground">{url}</p>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={open}>{t('conversation.openLink')}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

type BubbleProps = {
  message: ChatMessage
  staff: boolean
  first: boolean
  last: boolean
  read: boolean
  trustedHost: (host: string) => boolean
  onReply?: (message: ChatMessage) => void
  onQuote?: (id: string) => void
  highlighted?: boolean
}

function ReplyQuote({ message, onQuote }: { message: ChatMessage; onQuote?: (id: string) => void }) {
  const { t } = useTranslation()
  const target = message.reply_to_id
  const content = (
    <>
      <span className="block font-medium">{message.reply_to_sender_username ?? ''}</span>
      <span className="line-clamp-2">{message.reply_to_body}</span>
    </>
  )
  if (!onQuote || !target) {
    return <div className="mb-1.5 border-l-2 border-current/40 pl-2 text-xs opacity-80">{content}</div>
  }
  return (
    <button
      type="button"
      title={t('conversation.showOriginal')}
      onClick={() => onQuote(target)}
      className="mb-1.5 block w-full min-w-0 cursor-pointer rounded-sm border-l-2 border-current/40 pl-2 text-left text-xs opacity-80 outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {content}
    </button>
  )
}

export const MessageBubble = memo(function MessageBubble({
  message,
  staff,
  first,
  last,
  read,
  trustedHost,
  onReply,
  onQuote,
  highlighted = false,
}: BubbleProps) {
  const { t } = useTranslation()
  const name = message.sender_display_name ?? message.sender_username ?? ''
  const options = Array.isArray(message.payload.options)
    ? message.payload.options.filter((option): option is string => typeof option === 'string')
    : []
  const masked = Array.isArray(message.payload.masked)
    ? message.payload.masked.filter((field): field is string => typeof field === 'string')
    : []
  const url =
    message.kind === 'help_link' && typeof message.payload.url === 'string' ? message.payload.url : null
  const status = read ? t('conversation.read') : t('conversation.sent')
  const images = message.attachments.filter((attachment) => attachmentKind(attachment) === 'images')
  const documents = message.attachments.filter((attachment) => attachmentKind(attachment) === 'documents')
  const videos = message.attachments.filter((attachment) => attachmentKind(attachment) === 'videos')
  const swipe = useSwipeReply(onReply ? () => onReply(message) : undefined)
  const progress = Math.min(swipe.offset / SWIPE_TRIGGER, 1)

  return (
    <div
      {...swipe.handlers}
      className={cn(
        'group relative flex touch-pan-y px-(--pane-px)',
        swipe.offset > 0 && 'overflow-x-clip',
        staff ? 'justify-end' : 'justify-start',
        first ? 'pt-3 compact:pt-2' : 'pt-0.5',
        highlighted && 'animate-flash',
      )}
      data-highlighted={highlighted || undefined}
    >
      {swipe.offset > 0 ? (
        <span
          aria-hidden
          data-testid="swipe-reply-indicator"
          className="pointer-events-none absolute top-1/2 left-(--pane-px) flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground"
          style={{ opacity: progress, transform: `translateY(-50%) scale(${0.6 + 0.4 * progress})` }}
        >
          <ReplyIcon className="size-4" />
        </span>
      ) : null}
      <div
        className={cn(
          'flex max-w-[68%] min-w-0 flex-col',
          staff ? 'items-end' : 'items-start',
          swipe.offset === 0 && 'transition-transform duration-200 motion-reduce:transition-none',
        )}
        style={swipe.offset > 0 ? { transform: `translateX(${swipe.offset}px)` } : undefined}
      >
        {first ? (
          <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">
            {staff ? name : name || t('conversation.customer')}
          </p>
        ) : null}
        <div className={cn('flex max-w-full items-end gap-1', staff ? 'flex-row-reverse' : 'flex-row')}>
          <div
            className={cn(
              'min-w-0 rounded-xl px-3 py-2 text-sm leading-normal',
              staff ? 'bg-bubble-agent text-bubble-agent-foreground' : 'bg-muted text-foreground',
              last && (staff ? 'rounded-br-sm' : 'rounded-bl-sm'),
            )}
          >
            {message.reply_to_body ? <ReplyQuote message={message} onQuote={onQuote} /> : null}
            {images.length > 0 ? (
              <div className={cn('mb-1 grid gap-1', images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                {images.map((attachment) => (
                  <AttachmentImage
                    key={attachment.path}
                    attachment={attachment}
                    compact={images.length > 1}
                  />
                ))}
              </div>
            ) : null}
            {videos.length > 0 ? (
              <div className="mb-1 flex flex-col gap-2">
                {videos.map((attachment) => (
                  <AttachmentVideo key={attachment.path} attachment={attachment} />
                ))}
              </div>
            ) : null}
            {documents.length > 0 ? (
              <div className="mb-1 flex flex-col gap-1">
                {documents.map((attachment) => (
                  <AttachmentFile key={attachment.path} attachment={attachment} />
                ))}
              </div>
            ) : null}
            {message.is_deleted ? (
              <p className="italic opacity-80">{t('conversation.deleted')}</p>
            ) : message.body ? (
              <MessageText text={message.body} trusted={trustedHost} />
            ) : null}
            {url ? <SafeLink url={url} title={message.body} trusted={trustedHost} /> : null}
            {options.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1" aria-label={t('conversation.quickOptions')}>
                {options.map((option) => (
                  <span key={option} className="rounded-md border border-current/30 px-2 py-0.5 text-xs">
                    {option}
                  </span>
                ))}
              </div>
            ) : null}
            {masked.length > 0 ? (
              <p className="mt-1 text-xs opacity-80">
                {t('conversation.masked', { fields: masked.join(', ') })}
              </p>
            ) : null}
          </div>
          {onReply ? (
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={t('conversation.replyTo')}
              onClick={() => onReply(message)}
            >
              <ReplyIcon />
            </Button>
          ) : null}
        </div>
        {last ? (
          <p className="tabular mt-1 flex items-center gap-1 px-1 text-xs text-muted-foreground">
            {clock(message.created_at)}
            {staff ? (
              <Tooltip content={status}>
                <span aria-label={status} role="img">
                  {read ? <CheckCheckIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
                </span>
              </Tooltip>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  )
})

export function PendingBubble({
  pending,
  onResend,
  onDiscard,
}: {
  pending: PendingMessage
  onResend: () => void
  onDiscard: () => void
}) {
  const { t } = useTranslation()
  const failed = pending.status === 'failed'
  return (
    <div className="flex justify-end px-(--pane-px) pt-0.5">
      <div className="flex max-w-[68%] min-w-0 flex-col items-end">
        <div
          className={cn(
            'min-w-0 rounded-xl rounded-br-sm px-3 py-2 text-sm leading-normal',
            failed
              ? 'border border-destructive bg-background text-foreground'
              : 'bg-bubble-agent/70 text-bubble-agent-foreground',
          )}
        >
          {pending.files.length > 0 ? (
            <div className="mb-1 grid grid-cols-2 gap-1">
              {pending.files.map((file) =>
                fileKind(file.file) !== 'images' ? (
                  <div
                    key={file.id}
                    className="col-span-2 flex items-center gap-2.5 rounded-lg border border-current/20 px-2.5 py-2"
                  >
                    <DocumentLabel
                      name={file.file.name}
                      size={file.file.size}
                      type={fileLabelType(file.file)}
                    />
                  </div>
                ) : (
                  <img
                    key={file.id}
                    src={file.preview}
                    alt={file.file.name}
                    className="h-20 w-28 rounded-md object-cover"
                  />
                ),
              )}
            </div>
          ) : null}
          {pending.body ? <p className="break-words whitespace-pre-wrap">{pending.body}</p> : null}
        </div>
        <div className="mt-1 flex items-center gap-2 px-1 text-xs text-muted-foreground" aria-live="polite">
          {failed ? (
            <>
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircleIcon className="size-3.5" />
                {t('conversation.failed')}
              </span>
              <Button size="xs" variant="link" className="h-auto px-0" onClick={onResend}>
                {t('conversation.resend')}
              </Button>
              <Button
                size="xs"
                variant="link"
                className="h-auto px-0 text-muted-foreground"
                onClick={onDiscard}
              >
                {t('conversation.discard')}
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1">
              <LoaderCircleIcon className="size-3 animate-spin" />
              {pending.checking ? t('attachments.checking') : t('conversation.sending')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
