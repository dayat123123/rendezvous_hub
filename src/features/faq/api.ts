import { fitImage } from '@/features/conversation/clipboard'
import { toApiError } from '@/lib/errors'
import { appEnv, rpc, supabase } from '@/lib/supabase'
import { uuid } from '@/lib/utils'

import type {
  AgentFaqArticle,
  FaqArticle,
  FaqArticleDraft,
  FaqCategory,
  FaqCategoryDraft,
  FaqComment,
  FaqFlag,
  FaqMiss,
  FaqOverview,
  FaqStatus,
  FaqVersion,
} from './types'

export const FAQ_BUCKET = 'faq-images'
const FAQ_IMAGE_MAX_BYTES = 2 * 1024 * 1024
const imageExtension: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

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
  flags: (id: string) => rpc<FaqFlag[]>('admin_faq_flags', { p_id: id }),
  resolveFlags: (id: string) => rpc<FaqFlag[]>('admin_faq_resolve_flags', { p_id: id }),
  agentSearch: (query: string, language: 'id' | 'en') =>
    rpc<AgentFaqArticle[]>('agent_faq_search', { p_query: query, p_language: language }),
  agentFlag: (articleId: string, note: string) =>
    rpc<{ id: number }>('agent_flag_faq', { p_article_id: articleId, p_note: note }),
  uploadImage: async (image: File) => {
    const file = await fitImage(image, FAQ_IMAGE_MAX_BYTES)
    const path = `${uuid()}.${imageExtension[file.type] ?? 'jpg'}`
    const { error } = await supabase().storage.from(FAQ_BUCKET).upload(path, file, { contentType: file.type })
    if (error) throw toApiError(error)
    return `${appEnv().publicApiUrl ?? appEnv().supabaseUrl}/storage/v1/object/public/${FAQ_BUCKET}/${path}`
  },
}
