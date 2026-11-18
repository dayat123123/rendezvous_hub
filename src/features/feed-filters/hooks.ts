import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { feedFiltersApi } from './api'

export const feedFilterKeys = {
  all: ['feed-filters'] as const,
}

export function useFeedFilters() {
  return useQuery({ queryKey: feedFilterKeys.all, queryFn: feedFiltersApi.list, staleTime: 15_000 })
}

export function useSetFeedFilterEnabled() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (args: { key: string; enabled: boolean }) =>
      feedFiltersApi.setEnabled(args.key, args.enabled),
    onSuccess: (filters) => client.setQueryData(feedFilterKeys.all, filters),
    onError: () => void client.invalidateQueries({ queryKey: feedFilterKeys.all }),
  })
}
