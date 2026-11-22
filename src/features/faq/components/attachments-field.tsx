import { ArrowDownIcon, ArrowUpIcon, LoaderCircleIcon, PaperclipIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldMessage } from '@/features/settings/components/settings-ui'
import { errorText } from '@/lib/error-text'
import { formatBytes } from '@/lib/time'

import { faqApi } from '../api'
import {
  FAQ_ATTACHMENT_ACCEPT,
  FAQ_ATTACHMENT_NAME_MAX,
  FAQ_MAX_ATTACHMENTS,
  FaqAttachmentError,
  attachmentFormat,
  attachmentNameValid,
  faqFileUrl,
  kindIcon,
  kindLabel,
  moveAttachment,
} from '../attachments'
import type { FaqAttachment } from '../types'

export function AttachmentsField({
  value,
  onChange,
  showErrors,
  disabled,
  onBusyChange,
}: {
  value: FaqAttachment[]
  onChange: Dispatch<SetStateAction<FaqAttachment[]>>
  showErrors: boolean
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (files: File[]) => {
    const room = FAQ_MAX_ATTACHMENTS - value.length
    if (files.length > room) toast.error(t('faq.attachmentTooMany'))
    const picked = files.slice(0, Math.max(room, 0))
    if (picked.length === 0) return
    setUploading(true)
    onBusyChange?.(true)
    let added = 0
    try {
      for (const file of picked) {
        const format = attachmentFormat(file)
        if (!format) {
          toast.error(t('faq.attachmentType', { name: file.name }))
          continue
        }
        if (format.kind !== 'image' && file.size > format.maxBytes) {
          toast.error(t('faq.attachmentTooLarge', { name: file.name, limit: formatBytes(format.maxBytes) }))
          continue
        }
        try {
          const attachment = await faqApi.uploadAttachment(file)
          onChange((current) => [...current, attachment])
          added += 1
        } catch (error) {
          if (error instanceof FaqAttachmentError) {
            toast.error(
              error.reason === 'type'
                ? t('faq.attachmentType', { name: file.name })
                : t('faq.attachmentTooLarge', { name: file.name, limit: formatBytes(error.limit) }),
            )
          } else {
            toast.error(errorText(error))
          }
        }
      }
      if (added > 0) toast.success(t('faq.attachmentsUploaded', { count: added }))
    } finally {
      setUploading(false)
      onBusyChange?.(false)
    }
  }

  const rename = (index: number, name: string) =>
    onChange(value.map((item, at) => (at === index ? { ...item, name } : item)))

  return (
    <section aria-labelledby="faq-attachments-title" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="faq-attachments-title" className="text-sm font-medium">
          {t('faq.attachments')} ({value.length}/{FAQ_MAX_ATTACHMENTS})
        </h3>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={disabled || uploading || value.length >= FAQ_MAX_ATTACHMENTS}
          onClick={() => input.current?.click()}
        >
          {uploading ? <LoaderCircleIcon className="animate-spin" /> : <PaperclipIcon />}
          {t('faq.addAttachment')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t('faq.attachmentsHelp')}</p>
      <input
        ref={input}
        type="file"
        multiple
        accept={FAQ_ATTACHMENT_ACCEPT}
        className="hidden"
        data-testid="faq-attachment-input"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length > 0) void upload(files)
        }}
      />
      {value.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {value.map((item, index) => {
            const Icon = kindIcon[item.kind]
            const invalid = showErrors && !attachmentNameValid(item.name)
            const label = item.name.trim() || String(index + 1)
            return (
              <li key={item.path} className="flex flex-col gap-1 rounded-lg border p-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Label htmlFor={`faq-attachment-${index}`} className="sr-only">
                    {t('faq.attachmentName', { index: index + 1 })}
                  </Label>
                  <Input
                    id={`faq-attachment-${index}`}
                    className="h-8 min-w-0 flex-1"
                    maxLength={FAQ_ATTACHMENT_NAME_MAX}
                    value={item.name}
                    aria-invalid={invalid ? true : undefined}
                    disabled={disabled}
                    onChange={(event) => rename(index, event.target.value)}
                  />
                  <a
                    href={faqFileUrl(item.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
                    aria-label={t('faq.attachmentOpen', { name: label })}
                  >
                    {t(kindLabel[item.kind])} · {formatBytes(item.size)}
                  </a>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('faq.attachmentUp', { name: label })}
                    disabled={disabled || index === 0}
                    onClick={() => onChange(moveAttachment(value, index, -1))}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('faq.attachmentDown', { name: label })}
                    disabled={disabled || index === value.length - 1}
                    onClick={() => onChange(moveAttachment(value, index, 1))}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('faq.attachmentRemove', { name: label })}
                    disabled={disabled}
                    onClick={() => onChange(value.filter((_, at) => at !== index))}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                {invalid ? <FieldMessage error={t('faq.attachmentNameHint')} /> : null}
              </li>
            )
          })}
        </ol>
      ) : null}
    </section>
  )
}
