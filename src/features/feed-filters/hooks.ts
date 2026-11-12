import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { feedFiltersApi } from './api'
import type { FeedFilter, FeedFilterDraft } from './types'

export const feedFilterKeys = {
  all: ['feed-filters'] as const,
}

export function useFeedFilters() {
  return useQuery({ queryKey: feedFilterKeys.all, queryFn: feedFiltersApi.list, staleTime: 15_000 })
}

function useListMutation<TArgs>(run: (args: TArgs) => Promise<FeedFilter[]>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (filters) => client.setQueryData(feedFilterKeys.all, filters),
    onError: () => void client.invalidateQueries({ queryKey: feedFilterKeys.all }),
  })
}

export function useSaveFeedFilter() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (draft: FeedFilterDraft) => feedFiltersApi.save(draft),
    onSettled: () => void client.invalidateQueries({ queryKey: feedFilterKeys.all }),
  })
}

export const useReorderFeedFilters = () => useListMutation((keys: string[]) => feedFiltersApi.reorder(keys))

export const useDeleteFeedFilter = () => useListMutation((key: string) => feedFiltersApi.remove(key))
