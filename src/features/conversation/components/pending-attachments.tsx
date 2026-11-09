import { XIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { fileKind, fileLabelType, fileSize } from '../media'
import type { LocalAttachment } from '../types'
import { DocumentLabel } from './attachment-file'

export function PendingAttachments({
  files,
  onRemove,
}: {
  files: LocalAttachment[]
  onRemove: (file: LocalAttachment) => void
}) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<LocalAttachment | null>(null)
  if (files.length === 0) return null
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <div key={file.id} className="relative">
          {fileKind(file.file) !== 'images' ? (
            <div className="flex h-14 w-52 items-center gap-2 rounded-md border px-2.5">
              <DocumentLabel name={file.file.name} size={file.file.size} type={fileLabelType(file.file)} />
            </div>
          ) : (
            <button
              type="button"
              aria-label={t('composer.previewImage', { name: file.file.name })}
              onClick={() => setPreview(file)}
              className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <img src={file.preview} alt="" className="size-14 rounded-md border object-cover" />
            </button>
          )}
          <button
            type="button"
            aria-label={t('composer.removeAttachment', { name: file.file.name })}
            onClick={() => onRemove(file)}
            className="absolute -top-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent
          className="max-w-[min(92vw,1100px)] border-0 bg-media p-2 sm:max-w-[min(92vw,1100px)]"
          closeLabel={t('app.close')}
        >
          <DialogTitle className="sr-only">{t('composer.previewTitle')}</DialogTitle>
          <DialogDescription className="sr-only">
            {preview ? `${preview.file.name} · ${fileSize(preview.file.size)}` : ''}
          </DialogDescription>
          {preview ? (
            <div className="flex max-h-[85vh] flex-col items-center gap-2">
              <img
                src={preview.preview}
                alt={preview.file.name}
                className="max-h-[80vh] w-auto rounded-md object-contain"
              />
              <p className="tabular text-xs text-media-foreground">
                {preview.file.name} · {fileSize(preview.file.size)}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
