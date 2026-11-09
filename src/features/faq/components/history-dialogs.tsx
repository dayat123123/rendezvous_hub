import { ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormError, QueryContent } from '@/features/settings/components/settings-ui'
import { stamp } from '@/lib/time'

import { useFaqComments, useFaqVersions, useRestoreFaqVersion } from '../hooks'
import type { FaqArticle } from '../types'

export function VersionsDialog({ article, onClose }: { article: FaqArticle; onClose: () => void }) {
  const { t } = useTranslation()
  const versions = useFaqVersions(article.id)
  const restore = useRestoreFaqVersion()
  const [confirm, setConfirm] = useState<number | null>(null)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" closeLabel={t('app.close')}>
        <DialogHeader>
          <DialogTitle>{t('faq.historyTitle', { question: article.question_id })}</DialogTitle>
        </DialogHeader>
        <QueryContent query={versions}>
          {(items) => (
            <ol className="flex flex-col gap-2">
              {items.map((item) => (
                <li key={item.version} className="flex flex-col gap-1 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {t('faq.versionLabel', { version: item.version })}
                      {item.version === article.version ? (
                        <span className="ml-2 text-xs text-muted-foreground">{t('faq.currentVersion')}</span>
                      ) : null}
                    </span>
                    {item.version !== article.version ? (
                      <Button size="xs" variant="outline" onClick={() => setConfirm(item.version)}>
                        {t('faq.restore')}
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.created_by_name
                      ? t('settings.lastChangedBy', {
                          time: stamp(item.created_at),
                          name: item.created_by_name,
                        })
                      : t('settings.lastChanged', { time: stamp(item.created_at) })}
                  </p>
                  <p className="text-sm">{item.content.question_id}</p>
                  <p className="line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">
                    {item.content.answer_id}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </QueryContent>
        <FormError error={restore.error} />
      </DialogContent>
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('faq.restoreTitle', { version: confirm ?? 0 })}</AlertDialogTitle>
          <AlertDialogDescription>{t('faq.restoreBody')}</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm === null) return
                restore.mutate(
                  { id: article.id, version: confirm },
                  { onSuccess: () => toast.success(t('faq.restored', { version: confirm })) },
                )
              }}
            >
              {t('faq.restore')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

export function CommentsDialog({ article, onClose }: { article: FaqArticle; onClose: () => void }) {
  const { t } = useTranslation()
  const comments = useFaqComments(article.id)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" closeLabel={t('app.close')}>
        <DialogHeader>
          <DialogTitle>{t('faq.commentsTitle', { question: article.question_id })}</DialogTitle>
        </DialogHeader>
        <QueryContent query={comments}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('faq.noComments')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((item, index) => (
                  <li key={`${item.updated_at}-${index}`} className="flex gap-2 rounded-lg border p-3">
                    {item.helpful ? (
                      <ThumbsUpIcon
                        className="size-4 shrink-0 text-signal-success"
                        aria-label={t('faq.helpfulYes')}
                      />
                    ) : (
                      <ThumbsDownIcon
                        className="size-4 shrink-0 text-signal-danger"
                        aria-label={t('faq.helpfulNo')}
                      />
                    )}
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm whitespace-pre-line">{item.comment}</span>
                      <span className="text-xs text-muted-foreground">{stamp(item.updated_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryContent>
      </DialogContent>
    </Dialog>
  )
}
