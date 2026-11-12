import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { instrumentsApi } from './api'
import type { InstrumentDraft, MarketInstrument } from './types'

export const instrumentKeys = {
  all: ['community', 'instruments'] as const,
}

export function useInstruments() {
  return useQuery({
    queryKey: instrumentKeys.all,
    queryFn: instrumentsApi.list,
    staleTime: 15_000,
    refetchInterval: 60_000,
  })
}

export function useInstrumentCheck() {
  return useMutation({
    mutationFn: (args: { code: string; aliases: string[] }) => instrumentsApi.check(args.code, args.aliases),
  })
}

function useInvalidate() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: instrumentKeys.all })
    void client.invalidateQueries({ queryKey: ['community', 'room'] })
  }
}

export function useSaveInstrument() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (draft: InstrumentDraft) => instrumentsApi.save(draft),
    onSettled: invalidate,
  })
}

function useListMutation<TArgs>(run: (args: TArgs) => Promise<MarketInstrument[]>) {
  const client = useQueryClient()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: run,
    onSuccess: (items) => client.setQueryData(instrumentKeys.all, items),
    onError: invalidate,
  })
}

export const useReorderInstruments = () => useListMutation((codes: string[]) => instrumentsApi.reorder(codes))

export function useDeleteInstrument() {
  const client = useQueryClient()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (code: string) => instrumentsApi.remove(code),
    onSuccess: (items) => {
      client.setQueryData(instrumentKeys.all, items)
      void client.invalidateQueries({ queryKey: ['community', 'room'] })
    },
    onError: invalidate,
  })
}
