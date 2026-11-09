import type { FaqArticle, FaqSort, FaqStatus } from './types'

export function helpfulPercent(article: Pick<FaqArticle, 'helpful' | 'not_helpful'>) {
  const total = article.helpful + article.not_helpful
  return total === 0 ? null : Math.round((article.helpful / total) * 100)
}

export function parseKeywords(text: string) {
  const seen = new Set<string>()
  for (const part of text.split(',')) {
    const keyword = part.trim().toLowerCase()
    if (keyword) seen.add(keyword)
  }
  return [...seen]
}

export type FaqFilter = { query: string; status: FaqStatus | 'all'; category: string; sort: FaqSort }

const byOrder = (a: FaqArticle, b: FaqArticle) =>
  a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)

const comparators: Record<FaqSort, (a: FaqArticle, b: FaqArticle) => number> = {
  order: byOrder,
  views: (a, b) => b.views - a.views || byOrder(a, b),
  helpful: (a, b) => (helpfulPercent(a) ?? 101) - (helpfulPercent(b) ?? 101) || byOrder(a, b),
  updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
}

export function filterArticles(articles: FaqArticle[], filter: FaqFilter) {
  const query = filter.query.trim().toLowerCase()
  return articles
    .filter(
      (article) =>
        (filter.status === 'all' ? article.status !== 'archived' : article.status === filter.status) &&
        (filter.category === 'all' || article.category_id === filter.category) &&
        (query === '' ||
          [
            article.question_id,
            article.question_en,
            article.answer_id,
            article.answer_en,
            ...article.keywords,
          ].some((text) => text.toLowerCase().includes(query))),
    )
    .sort(comparators[filter.sort])
}
