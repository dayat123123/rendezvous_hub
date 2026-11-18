import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/controls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryContent, SectionFrame, SettingsCard } from '@/features/settings/components/settings-ui'
import { feedFilterErrorText } from '@/lib/error-text'
import { stamp } from '@/lib/time'

import { useFeedFilters, useSetFeedFilterEnabled } from '../hooks'
import type { FeedFilter } from '../types'

function Preview({ filters }: { filters: FeedFilter[] }) {
  const { t } = useTranslation()
  const shown = filters.filter((filter) => filter.enabled)
  return (
    <figure className="flex flex-col gap-1.5" aria-label={t('platform.feedFilters.previewTitle')}>
      <figcaption className="text-xs text-muted-foreground">
        {t('platform.feedFilters.previewTitle')}
      </figcaption>
      {shown.length === 0 ? (
        <p className="text-row text-warning">{t('platform.feedFilters.previewEmpty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((filter, index) => (
            <li
              key={filter.key}
              className={
                index === 0
                  ? 'rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background'
                  : 'rounded-full border px-3 py-1 text-xs text-muted-foreground'
              }
            >
              {filter.label_id}
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

function FeedFiltersCard({ filters }: { filters: FeedFilter[] }) {
  const { t } = useTranslation()
  const setEnabled = useSetFeedFilterEnabled()

  const toggle = (filter: FeedFilter, enabled: boolean) =>
    setEnabled
      .mutateAsync({ key: filter.key, enabled })
      .then(() =>
        toast.success(
          enabled
            ? t('platform.feedFilters.turnedOn', { name: filter.label_id })
            : t('platform.feedFilters.turnedOff', { name: filter.label_id }),
        ),
      )
      .catch((error: unknown) => toast.error(feedFilterErrorText(error)))

  return (
    <SettingsCard title={t('platform.feedFilters.title')} subtitle={t('platform.feedFilters.subtitle')}>
      <Preview filters={filters} />
      <Table>
        <caption className="sr-only">{t('platform.feedFilters.title')}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{t('platform.feedFilters.cols.tab')}</TableHead>
            <TableHead>{t('platform.feedFilters.cols.rule')}</TableHead>
            <TableHead>{t('platform.feedFilters.cols.enabled')}</TableHead>
            <TableHead>{t('platform.feedFilters.cols.updated')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filters.map((filter) => (
            <TableRow key={filter.key} className="align-top">
              <TableCell className="py-2 whitespace-normal">
                <p className="text-row font-medium">{filter.label_id}</p>
                <p className="text-xs text-muted-foreground">
                  {t('platform.feedFilters.english', { label: filter.label_en })}
                </p>
              </TableCell>
              <TableCell className="py-2 text-xs whitespace-normal">
                <span className="block">{t(`platform.feedFilters.sorts.${filter.sort}`)}</span>
                <span className="block text-muted-foreground">
                  {t(`platform.feedFilters.contents.${filter.content ?? 'all'}`)}
                </span>
              </TableCell>
              <TableCell className="py-2">
                <Switch
                  checked={filter.enabled}
                  disabled={setEnabled.isPending}
                  aria-label={t('platform.feedFilters.enableLabel', { name: filter.label_id })}
                  onCheckedChange={(enabled) => void toggle(filter, enabled)}
                />
              </TableCell>
              <TableCell className="py-2 text-xs whitespace-normal text-muted-foreground">
                {filter.updated_at
                  ? filter.updated_by?.name
                    ? t('platform.versions.changedBy', {
                        time: stamp(filter.updated_at),
                        name: filter.updated_by.name,
                      })
                    : t('platform.versions.changed', { time: stamp(filter.updated_at) })
                  : '–'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsCard>
  )
}

export function FeedFiltersSection() {
  const { t } = useTranslation()
  const filters = useFeedFilters()
  return (
    <SectionFrame
      title={t('platform.feedFilters.pageTitle')}
      description={t('platform.feedFilters.pageDescription')}
    >
      <QueryContent query={filters}>{(data) => <FeedFiltersCard filters={data} />}</QueryContent>
    </SectionFrame>
  )
}
