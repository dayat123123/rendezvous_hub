import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { shareLinksApi } from './api'
import type { DateRange } from '@/features/reports/types'

import type { ShareLinksSettings } from './types'

export const shareLinksKeys = {
  status: ['admin', 'share-links'] as const,
  stats: (range: DateRange) => ['admin', 'share-links', 'stats', range.from, range.to] as const,
}

export function useShareLinks() {
  return useQuery({ queryKey: shareLinksKeys.status, queryFn: shareLinksApi.status })
}

export function useShareLinkStatsRange(range: DateRange) {
  return useQuery({
    queryKey: shareLinksKeys.stats(range),
    queryFn: () => shareLinksApi.stats(range),
    placeholderData: (previous) => previous,
  })
}

export function useSaveShareLinks() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (settings: ShareLinksSettings) => shareLinksApi.save(settings),
    onSuccess: (status) => client.setQueryData(shareLinksKeys.status, status),
  })
}
