import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Json } from '@/types/database'

import { tradeShareApi } from './api'
import { nextBefore, profileQuery, profileQueryValid } from './logic'
import {
  TRADE_PAGE_SIZE,
  type Decision,
  type ExcludedAccount,
  type ExcludedStock,
  type FlagStatus,
  type PilotInvite,
  type SubscriptionStatus,
  type TradeFlag,
  type TradeSetting,
  type TradeSharerDetail,
  type TraderStatus,
} from './types'

export const tradeShareKeys = {
  all: ['trade-share'] as const,
  lists: ['trade-share', 'list'] as const,
  list: (status: TraderStatus | null) => ['trade-share', 'list', status] as const,
  detail: (profile: string) => ['trade-share', 'detail', profile] as const,
  subscribers: (profile: string, status: SubscriptionStatus | null) =>
    ['trade-share', 'subscribers', profile, status] as const,
  dashboard: ['trade-share', 'dashboard'] as const,
  flags: (status: FlagStatus) => ['trade-share', 'flags', status] as const,
  excludedAccounts: ['trade-share', 'excluded-accounts'] as const,
  excludedStocks: ['trade-share', 'excluded-stocks'] as const,
  pilotInvites: ['trade-share', 'pilot-invites'] as const,
  settings: ['trade-share', 'settings'] as const,
  profiles: (query: string) => ['trade-share', 'profiles', query] as const,
}

export function useTraderList(status: TraderStatus | null) {
  return useInfiniteQuery({
    queryKey: tradeShareKeys.list(status),
    queryFn: ({ pageParam }) => tradeShareApi.list(status, pageParam, TRADE_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => nextBefore(page, TRADE_PAGE_SIZE, (item) => item.applied_at),
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  })
}

export function useTraderDetail(profile: string | null) {
  return useQuery({
    queryKey: tradeShareKeys.detail(profile ?? ''),
    queryFn: () => tradeShareApi.detail(profile ?? ''),
    enabled: profile !== null,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useSubscribers(profile: string, status: SubscriptionStatus | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: tradeShareKeys.subscribers(profile, status),
    queryFn: ({ pageParam }) => tradeShareApi.subscribers(profile, status, pageParam, TRADE_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => nextBefore(page, TRADE_PAGE_SIZE, (item) => item.requested_at),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

type TraderChange =
  | { action: 'decide'; decision: Decision; reason: string }
  | { action: 'suspend'; reason: string; until: string | null }
  | { action: 'reinstate'; reason: string }
  | { action: 'revoke'; reason: string }

function runChange(profile: string, change: TraderChange) {
  switch (change.action) {
    case 'decide':
      return tradeShareApi.decide(profile, change.decision, change.reason)
    case 'suspend':
      return tradeShareApi.suspend(profile, change.reason, change.until)
    case 'reinstate':
      return tradeShareApi.reinstate(profile, change.reason)
    case 'revoke':
      return tradeShareApi.revoke(profile, change.reason)
  }
}

export function useTraderChange(profile: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (change: TraderChange) => runChange(profile, change),
    onSuccess: (detail: TradeSharerDetail) => {
      client.setQueryData(tradeShareKeys.detail(profile), detail)
      void client.invalidateQueries({ queryKey: tradeShareKeys.lists })
      void client.invalidateQueries({ queryKey: tradeShareKeys.dashboard })
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: tradeShareKeys.detail(profile) })
      void client.invalidateQueries({ queryKey: tradeShareKeys.lists })
    },
  })
}

export function useTradeDashboard() {
  return useQuery({
    queryKey: tradeShareKeys.dashboard,
    queryFn: tradeShareApi.dashboard,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}

export function useTradeFlags(status: FlagStatus) {
  return useQuery({
    queryKey: tradeShareKeys.flags(status),
    queryFn: () => tradeShareApi.flags(status, 200),
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  })
}

export function useReviewFlag() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => tradeShareApi.reviewFlag(id, note),
    onSuccess: (open: TradeFlag[]) => {
      client.setQueryData(tradeShareKeys.flags('open'), open)
      void client.invalidateQueries({ queryKey: tradeShareKeys.flags('reviewed') })
      void client.invalidateQueries({ queryKey: tradeShareKeys.dashboard })
    },
    onError: () => void client.invalidateQueries({ queryKey: tradeShareKeys.flags('open') }),
  })
}

export function useTradeExport() {
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => tradeShareApi.exportCsv(from, to),
    gcTime: 0,
  })
}

function useListMutation<T, R>(
  key: readonly unknown[],
  run: (input: T) => Promise<R[]>,
  related: readonly unknown[] = tradeShareKeys.lists,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (items: R[]) => {
      client.setQueryData(key, items)
      void client.invalidateQueries({ queryKey: related })
    },
    onError: () => void client.invalidateQueries({ queryKey: key }),
  })
}

export function useExcludedAccounts() {
  return useQuery({ queryKey: tradeShareKeys.excludedAccounts, queryFn: tradeShareApi.excludedAccounts })
}

export const useExcludeAccount = () =>
  useListMutation<{ custId: string; reason: string }, ExcludedAccount>(
    tradeShareKeys.excludedAccounts,
    ({ custId, reason }) => tradeShareApi.excludeAccount(custId, reason),
  )

export const useUnexcludeAccount = () =>
  useListMutation<{ custId: string; reason: string }, ExcludedAccount>(
    tradeShareKeys.excludedAccounts,
    ({ custId, reason }) => tradeShareApi.unexcludeAccount(custId, reason),
  )

export function useExcludedStocks() {
  return useQuery({ queryKey: tradeShareKeys.excludedStocks, queryFn: tradeShareApi.excludedStocks })
}

export const useExcludeStock = () =>
  useListMutation<{ stock: string; reason: string; until: string | null }, ExcludedStock>(
    tradeShareKeys.excludedStocks,
    ({ stock, reason, until }) => tradeShareApi.excludeStock(stock, reason, until),
  )

export const useUnexcludeStock = () =>
  useListMutation<{ stock: string; reason: string }, ExcludedStock>(
    tradeShareKeys.excludedStocks,
    ({ stock, reason }) => tradeShareApi.unexcludeStock(stock, reason),
  )

export function usePilotInvites() {
  return useQuery({ queryKey: tradeShareKeys.pilotInvites, queryFn: tradeShareApi.pilotInvites })
}

export const useSetPilotInvite = () =>
  useListMutation<{ profile: string; invited: boolean }, PilotInvite>(
    tradeShareKeys.pilotInvites,
    ({ profile, invited }) => tradeShareApi.setPilotInvite(profile, invited),
    ['trade-share', 'profiles'],
  )

export function useTradeSettings() {
  return useQuery({ queryKey: tradeShareKeys.settings, queryFn: tradeShareApi.settings })
}

export function useUpdateTradeSetting() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value, reason }: { key: string; value: Json; reason: string }) =>
      tradeShareApi.updateSetting(key, value, reason),
    onSuccess: (settings: TradeSetting[]) => {
      client.setQueryData(tradeShareKeys.settings, settings)
      void client.invalidateQueries({ queryKey: tradeShareKeys.dashboard })
      void client.invalidateQueries({ queryKey: tradeShareKeys.lists })
    },
    onError: () => void client.invalidateQueries({ queryKey: tradeShareKeys.settings }),
  })
}

export function useProfileSearch(query: string) {
  const text = profileQuery(query)
  return useQuery({
    queryKey: tradeShareKeys.profiles(text),
    queryFn: () => tradeShareApi.findProfiles(text),
    enabled: profileQueryValid(text),
    placeholderData: (previous) => previous,
  })
}
