import { useTranslation } from 'react-i18next'

import { formatBytes } from '@/lib/time'

import { faqFileUrl, kindIcon, kindLabel } from '../attachments'
import type { FaqAttachment } from '../types'

export function FaqAttachmentList({ attachments }: { attachments: FaqAttachment[] | undefined }) {
  const { t } = useTranslation()
  if (!attachments || attachments.length === 0) return null
  return (
    <ul aria-label={t('faq.attachments')} className="mt-3 flex flex-col gap-1.5">
      {attachments.map((attachment) => {
        const Icon = kindIcon[attachment.kind]
        return (
          <li key={attachment.path}>
            <a
              href={faqFileUrl(attachment.path)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('faq.attachmentOpen', { name: attachment.name })}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-row outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium">{attachment.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t(kindLabel[attachment.kind])} · {formatBytes(attachment.size)}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
