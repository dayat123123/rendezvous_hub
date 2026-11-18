import { BellIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import { useAgent } from '@/features/auth/hooks'
import { Confirm } from '@/features/nasabah/components/confirm'
import { bannerErrorText } from '@/lib/error-text'
import { formatNumber, stamp } from '@/lib/time'
import { cn } from '@/lib/utils'

import { useCancelNotice, useReviewNotice } from '../hooks'
import { noticeCancellable, type BannerNotice, type BannerNoticeStatus } from '../types'

const tone: Record<BannerNoticeStatus, string> = {
  pending: 'text-warning',
  scheduled: 'text-muted-foreground',
  queued: 'text-muted-foreground',
  sending: 'text-muted-foreground',
  sent: 'text-muted-foreground',
  rejected: 'text-destructive',
  cancelled: 'text-muted-foreground',
  failed: 'text-destructive',
}

export function BannerNoticeLine({ notice, title }: { notice: BannerNotice; title: string }) {
  const { t } = useTranslation()
  const me = useAgent()
  const review = useReviewNotice()
  const cancel = useCancelNotice()
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const mine = notice.created_by?.id === me.id
  const pending = notice.status === 'pending'
  const done = (message: string) => {
    toast.success(message)
    setDialog(null)
  }
  const fail = (error: unknown) => toast.error(bannerErrorText(error))
  const text = (() => {
    switch (notice.status) {
      case 'pending':
        return t('platform.banners.notice.pending')
      case 'scheduled':
        return t('platform.banners.notice.scheduled', { time: stamp(notice.send_at) })
      case 'queued':
      case 'sending':
        return t('platform.banners.notice.sending', { recipients: formatNumber(notice.recipients) })
      case 'sent':
        return t('platform.banners.notice.sent', {
          recipients: formatNumber(notice.recipients),
          opened: formatNumber(notice.opened),
          tapped: formatNumber(notice.tapped),
        })
      case 'rejected':
        return t('platform.banners.notice.rejected', {
          name: notice.reviewed_by?.name ?? '–',
          note: notice.review_note ?? '–',
        })
      case 'cancelled':
        return t('platform.banners.notice.cancelled')
      case 'failed':
        return t('platform.banners.notice.failed')
    }
  })()
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={cn('inline-flex items-center gap-1', tone[notice.status])}>
        <BellIcon className="size-3.5 shrink-0" aria-hidden />
        {text}
      </span>
      {pending && mine ? (
        <span className="text-muted-foreground">{t('platform.banners.notice.waitingOther')}</span>
      ) : null}
      {pending && !mine ? (
        <>
          <Button size="xs" variant="outline" onClick={() => setDialog('approve')}>
            {t('platform.banners.notice.approve')}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setDialog('reject')}>
            {t('platform.banners.notice.reject')}
          </Button>
        </>
      ) : null}
      {noticeCancellable(notice.status) ? (
        <Button size="xs" variant="ghost" onClick={() => setDialog('cancel')}>
          {t('platform.banners.notice.cancel')}
        </Button>
      ) : null}
      <Confirm
        open={dialog === 'approve'}
        title={t('platform.banners.notice.approveTitle')}
        body={t('platform.banners.notice.approveBody', { title })}
        action={t('platform.banners.notice.approve')}
        pending={review.isPending}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          void review
            .mutateAsync({ id: notice.id, approve: true })
            .then(() => done(t('platform.banners.notice.approved')))
            .catch(fail)
        }
      />
      <ReasonDialog
        open={dialog === 'reject'}
        title={t('platform.banners.notice.rejectTitle')}
        description={t('platform.banners.notice.rejectBody', { title })}
        label={t('platform.banners.notice.rejectReason')}
        action={t('platform.banners.notice.reject')}
        destructive
        min={5}
        max={500}
        pending={review.isPending}
        onClose={() => setDialog(null)}
        onSubmit={(note) =>
          void review
            .mutateAsync({ id: notice.id, approve: false, note })
            .then(() => done(t('platform.banners.notice.rejectedToast')))
            .catch(fail)
        }
      />
      <Confirm
        open={dialog === 'cancel'}
        title={t('platform.banners.notice.cancelTitle')}
        body={t('platform.banners.notice.cancelBody', { title })}
        action={t('platform.banners.notice.cancel')}
        destructive
        pending={cancel.isPending}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          void cancel
            .mutateAsync(notice.id)
            .then(() => done(t('platform.banners.notice.cancelled')))
            .catch(fail)
        }
      />
    </div>
  )
}
