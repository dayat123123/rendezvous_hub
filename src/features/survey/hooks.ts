import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { surveyApi } from './api'
import type { SurveyConfig } from './types'

export const surveyKeys = { config: ['admin', 'survey-config'] as const }

export function useSurveyConfig() {
  return useQuery({ queryKey: surveyKeys.config, queryFn: surveyApi.config })
}

export function useSaveSurveyConfig() {
  const { t } = useTranslation()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (config: SurveyConfig) => surveyApi.save(config),
    onSuccess: (saved) => {
      client.setQueryData(surveyKeys.config, saved)
      toast.success(t('app.saved'))
    },
  })
}
