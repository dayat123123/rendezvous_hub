import { rpc } from '@/lib/supabase'

import type {
  FaqArticle,
  FaqArticleDraft,
  FaqCategory,
  FaqCategoryDraft,
  FaqComment,
  FaqMiss,
  FaqOverview,
  FaqStatus,
  FaqVersion,
} from './types'

export const faqApi = {
  overview: () => rpc<FaqOverview>('admin_faq'),
  saveCategory: (draft: FaqCategoryDraft) =>
    rpc<FaqCategory>('admin_faq_save_category', {
      p_id: draft.id,
      p_code: draft.code,
      p_name_id: draft.name_id,
      p_name_en: draft.name_en,
      p_icon: draft.icon,
      p_sort_order: draft.sort_order,
      p_active: draft.active,
    }),
  saveArticle: (draft: FaqArticleDraft) =>
    rpc<FaqArticle>('admin_faq_save_article', {
      p_id: draft.id,
      p_category_id: draft.category_id,
      p_question_id: draft.question_id,
      p_question_en: draft.question_en,
      p_answer_id: draft.answer_id,
      p_answer_en: draft.answer_en,
      p_keywords: draft.keywords,
      p_topic_code: draft.topic_code,
      p_sort_order: draft.sort_order,
      p_version: draft.version,
    }),
  setStatus: (id: string, status: FaqStatus) =>
    rpc<FaqArticle>('admin_faq_set_status', { p_id: id, p_status: status }),
  versions: (id: string) => rpc<FaqVersion[]>('admin_faq_versions', { p_id: id }),
  restore: (id: string, version: number) =>
    rpc<FaqArticle>('admin_faq_restore', { p_id: id, p_version: version }),
  comments: (id: string) => rpc<FaqComment[]>('admin_faq_feedback', { p_id: id }),
  misses: (days: number) => rpc<FaqMiss[]>('admin_faq_misses', { p_days: days }),
}
