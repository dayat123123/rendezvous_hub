import { useTranslation } from 'react-i18next'

import { useAgent } from '@/features/auth/hooks'

import { staffName, type StaffRef } from './logic'

export function useStaffName() {
  const { t } = useTranslation()
  const me = useAgent()
  return (ref: StaffRef) =>
    staffName(ref, me.id, { you: t('app.you'), staff: t('trade.detail.actors.staff') })
}
