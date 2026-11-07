import { gatewayRequest } from '@/lib/gateway'
import { rpc } from '@/lib/supabase'

import { mergeUserSearch, slicePage, toList, toPage, userSearches } from './logic'
import {
  PAGE_SIZE,
  SEARCH_MAX_PAGES,
  SEARCH_PAGE_SIZE,
  type Approval,
  type ApprovalFilter,
  type ApprovalLink,
  type CatalogAccount,
  type LinkedAccount,
  type OnlineUser,
  type OpeningAccount,
  type OnlineUserProfile,
  type OpeningFilter,
  type Page,
  type TicketLogin,
} from './types'

type Message = { message?: string }

const onlineUserPage = async (page: number, size: number, search: Record<string, string> = {}) =>
  toPage<OnlineUser>(
    await gatewayRequest('GET', '/online/get-list-online-user', { page, size, ...search }),
    page,
    size,
  )

async function collectOnlineUsers(search: Record<string, string>) {
  const first = await onlineUserPage(1, SEARCH_PAGE_SIZE, search)
  const pages = Math.min(first.totalPages, SEARCH_MAX_PAGES)
  const rest = await Promise.all(
    Array.from({ length: Math.max(pages - 1, 0) }, (_, index) =>
      onlineUserPage(index + 2, SEARCH_PAGE_SIZE, search),
    ),
  )
  return { rows: [first, ...rest].flatMap((part) => part.rows), limited: first.totalPages > SEARCH_MAX_PAGES }
}

export const nasabahApi = {
  users: async (page: number, query: string): Promise<Page<OnlineUser>> => {
    if (!query.trim()) return onlineUserPage(page, PAGE_SIZE)
    const found = await Promise.all(userSearches(query).map(collectOnlineUsers))
    return slicePage(
      mergeUserSearch(
        query,
        found.map((part) => part.rows),
      ),
      page,
      PAGE_SIZE,
      found.some((part) => part.limited),
    )
  },
  ticketLogin: (ticketId: string) => rpc<TicketLogin>('ticket_customer_login', { p_ticket_id: ticketId }),
  onlineUser: async (loginId: string) =>
    (
      await gatewayRequest<{ data: OnlineUserProfile }>('GET', '/online/get-online-user', {
        loginId: loginId.trim(),
      })
    ).data,
  linkedAccounts: async (loginId: string) =>
    toList<LinkedAccount>(await gatewayRequest('GET', '/online/get-linked-account-online-user', { loginId })),
  catalog: async () => toList<CatalogAccount>(await gatewayRequest('GET', '/online/get-list-link-account')),
  submit: (payload: Record<string, unknown>) =>
    gatewayRequest<Message>('POST', '/online/create-approval-login', {}, payload),
  resetCredential: (loginId: string, kind: 'password' | 'pin') =>
    gatewayRequest<Message>(
      'POST',
      '/online/change-password-and-pin-online-user',
      {},
      {
        LoginId: loginId,
        ActionType: kind === 'password' ? 0 : 1,
      },
    ),
  approvals: async (page: number, filter: ApprovalFilter, submitter: string): Promise<Page<Approval>> =>
    toPage(
      await gatewayRequest('GET', '/online/get-list-approval-online-user', {
        page,
        size: PAGE_SIZE,
        status: filter.status,
        actionType: filter.action,
        loginId: filter.query.trim() || undefined,
        createdBy: submitter.trim() || undefined,
      }),
      page,
      PAGE_SIZE,
    ),
  approvalLinks: async (approvalId: number) =>
    toList<ApprovalLink>(
      await gatewayRequest('GET', '/online/get-approval-linked-account-online-user', { approvalId }),
    ),
  decide: (approval: Pick<Approval, 'ApprovalId' | 'LoginId'>, approve: boolean) =>
    gatewayRequest<Message>(
      'POST',
      '/online/approve-approval-login',
      {},
      {
        ApprovalId: approval.ApprovalId,
        LoginId: approval.LoginId,
        Status: approve ? 2 : 0,
      },
    ),
  openings: async (page: number, filter: OpeningFilter, size = PAGE_SIZE): Promise<Page<OpeningAccount>> =>
    toPage(
      await gatewayRequest('GET', '/online/get-list-opening-rekening-online-user', {
        page,
        size,
        loginId: filter.loginId.trim() || undefined,
        custId: filter.custId.trim() || undefined,
      }),
      page,
      size,
    ),
  sendOpeningEmail: (row: Pick<OpeningAccount, 'LoginId' | 'CustId'>) =>
    gatewayRequest<Message>(
      'POST',
      '/online/send-email-opening-account-with-rekening',
      {},
      {
        LoginId: row.LoginId.trim(),
        CustId: row.CustId.trim(),
      },
    ),
  setStatus: (loginId: string, status: number, reason: string) =>
    gatewayRequest<Message>(
      'PUT',
      '/online/update-status-online-user',
      {},
      { LoginId: loginId.trim(), Status: status, Reason: reason.trim() },
    ),
}
