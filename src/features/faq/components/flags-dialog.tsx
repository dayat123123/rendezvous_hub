import { LoaderCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dot } from '@/components/badges'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Confirm } from '@/features/nasabah/components/confirm'
import { FormError, QueryContent } from '@/features/settings/components/settings-ui'
import { stamp } from '@/lib/time'

import { useFaqFlags, useResolveFaqFlags } from '../hooks'
import type { FaqArticle } from '../types'

export function FlagsDialog({ article, onClose }: { article: FaqArticle; onClose: () => void }) {
  const { t } = useTranslation()
  const flags = useFaqFlags(article.id)
  const resolve = useResolveFaqFlags(article.id)
  const [confirming, setConfirming] = useState(false)
  const open = (flags.data ?? []).filter((flag) => flag.resolved_at === null).length
  return (
    <Dialog open onOpenChange={(next) => !next && !resolve.isPending && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        closeLabel={t('app.close')}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t('help.faqFlags.title', { question: article.question_id })}</DialogTitle>
        </DialogHeader>
        <QueryContent query={flags}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('help.faqFlags.empty')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((flag) => (
                  <li key={flag.id} className="flex gap-2 rounded-lg border p-3">
                    <Dot tone={flag.resolved_at ? 'neutral' : 'warn'} className="mt-1.5" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm whitespace-pre-line">{flag.note}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('help.faqFlags.by', {
                          name: flag.agent_name ?? '–',
                          time: stamp(flag.created_at),
                        })}
                      </span>
                      {flag.resolved_at ? (
                        <span className="text-xs text-muted-foreground">
                          {t('help.faqFlags.resolvedBy', {
                            name: flag.resolved_by_name ?? '–',
                            time: stamp(flag.resolved_at),
                          })}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryContent>
        <FormError error={resolve.error} />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('app.close')}
          </Button>
          <Button
            type="button"
            disabled={open === 0 || resolve.isPending}
            onClick={() => setConfirming(true)}
          >
            {resolve.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
            {t('help.faqFlags.resolve')}
          </Button>
        </DialogFooter>
        <Confirm
          open={confirming}
          title={t('help.faqFlags.confirmTitle')}
          body={t('help.faqFlags.confirmBody', { count: open })}
          action={t('help.faqFlags.resolve')}
          pending={resolve.isPending}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            resolve.mutate(undefined, {
              onSuccess: () => {
                setConfirming(false)
                toast.success(t('help.faqFlags.resolved'))
              },
              onError: () => setConfirming(false),
            })
          }
        />
      </DialogContent>
    </Dialog>
  )
}
