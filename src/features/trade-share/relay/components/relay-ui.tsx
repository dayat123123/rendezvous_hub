import { useTranslation } from 'react-i18next'

import { ToneBadge } from '@/features/system/components/system-ui'

import type { InstanceHealth } from '../logic'

const healthTones: Record<InstanceHealth, 'ok' | 'late' | 'warn' | 'neutral'> = {
  connected: 'ok',
  disconnected: 'late',
  idle: 'neutral',
  stale: 'warn',
}

export function HealthBadge({ health }: { health: InstanceHealth }) {
  const { t } = useTranslation()
  return <ToneBadge tone={healthTones[health]}>{t(`trade.relay.health.${health}`)}</ToneBadge>
}
