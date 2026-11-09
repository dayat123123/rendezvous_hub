import { rpc } from '@/lib/supabase'
import type { Json } from '@/types/database'

import type { AdminSurveyConfig, SurveyConfig } from './types'

export const surveyApi = {
  config: () => rpc<AdminSurveyConfig>('admin_survey_config'),
  save: (config: SurveyConfig) =>
    rpc<AdminSurveyConfig>('admin_set_survey_config', { p_config: config as unknown as Json }),
}
