import {
  BellRingIcon,
  CalendarClockIcon,
  DatabaseBackupIcon,
  KeyRoundIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  MessagesSquareIcon,
  PaperclipIcon,
  PlugZapIcon,
  SirenIcon,
  SlidersHorizontalIcon,
  SmartphoneIcon,
  TagIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionBoundary } from '@/components/states'
import { AppIntegrationSection } from '@/features/app-integration/components/app-integration-section'
import { useAgent } from '@/features/auth/hooks'
import { IntegrationKeysSection } from '@/features/integration-keys/components/keys-section'
import { LabelsSection } from '@/features/labels/components/labels-section'
import { PushSection } from '@/features/push/components/push-section'
import { PushInactiveBadge } from '@/features/push/components/push-state'
import { cn } from '@/lib/utils'

import { settingsGroupOrder, settingsGroups, type SettingsSection } from '../types'
import { AccountsSection } from './accounts-section'
import { AlertsSection } from './alerts-section'
import { AttachmentsSection } from './attachments-section'
import { AssignmentSection } from './assignment-section'
import { BackupSection } from './backup-section'
import { CommunitySection } from './community-section'
import { HoursSection } from './hours-section'
import { IntegrationBadge, IntegrationSection } from './integration-section'
import { MessagesSection } from './messages-section'
import { QuickRepliesSection } from './quick-replies-section'

const icons: Record<SettingsSection, React.ComponentType<{ className?: string }>> = {
  accounts: UsersIcon,
  quickReplies: MessageSquareTextIcon,
  ticketLabels: TagIcon,
  hours: CalendarClockIcon,
  messages: MessagesSquareIcon,
  attachments: PaperclipIcon,
  assignment: SlidersHorizontalIcon,
  community: MegaphoneIcon,
  integration: PlugZapIcon,
  appIntegration: SmartphoneIcon,
  apiKeys: KeyRoundIcon,
  push: BellRingIcon,
  backup: DatabaseBackupIcon,
  alerts: SirenIcon,
}

const content: Record<SettingsSection, () => React.ReactNode> = {
  accounts: () => <AccountsSection />,
  ticketLabels: () => <LabelsSection />,
  quickReplies: () => <QuickRepliesSection />,
  hours: () => <HoursSection />,
  messages: () => <MessagesSection />,
  attachments: () => <AttachmentsSection />,
  assignment: () => <AssignmentSection />,
  community: () => <CommunitySection />,
  push: () => <PushSection />,
  integration: () => <IntegrationSection />,
  appIntegration: () => <AppIntegrationSection />,
  apiKeys: () => <IntegrationKeysSection />,
  backup: () => <BackupSection />,
  alerts: () => <AlertsSection />,
}

export function SettingsPage() {
  const { t } = useTranslation()
  const [section, setSection] = useState<SettingsSection>('accounts')
  const settings = useAgent().settings
  const badges: Partial<Record<SettingsSection, React.ReactNode>> = {
    integration: settings.nasabah_ready ? null : <IntegrationBadge configured={false} />,
    push: settings.community_push_ready ? null : <PushInactiveBadge />,
  }
  return (
    <div className="flex h-full flex-col md:flex-row">
      <nav
        aria-label={t('settings.title')}
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b bg-subtle p-2 md:w-56 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-b-0 md:p-3"
      >
        <h1 className="hidden px-2.5 pt-1 pb-3 text-panel font-semibold md:block">{t('settings.title')}</h1>
        {settingsGroupOrder.map((group, index) => (
          <div
            key={group}
            role="group"
            aria-labelledby={`settings-group-${group}`}
            className={cn(
              'flex shrink-0 items-center gap-0.5 md:flex-col md:items-stretch',
              index > 0 && 'ml-1 border-l pl-2 md:mt-3 md:ml-0 md:border-l-0 md:pl-0',
            )}
          >
            <h2
              id={`settings-group-${group}`}
              className="shrink-0 px-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground md:px-2.5 md:pb-1"
            >
              {t(`settings.groups.${group}`)}
            </h2>
            {settingsGroups[group].map((id) => {
              const Icon = icons[id]
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={section === id ? 'page' : undefined}
                  onClick={() => setSection(id)}
                  className={cn(
                    'inline-flex min-h-8 shrink-0 items-center gap-2.5 rounded-md px-2.5 py-1 text-left text-row whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                    section === id && 'bg-selected font-medium text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {badges[id] ? (
                    <span className="flex flex-col items-start gap-1 md:py-0.5">
                      {t(`settings.${id}`)} {badges[id]}
                    </span>
                  ) : (
                    t(`settings.${id}`)
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SectionBoundary key={section} label={`settings:${section}`}>
          {content[section]()}
        </SectionBoundary>
      </div>
    </div>
  )
}
