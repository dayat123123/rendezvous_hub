import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { realtime } from '@/lib/realtime'

import { noticesApi } from './api'

export const noticeKeys = { list: ['compliance', 'notices'] as const }

export function useComplianceNotices(enabled: boolean) {
  return useQuery({
    queryKey: noticeKeys.list,
    queryFn: noticesApi.list,
    enabled,
    refetchInterval: 120_000,
  })
}

export function useComplianceNoticeRealtime(enabled: boolean) {
  const client = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    return realtime.onNotice(() => void client.invalidateQueries({ queryKey: noticeKeys.list }))
  }, [client, enabled])
}

export function useMarkNoticesSeen() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: noticesApi.seen,
    onSuccess: (data) => client.setQueryData(noticeKeys.list, data),
  })
}
