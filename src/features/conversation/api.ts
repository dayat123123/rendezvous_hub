import { ApiError, toApiError } from '@/lib/errors'
import { appEnv, rpc, supabase } from '@/lib/supabase'
import { uuid } from '@/lib/utils'

import { AFTER_LIMIT } from './cache'
import { identifyFile, IMAGE_BUCKET, parsePolicy, type AttachmentPolicy } from './media'
import type {
  Attachment,
  ChatMessage,
  PersonalQuickReply,
  PersonalReplyDraft,
  QuickReply,
  RoomMember,
  SendKind,
  SendResult,
} from './types'

export const PAGE_SIZE = 50

function normalize(message: ChatMessage): ChatMessage {
  return { ...message, attachments: message.attachments ?? [], payload: message.payload ?? {} }
}

export async function imageSize(file: File) {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return { width: null, height: null }
  }
}

export type SignedUrlOptions = { download?: string; expiresIn?: number }

type MediaReply = {
  bucket?: string
  path: string
  mime: string
  size?: number
  width?: number
  height?: number
  duration?: number
  thumbnail?: string
}

async function mediaUpload(bucket: string, path: string, file: File, mime: string): Promise<MediaReply> {
  const env = appEnv()
  const { data } = await supabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiError('session_expired', undefined, 401)
  let response: Response
  try {
    response = await fetch(`${env.supabaseUrl}/media/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: { apikey: env.anonKey, Authorization: `Bearer ${token}`, 'Content-Type': mime },
      body: file,
    })
  } catch (error) {
    throw toApiError(error)
  }
  const body: unknown = await response.json().catch(() => null)
  const reply = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  if (!response.ok) {
    const fallback = response.status === 413 ? 'file_too_large' : 'unavailable'
    const code = typeof reply.code === 'string' ? reply.code : fallback
    if (code === 'invalid_token') throw new ApiError('session_expired', undefined, 401)
    throw new ApiError(code, typeof reply.message === 'string' ? reply.message : undefined, response.status)
  }
  if (typeof reply.path !== 'string' || typeof reply.mime !== 'string') throw new ApiError('unavailable')
  return reply as MediaReply
}

export type SendInput = {
  ticketId: string
  body: string
  clientId: string
  kind?: SendKind
  payload?: Record<string, unknown>
  replyToId?: string
  attachments?: Attachment[]
}

export const conversationApi = {
  page: async (roomId: string, cursor?: string) =>
    (
      await rpc<ChatMessage[]>('get_messages', { p_room_id: roomId, p_cursor: cursor, p_limit: PAGE_SIZE })
    ).map(normalize),
  after: async (roomId: string, cursor: string) =>
    (
      await rpc<ChatMessage[]>('get_messages', { p_room_id: roomId, p_after: cursor, p_limit: AFTER_LIMIT })
    ).map(normalize),
  send: async (input: SendInput): Promise<SendResult> => {
    const result = await rpc<{ status: string; message?: unknown; code?: string }>('agent_send_message', {
      p_ticket_id: input.ticketId,
      p_body: input.body,
      p_client_id: input.clientId,
      p_kind: input.kind ?? 'text',
      p_payload: (input.payload ?? {}) as never,
      p_reply_to_id: input.replyToId,
      p_attachments: (input.attachments ?? []) as never,
    })
    if (result.status === 'sent' && result.message && typeof result.message === 'object') {
      return { status: 'sent', message: normalize(result.message as ChatMessage) }
    }
    return {
      status: 'blocked',
      code: result.code,
      message: typeof result.message === 'string' ? result.message : undefined,
    }
  },
  markRead: (roomId: string) => rpc<null>('mark_read', { p_room_id: roomId }),
  members: (roomId: string) => rpc<RoomMember[]>('room_members', { p_room_id: roomId }),
  quickReplies: (language: string) => rpc<QuickReply[]>('quick_replies', { p_language: language }),
  myQuickReplies: () => rpc<PersonalQuickReply[]>('my_quick_replies'),
  saveMyQuickReply: (draft: PersonalReplyDraft) =>
    rpc<PersonalQuickReply>('save_my_quick_reply', {
      p_id: draft.id,
      p_title: draft.title,
      p_body: draft.body,
      p_shortcut: draft.shortcut === '' ? null : draft.shortcut,
    }),
  deleteMyQuickReply: (id: string) => rpc<{ deleted: boolean }>('delete_my_quick_reply', { p_id: id }),
  addNote: (body: string, target: { ticketId?: string; customerId?: string }) =>
    rpc<unknown>('add_note', {
      p_body: body,
      p_ticket_id: target.ticketId,
      p_customer_id: target.customerId,
    }),
  attachmentPolicy: async (): Promise<AttachmentPolicy> =>
    parsePolicy(await rpc<unknown>('attachment_policy')),
  upload: async (
    roomId: string,
    userId: string,
    file: File,
    policy: AttachmentPolicy,
  ): Promise<Attachment> => {
    const format = identifyFile(file)
    const kind = format?.kind ?? 'images'
    const ext = format?.ext ?? 'jpg'
    const path = `rooms/${roomId}/${userId}/${uuid()}.${ext}`
    if (kind === 'images') {
      const { error } = await supabase()
        .storage.from(IMAGE_BUCKET)
        .upload(path, file, { contentType: format?.mime ?? file.type })
      if (error) throw toApiError(error)
      const size = await imageSize(file)
      return { path, mime: format?.mime ?? file.type, width: size.width, height: size.height }
    }
    const stored = await mediaUpload(policy[kind].bucket, path, file, format?.mime ?? file.type)
    const attachment: Attachment = {
      bucket: stored.bucket ?? policy[kind].bucket,
      path: stored.path,
      mime: stored.mime,
      name: file.name.slice(0, 200),
      size: stored.size ?? file.size,
    }
    if (kind === 'videos') {
      attachment.duration = stored.duration ?? null
      attachment.width = stored.width ?? null
      attachment.height = stored.height ?? null
      if (stored.thumbnail) attachment.thumbnail = stored.thumbnail
    }
    return attachment
  },
  signedUrl: async (path: string, bucket = 'attachments', options: SignedUrlOptions = {}) => {
    const { data, error } = await supabase()
      .storage.from(bucket)
      .createSignedUrl(
        path,
        options.expiresIn ?? 120,
        options.download ? { download: options.download } : undefined,
      )
    if (error) throw toApiError(error)
    return data.signedUrl
  },
}
