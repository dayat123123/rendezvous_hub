import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { retentionApi } from './api'
import type { HoldInput, RetentionKey } from './types'

export const retentionKeys = {
  all: ['compliance', 'retention'] as const,
  overview: ['compliance', 'retention', 'overview'] as const,
}

export function useRetentionOverview() {
  return useQuery({
    queryKey: retentionKeys.overview,
    queryFn: retentionApi.overview,
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  })
}

function useRefresh() {
  const client = useQueryClient()
  return () => void client.invalidateQueries({ queryKey: retentionKeys.all })
}

export function useRetentionPreview() {
  return useMutation({ mutationFn: retentionApi.preview })
}

export function useRequestChange() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ key, value, reason }: { key: RetentionKey; value: number; reason: string }) =>
      retentionApi.requestChange(key, value, reason),
    onSuccess: refresh,
  })
}

export function useDecideChange() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: number; approve: boolean; note: string }) =>
      retentionApi.decide(id, approve, note),
    onSuccess: refresh,
  })
}

export function useCancelChange() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => retentionApi.cancel(id, note),
    onSuccess: refresh,
  })
}

export function useAddHold() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (input: HoldInput) => retentionApi.addHold(input), onSuccess: refresh })
}

export function useReleaseHold() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => retentionApi.releaseHold(id, note),
    onSuccess: refresh,
  })
}

export function useRunNow() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: retentionApi.runNow, onSuccess: refresh })
}
