import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { communityKeys } from '../hooks'
import { finreportApi } from './api'
import { ACTIVE_REFRESH_MS, IDLE_REFRESH_MS, hasActiveFiles } from './logic'
import type { FilesFilter, ReportDetail } from './types'

export const finreportKeys = {
  all: ['community', 'finreport'] as const,
  files: (filter: FilesFilter) => ['community', 'finreport', 'files', filter.status, filter.entity] as const,
  report: (id: string) => ['community', 'finreport', 'report', id] as const,
  config: ['community', 'finreport', 'config'] as const,
}

export function useFinreportFiles(filter: FilesFilter) {
  return useInfiniteQuery({
    queryKey: finreportKeys.files(filter),
    queryFn: ({ pageParam }) => finreportApi.files(filter, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_before,
    placeholderData: (previous) => previous,
    staleTime: 5_000,
    refetchInterval: (query) =>
      hasActiveFiles(query.state.data?.pages.flatMap((page) => page.items) ?? [])
        ? ACTIVE_REFRESH_MS
        : IDLE_REFRESH_MS,
  })
}

export function useFinreportReport(id: string | null) {
  return useQuery({
    queryKey: finreportKeys.report(id ?? ''),
    queryFn: () => finreportApi.report(id as string),
    enabled: Boolean(id),
    staleTime: 10_000,
  })
}

export function useFinreportConfig() {
  return useQuery({ queryKey: finreportKeys.config, queryFn: finreportApi.config, staleTime: 30_000 })
}

function useRefreshFiles() {
  const client = useQueryClient()
  return () => void client.invalidateQueries({ queryKey: [...finreportKeys.all, 'files'] })
}

export function useUploadReport() {
  const refresh = useRefreshFiles()
  return useMutation({
    mutationFn: ({ file, agentId }: { file: File; agentId: string }) => finreportApi.upload(file, agentId),
    onSuccess: refresh,
  })
}

export function useRetryFile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => finreportApi.retry(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: finreportKeys.all }),
  })
}

export function useCreateReportPost() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => finreportApi.createPost(id),
    onSuccess: (report: ReportDetail) => {
      client.setQueryData(finreportKeys.report(report.id), report)
      void client.invalidateQueries({ queryKey: [...finreportKeys.all, 'files'] })
      void client.invalidateQueries({ queryKey: communityKeys.posts })
      void client.invalidateQueries({ queryKey: communityKeys.overview })
    },
  })
}

export function useSaveFinreportConfig() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ account, autoPublish }: { account: string | null; autoPublish: boolean }) =>
      finreportApi.saveConfig(account, autoPublish),
    onSuccess: (config) => {
      client.setQueryData(finreportKeys.config, config)
      void client.invalidateQueries({ queryKey: [...finreportKeys.all, 'files'] })
    },
  })
}
