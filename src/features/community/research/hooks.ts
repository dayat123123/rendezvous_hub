import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { communityKeys } from '../hooks'
import { researchApi } from './api'
import { ACTIVE_REFRESH_MS, IDLE_REFRESH_MS, hasActiveFiles } from './logic'
import type { FilesFilter, ReportDetail } from './types'

export const researchKeys = {
  all: ['community', 'research'] as const,
  files: (filter: FilesFilter) => ['community', 'research', 'files', filter.status, filter.entity] as const,
  report: (id: string) => ['community', 'research', 'report', id] as const,
  config: ['community', 'research', 'config'] as const,
}

export function useResearchFiles(filter: FilesFilter) {
  return useInfiniteQuery({
    queryKey: researchKeys.files(filter),
    queryFn: ({ pageParam }) => researchApi.files(filter, pageParam),
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

export function useResearchReport(id: string | null) {
  return useQuery({
    queryKey: researchKeys.report(id ?? ''),
    queryFn: () => researchApi.report(id as string),
    enabled: Boolean(id),
    staleTime: 10_000,
  })
}

export function useResearchConfig() {
  return useQuery({ queryKey: researchKeys.config, queryFn: researchApi.config, staleTime: 30_000 })
}

function useRefreshFiles() {
  const client = useQueryClient()
  return () => void client.invalidateQueries({ queryKey: [...researchKeys.all, 'files'] })
}

export function useUploadReport() {
  const refresh = useRefreshFiles()
  return useMutation({
    mutationFn: ({ file, agentId }: { file: File; agentId: string }) => researchApi.upload(file, agentId),
    onSuccess: refresh,
  })
}

export function useRetryFile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => researchApi.retry(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: researchKeys.all }),
  })
}

export function useCreateReportPost() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => researchApi.createPost(id),
    onSuccess: (report: ReportDetail) => {
      client.setQueryData(researchKeys.report(report.id), report)
      void client.invalidateQueries({ queryKey: [...researchKeys.all, 'files'] })
      void client.invalidateQueries({ queryKey: communityKeys.posts })
      void client.invalidateQueries({ queryKey: communityKeys.overview })
    },
  })
}

export function useSaveResearchConfig() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ account, autoPublish }: { account: string | null; autoPublish: boolean }) =>
      researchApi.saveConfig(account, autoPublish),
    onSuccess: (config) => {
      client.setQueryData(researchKeys.config, config)
      void client.invalidateQueries({ queryKey: [...researchKeys.all, 'files'] })
    },
  })
}
