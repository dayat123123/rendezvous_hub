import { Link } from '@tanstack/react-router'
import {
  ActivityIcon,
  FileChartColumnIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  MegaphoneIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CopyButton } from '@/components/copy-button'
import { ReasonDialog } from '@/components/reason-dialog'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/controls'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryContent, SectionFrame, SettingsCard } from '@/features/settings/components/settings-ui'
import { ToneBadge } from '@/features/system/components/system-ui'
import { platformErrorText } from '@/lib/error-text'
import { appEnv } from '@/lib/supabase'
import { formatNumber, stamp } from '@/lib/time'
import { cn } from '@/lib/utils'

import {
  useDeleteIntegrationKey,
  useIntegrationKeys,
  useIntegrationOfficialAccounts,
  useRevokeIntegrationKey,
} from '../hooks'
import { curlExample, showsBroadcasts } from '../logic'
import { REVOKE_REASON_MAX, REVOKE_REASON_MIN, type IntegrationKey, type KeyStatus } from '../types'
import { BroadcastsDialog } from './broadcasts-dialog'
import { HealthUsage } from './health-usage'
import { KeyDialog, SecretDialog, type Revealed } from './key-dialog'
import { KeyStatsCard } from './key-stats'
import { ReportUsage } from './report-usage'

const statusTone: Record<KeyStatus, 'ok' | 'warn' | 'neutral'> = {
  active: 'ok',
  disabled: 'warn',
  revoked: 'neutral',
}

