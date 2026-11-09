import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { faqApi } from './api'
import type { FaqArticle, FaqArticleDraft, FaqCategoryDraft, FaqOverview, FaqStatus } from './types'

export const faqKeys = {
  overview: ['faq', 'overview'] as const,
  versions: (id: string) => ['faq', 'versions', id] as const,
  comments: (id: string) => ['faq', 'comments', id] as const,
  misses: (days: number) => ['faq', 'misses', days] as const,
}

function useReplaceArticle() {
  const client = useQueryClient()
  return (article: FaqArticle) => {
    client.setQueryData<FaqOverview>(faqKeys.overview, (data) => {
      if (!data) return data
      const exists = data.articles.some((item) => item.id === article.id)
      return {
        ...data,
        articles: exists
          ? data.articles.map((item) => (item.id === article.id ? article : item))
          : [...data.articles, article],
      }
    })
    void client.invalidateQueries({ queryKey: faqKeys.versions(article.id) })
  }
}

export function useFaq() {
  return useQuery({ queryKey: faqKeys.overview, queryFn: faqApi.overview })
}

export function useSaveFaqCategory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (draft: FaqCategoryDraft) => faqApi.saveCategory(draft),
    onSuccess: () => void client.invalidateQueries({ queryKey: faqKeys.overview }),
  })
}

export function useSaveFaqArticle() {
  const replace = useReplaceArticle()
  return useMutation({
    mutationFn: (draft: FaqArticleDraft) => faqApi.saveArticle(draft),
    onSuccess: replace,
  })
}

export function useSetFaqStatus() {
  const replace = useReplaceArticle()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FaqStatus }) => faqApi.setStatus(id, status),
    onSuccess: replace,
  })
}

export function useFaqVersions(id: string) {
  return useQuery({ queryKey: faqKeys.versions(id), queryFn: () => faqApi.versions(id) })
}

export function useRestoreFaqVersion() {
  const replace = useReplaceArticle()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => faqApi.restore(id, version),
    onSuccess: replace,
  })
}

export function useFaqComments(id: string) {
  return useQuery({ queryKey: faqKeys.comments(id), queryFn: () => faqApi.comments(id) })
}

export function useFaqMisses(days: number) {
  return useQuery({ queryKey: faqKeys.misses(days), queryFn: () => faqApi.misses(days) })
}
