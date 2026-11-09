import { PlayIcon, VideoIcon, VideoOffIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/primitives'

import { useSignedUrl } from '../hooks'
import { duration, fileSize, VIDEO_BUCKET } from '../media'
import type { Attachment } from '../types'
import { DownloadButton } from './attachment-file'

export function AttachmentVideo({ attachment }: { attachment: Attachment }) {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)
  const bucket = attachment.bucket ?? VIDEO_BUCKET
  const thumbnail = useSignedUrl(attachment.thumbnail ?? '', bucket, {
    enabled: Boolean(attachment.thumbnail),
  })
  const video = useSignedUrl(attachment.path, bucket, { enabled: playing, long: true })
  const name = attachment.name || t('attachments.videoFallback')
  const length = duration(attachment.duration)
  const ratio =
    attachment.width && attachment.height
      ? Math.min(Math.max(attachment.width / attachment.height, 0.5), 2)
      : 16 / 9
  const failed = broken || video.isError

  return (
    <div className="flex w-64 max-w-full flex-col gap-1">
      <div
        className="relative overflow-hidden rounded-lg border border-current/20 bg-media text-media-foreground"
        style={{ aspectRatio: String(ratio) }}
      >
        {failed ? (
          <div className="flex size-full items-center justify-center gap-1.5 text-xs">
            <VideoOffIcon className="size-4" aria-hidden />
            {t('attachments.videoFailed')}
          </div>
        ) : playing && video.data ? (
          <video
            controls
            autoPlay
            preload="metadata"
            src={video.data}
            poster={thumbnail.data}
            aria-label={name}
            onError={() => setBroken(true)}
            className="size-full object-contain"
          />
        ) : playing ? (
          <Skeleton className="size-full rounded-none" />
        ) : (
          <button
            type="button"
            aria-label={t('attachments.play', { name })}
            onClick={() => setPlaying(true)}
            className="group/play relative block size-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {thumbnail.data ? (
              <img
                src={thumbnail.data}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <VideoIcon className="absolute top-1/2 left-1/2 size-8 -translate-1/2 opacity-50" aria-hidden />
            )}
            <span className="absolute top-1/2 left-1/2 flex size-11 -translate-1/2 items-center justify-center rounded-full bg-media text-media-foreground opacity-85 transition-opacity group-hover/play:opacity-100">
              <PlayIcon className="ml-0.5 size-5 fill-current" aria-hidden />
            </span>
            {length ? (
              <span className="tabular absolute right-1.5 bottom-1.5 rounded-sm bg-media px-1.5 py-0.5 text-xs text-media-foreground opacity-85">
                {length}
              </span>
            ) : null}
          </button>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-1 pl-1 text-xs">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{name}</span>
          <span className="tabular block opacity-75">
            {[t('attachments.types.video'), length, fileSize(attachment.size)].filter(Boolean).join(' · ')}
          </span>
        </span>
        <DownloadButton path={attachment.path} bucket={bucket} name={name} />
      </div>
    </div>
  )
}