function KeyRow({
  item,
  onEdit,
  onRevoke,
  onDelete,
  onBroadcasts,
}: {
  item: IntegrationKey
  onEdit: () => void
  onRevoke: () => void
  onDelete: () => void
  onBroadcasts: () => void
}) {
  const { t } = useTranslation()
  const revoked = item.status === 'revoked'
  return (
    <TableRow className={cn('align-top', revoked && 'text-muted-foreground')}>
      <TableCell className="py-2 whitespace-normal">
        <p className="font-medium text-foreground">{item.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{item.hint}</p>
        {revoked ? (
          <p className="mt-1 max-w-72 text-xs break-words text-muted-foreground">
            {t('platform.keys.revokedBy', {
              time: item.revoked_at ? stamp(item.revoked_at) : '–',
              name: item.revoked_by?.name ?? '–',
              reason: item.revoke_reason ?? '–',
            })}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="py-2 whitespace-normal">
        <ul className="flex flex-col gap-0.5 text-xs">
          {item.scopes.map((scope) => (
            <li key={scope}>{t(`platform.keys.scopes.${scope}`)}</li>
          ))}
        </ul>
        {item.official_account ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('platform.keys.asAccount', { username: item.official_account.username })}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="py-2 font-mono text-xs whitespace-normal">
        {item.allowed_cidrs.length === 0 ? (
          <span className="font-sans text-muted-foreground">{t('platform.keys.anyIp')}</span>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {item.allowed_cidrs.map((cidr) => (
              <li key={cidr}>{cidr}</li>
            ))}
          </ul>
        )}
      </TableCell>
      <TableCell className="tabular py-2 text-right">{formatNumber(item.rate_limit_per_minute)}</TableCell>
      <TableCell className="py-2">
        <ToneBadge tone={statusTone[item.status]}>{t(`platform.keys.status.${item.status}`)}</ToneBadge>
      </TableCell>
      <TableCell className="py-2 text-xs whitespace-normal">
        {item.last_used_at ? (
          <>
            <span className="block">{stamp(item.last_used_at)}</span>
            {item.last_used_ip ? (
              <span className="block font-mono text-muted-foreground">{item.last_used_ip}</span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">{t('platform.keys.never')}</span>
        )}
      </TableCell>
      <TableCell className="py-2">
        <div className="flex justify-end gap-1">
          {showsBroadcasts(item.scopes) ? (
            <Button
              size="xs"
              variant="ghost"
              aria-label={t('platform.keys.broadcasts.openLabel', { name: item.name })}
              onClick={onBroadcasts}
            >
              <MegaphoneIcon />
              {t('platform.keys.broadcasts.open')}
            </Button>
          ) : null}
          {revoked ? (
            <Button
              size="xs"
              variant="ghost"
              className="text-destructive"
              aria-label={t('platform.keys.deleteLabel', { name: item.name })}
              onClick={onDelete}
            >
              <Trash2Icon />
              {t('platform.keys.delete')}
            </Button>
          ) : (
            <>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={t('platform.keys.editLabel', { name: item.name })}
                onClick={onEdit}
              >
                <PencilIcon />
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="text-destructive"
                aria-label={t('platform.keys.revokeLabel', { name: item.name })}
                onClick={onRevoke}
              >
                {t('platform.keys.revoke')}
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function KeysTable({
  keys,
  onEdit,
  onRevoke,
  onDelete,
  onBroadcasts,
}: {
  keys: IntegrationKey[]
  onEdit: (key: IntegrationKey) => void
  onRevoke: (key: IntegrationKey) => void
  onDelete: (key: IntegrationKey) => void
  onBroadcasts: (key: IntegrationKey) => void
}) {
  const { t } = useTranslation()
  if (keys.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 border-y py-6 text-row text-muted-foreground">
        <KeyRoundIcon className="size-4" aria-hidden="true" />
        {t('platform.keys.empty')}
      </p>
    )
  }
  return (
    <Table>
      <caption className="sr-only">{t('platform.keys.listTitle')}</caption>
      <TableHeader>
        <TableRow>
          <TableHead>{t('platform.keys.cols.name')}</TableHead>
          <TableHead>{t('platform.keys.cols.scopes')}</TableHead>
          <TableHead>{t('platform.keys.cols.cidrs')}</TableHead>
          <TableHead className="text-right">{t('platform.keys.cols.rate')}</TableHead>
          <TableHead>{t('platform.keys.cols.status')}</TableHead>
          <TableHead>{t('platform.keys.cols.lastUsed')}</TableHead>
          <TableHead>
            <span className="sr-only">{t('platform.keys.cols.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((item) => (
          <KeyRow
            key={item.id}
            item={item}
            onEdit={() => onEdit(item)}
            onRevoke={() => onRevoke(item)}
            onDelete={() => onDelete(item)}
            onBroadcasts={() => onBroadcasts(item)}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function HelpCard() {
  const { t } = useTranslation()
  const example = curlExample(appEnv().publicApiUrl ?? appEnv().supabaseUrl)
  return (
    <SettingsCard title={t('platform.keys.help.title')} subtitle={t('platform.keys.help.subtitle')}>
      <ol className="flex max-w-3xl list-decimal flex-col gap-1.5 pl-5 text-row">
        <li>{t('platform.keys.help.step1')}</li>
        <li>{t('platform.keys.help.step2')}</li>
        <li>{t('platform.keys.help.step3')}</li>
        <li>{t('platform.keys.help.step4')}</li>
      </ol>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t('platform.keys.help.example')}</h3>
          <CopyButton text={example} size="xs" label={t('platform.keys.help.example')} />
        </div>
        <pre className="max-w-full overflow-x-auto rounded-md border bg-subtle p-3 font-mono text-xs leading-relaxed">
          {example}
        </pre>
        <p className="text-xs text-muted-foreground">{t('platform.keys.help.statuses')}</p>
        <p className="text-xs text-muted-foreground">{t('platform.keys.help.docs')}</p>
      </div>
    </SettingsCard>
  )
}

const views = ['notify', 'health', 'reports'] as const
type View = (typeof views)[number]

function DeleteKeyDialog({ item, onClose }: { item: IntegrationKey | null; onClose: () => void }) {
  const { t } = useTranslation()
  const remove = useDeleteIntegrationKey()
  const close = () => {
    if (remove.isPending) return
    remove.reset()
    onClose()
  }
  return (
    <AlertDialog open={item !== null} onOpenChange={(next) => !next && close()}>
      <AlertDialogContent>
        <AlertDialogTitle>{t('platform.keys.deleteTitle', { name: item?.name ?? '' })}</AlertDialogTitle>
        <AlertDialogDescription>{t('platform.keys.deleteBody')}</AlertDialogDescription>
        <div className="flex justify-end gap-2">
          <AlertDialogCancel disabled={remove.isPending}>{t('app.cancel')}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => {
              if (!item) return
              remove
                .mutateAsync(item.id)
                .then(() => {
                  toast.success(t('platform.keys.deleted', { name: item.name }))
                  onClose()
                })
                .catch((error: unknown) => toast.error(platformErrorText(error)))
            }}
          >
            {remove.isPending ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : null}
            {t('platform.keys.delete')}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function UsageViews() {
  const { t } = useTranslation()
  const [view, setView] = useState<View>('notify')
  return (
    <section aria-label={t('platform.keys.views.label')} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t('platform.keys.views.label')}</h2>
        <ToggleGroup
          type="single"
          value={view}
          className="self-start"
          aria-label={t('platform.keys.views.label')}
          onValueChange={(value) => {
            if (views.includes(value as View)) setView(value as View)
          }}
        >
          <ToggleGroupItem value="notify">
            <MegaphoneIcon aria-hidden="true" />
            {t('platform.keys.views.notify')}
          </ToggleGroupItem>
          <ToggleGroupItem value="health">
            <ActivityIcon aria-hidden="true" />
            {t('platform.keys.views.health')}
          </ToggleGroupItem>
          <ToggleGroupItem value="reports">
            <FileChartColumnIcon aria-hidden="true" />
            {t('platform.keys.views.reports')}
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="max-w-3xl text-row text-muted-foreground">{t(`platform.keys.views.${view}Hint`)}</p>
      </div>
      {view === 'notify' ? (
        <>
          <KeyStatsCard />
          <HelpCard />
        </>
      ) : null}
      {view === 'health' ? (
        <SettingsCard title={t('platform.keys.health.title')} subtitle={t('platform.keys.health.subtitle')}>
          <HealthUsage />
        </SettingsCard>
      ) : null}
      {view === 'reports' ? (
        <SettingsCard title={t('platform.keys.reports.title')} subtitle={t('platform.keys.reports.subtitle')}>
          <ReportUsage />
          <Link
            to="/community"
            search={{ tab: 'reports' }}
            className="self-start text-row font-medium text-primary underline underline-offset-4"
          >
            {t('platform.keys.reports.open')}
          </Link>
        </SettingsCard>
      ) : null}
    </section>
  )
}

export function IntegrationKeysSection() {
  const { t } = useTranslation()
  const keys = useIntegrationKeys()
  const accounts = useIntegrationOfficialAccounts()
  const revoke = useRevokeIntegrationKey()
  const [editing, setEditing] = useState<IntegrationKey | null>(null)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<IntegrationKey | null>(null)
  const [deleting, setDeleting] = useState<IntegrationKey | null>(null)
  const [revealed, setRevealed] = useState<Revealed | null>(null)
  const [viewing, setViewing] = useState<IntegrationKey | null>(null)
  const formOpen = creating || editing !== null
  return (
    <SectionFrame
      title={t('platform.keys.title')}
      description={t('platform.keys.description')}
      action={
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon />
          {t('platform.keys.create')}
        </Button>
      }
    >
      <SettingsCard title={t('platform.keys.listTitle')} subtitle={t('platform.keys.listHint')}>
        <QueryContent query={keys}>
          {(items) => (
            <KeysTable
              keys={items}
              onEdit={setEditing}
              onRevoke={setRevoking}
              onDelete={setDeleting}
              onBroadcasts={setViewing}
            />
          )}
        </QueryContent>
      </SettingsCard>
      <UsageViews />
      {formOpen ? (
        <KeyDialog
          open
          editing={editing}
          accounts={accounts.data ?? null}
          accountsFailed={accounts.isError}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onReveal={setRevealed}
        />
      ) : null}
      <SecretDialog revealed={revealed} onClose={() => setRevealed(null)} />
      <BroadcastsDialog item={viewing} onClose={() => setViewing(null)} />
      <DeleteKeyDialog key={deleting?.id ?? 'none'} item={deleting} onClose={() => setDeleting(null)} />
      <ReasonDialog
        key={revoking?.id ?? 'none'}
        open={revoking !== null}
        title={t('platform.keys.revokeTitle', { name: revoking?.name ?? '' })}
        description={t('platform.keys.revokeBody')}
        label={t('platform.keys.revokeReason')}
        hint={t('platform.keys.revokeHint')}
        action={t('platform.keys.revoke')}
        destructive
        min={REVOKE_REASON_MIN}
        max={REVOKE_REASON_MAX}
        pending={revoke.isPending}
        onClose={() => setRevoking(null)}
        onSubmit={(reason) => {
          if (!revoking) return
          void revoke
            .mutateAsync({ id: revoking.id, reason })
            .then(() => {
              toast.success(t('platform.keys.revoked', { name: revoking.name }))
              setRevoking(null)
            })
            .catch((error: unknown) => toast.error(platformErrorText(error)))
        }}
      />
    </SectionFrame>
  )
}
