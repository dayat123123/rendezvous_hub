import { rpc } from '@/lib/supabase'

import { expiryInstant } from './logic'
import type {
  HoldInput,
  RetentionChange,
  RetentionHold,
  RetentionKey,
  RetentionOverview,
  RetentionPreview,
  RunResult,
} from './types'

export const retentionApi = {
  overview: async (): Promise<RetentionOverview> => {
    const raw = await rpc<RetentionOverview>('retention_overview')
    return {
      ...raw,
      rules: raw.rules ?? [],
      changes: raw.changes ?? [],
      holds: raw.holds ?? [],
      runs: (raw.runs ?? []).map((run) => ({
        ...run,
        deleted: run.deleted ?? {},
        capped: run.capped ?? [],
        errors: run.errors ?? {},
      })),
    }
  },
  preview: () => rpc<RetentionPreview>('retention_preview'),
  requestChange: (key: RetentionKey, value: number, reason: string) =>
    rpc<RetentionChange>('retention_request_change', { p_key: key, p_value: value, p_reason: reason.trim() }),
  decide: (id: number, approve: boolean, note: string) =>
    rpc<RetentionChange>('retention_decide_change', {
      p_id: id,
      p_approve: approve,
      p_note: note.trim() || null,
    }),
  cancel: (id: number, note: string) =>
    rpc<RetentionChange>('retention_cancel_change', { p_id: id, p_note: note.trim() }),
  addHold: (input: HoldInput) =>
    rpc<RetentionHold>('retention_add_hold', {
      p_target_type: input.targetType,
      p_target: input.target.trim(),
      p_reason: input.reason.trim(),
      p_reference: input.reference.trim() || null,
      p_expires_at: expiryInstant(input.expiresOn),
    }),
  releaseHold: (id: string, note: string) =>
    rpc<RetentionHold>('retention_release_hold', { p_id: id, p_note: note.trim() }),
  runNow: () => rpc<RunResult>('retention_run_now'),
}
