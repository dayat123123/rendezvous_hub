import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { shareLinksApi } from './api'
import type { ShareLinksSettings } from './types'

export const shareLinksKeys = { status: ['admin', 'share-links'] as const }

export function useShareLinks() {
  return useQuery({ queryKey: shareLinksKeys.status, queryFn: shareLinksApi.status })
}

export function useSaveShareLinks() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (settings: ShareLinksSettings) => shareLinksApi.save(settings),
    onSuccess: (status) => client.setQueryData(shareLinksKeys.status, status),
  })
}
