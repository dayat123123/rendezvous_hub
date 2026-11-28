import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { shareLinksKeys } from '@/features/share-links/hooks'

import { appIdentityApi } from './api'
import type { AppIdentity } from './types'

export const appIdentityKeys = { status: ['admin', 'app-identity'] as const }

export function useAppIdentity() {
  return useQuery({ queryKey: appIdentityKeys.status, queryFn: appIdentityApi.status })
}

export function useSaveAppIdentity() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (identity: AppIdentity) => appIdentityApi.save(identity),
    onSuccess: (status) => {
      client.setQueryData(appIdentityKeys.status, status)
      void client.invalidateQueries({ queryKey: shareLinksKeys.status })
    },
  })
}
