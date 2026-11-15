import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { relayApi } from './api'
import { relayPending } from './logic'
import type { AesInput, RelayCommand, RelayConfigInput, RelayView } from './types'

export const relayKeys = { view: ['trade-relay', 'view'] as const }

export function useRelayView() {
  return useQuery({
    queryKey: relayKeys.view,
    queryFn: relayApi.get,
    refetchInterval: (query) => (relayPending(query.state.data) ? 5_000 : 15_000),
    staleTime: 3_000,
  })
}

function useRelayMutation<T>(run: (input: T) => Promise<RelayView>, secret = false) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (view) => client.setQueryData(relayKeys.view, view),
    onError: () => void client.invalidateQueries({ queryKey: relayKeys.view }),
    gcTime: secret ? 0 : undefined,
  })
}

export const useRelayCommand = () =>
  useRelayMutation(({ action, reason }: { action: RelayCommand; reason: string }) =>
    relayApi.command(action, reason),
  )

export const useUpdateRelay = () =>
  useRelayMutation(({ input, reason }: { input: RelayConfigInput; reason: string }) =>
    relayApi.update(input, reason),
  )

export const useSetRelayAes = () =>
  useRelayMutation(
    ({ input, reason }: { input: AesInput; reason: string }) => relayApi.setAes(input, reason),
    true,
  )

export const useClearRelayAes = () => useRelayMutation((reason: string) => relayApi.clearAes(reason))

export const useSetTradeNotify = () =>
  useRelayMutation(({ enabled, reason }: { enabled: boolean; reason: string }) =>
    relayApi.setNotify(enabled, reason),
  )
