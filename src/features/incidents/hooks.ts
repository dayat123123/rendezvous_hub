import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { incidentsApi } from './api'
import type { Incident, IncidentDraft } from './types'

export const incidentKeys = { list: ['admin', 'incidents'] as const }

function usePutIncident() {
  const client = useQueryClient()
  return (incident: Incident) =>
    client.setQueryData<Incident[]>(incidentKeys.list, (items = []) =>
      (items.some((item) => item.id === incident.id)
        ? items.map((item) => (item.id === incident.id ? incident : item))
        : [incident, ...items]
      ).sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    )
}

export function useIncidents() {
  return useQuery({ queryKey: incidentKeys.list, queryFn: incidentsApi.list })
}

export function useSaveIncident() {
  const put = usePutIncident()
  return useMutation({ mutationFn: (draft: IncidentDraft) => incidentsApi.save(draft), onSuccess: put })
}

export function useEndIncident() {
  const put = usePutIncident()
  return useMutation({ mutationFn: (id: string) => incidentsApi.end(id), onSuccess: put })
}
