import type { TopicIcon } from '@/features/settings/types'

export const faqStatuses = ['draft', 'published', 'archived'] as const
export type FaqStatus = (typeof faqStatuses)[number]

export const faqSorts = ['order', 'views', 'helpful', 'updated'] as const
export type FaqSort = (typeof faqSorts)[number]

export type FaqCategory = {
  id: string
  code: string
  name_id: string
  name_en: string
  icon: TopicIcon | null
  sort_order: number
  active: boolean
  updated_at: string
  article_count: number
}

export type FaqCategoryDraft = Omit<FaqCategory, 'id' | 'updated_at' | 'article_count'> & {
  id: string | null
}

export type FaqContent = {
  category_id: string
  question_id: string
  question_en: string
  answer_id: string
  answer_en: string
  keywords: string[]
  topic_code: string | null
  sort_order: number
}

export type FaqArticle = FaqContent & {
  id: string
  status: FaqStatus
  version: number
  views: number
  readers: number
  helpful: number
  not_helpful: number
  tickets_after: number
  created_at: string
  updated_at: string
  updated_by_name: string | null
  published_at: string | null
}

export type FaqArticleDraft = FaqContent & { id: string | null; version: number | null }

export type FaqOverview = { categories: FaqCategory[]; articles: FaqArticle[] }

export type FaqVersion = {
  version: number
  content: FaqContent
  created_at: string
  created_by_name: string | null
}

export type FaqComment = { helpful: boolean; comment: string; updated_at: string }

export type FaqMiss = { query: string; language: 'id' | 'en'; count: number; last_at: string }
