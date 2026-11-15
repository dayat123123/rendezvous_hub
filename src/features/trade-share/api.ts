import { rpc } from '@/lib/supabase'
import type { Json } from '@/types/database'

import type {
  Decision,
  ExcludedAccount,
  ExcludedStock,
  FlagStatus,
  PilotInvite,
  ProfileMatch,
  Subscriber,
  SubscriptionStatus,
  TradeDashboard,
  TradeExport,
  TradeFlag,
  TradeSetting,
  TradeSharer,
  TradeSharerDetail,
  TraderStatus,
} from './types'

function sharer<T extends TradeSharer>(raw: T): T {
  return {
    ...raw,
    accounts: raw.accounts ?? 0,
    warnings: raw.warnings ?? 0,
    subscribers: raw.subscribers ?? { active: 0, pending: 0 },
  }
}

function detail(raw: TradeSharerDetail): TradeSharerDetail {
  return {
    ...sharer(raw),
    account_review: raw.account_review ?? [],
    eligibility: {
      eligible: raw.eligibility?.eligible ?? false,
      checks: raw.eligibility?.checks ?? [],
      accounts: raw.eligibility?.accounts ?? [],
      cooldown_until: raw.eligibility?.cooldown_until ?? null,
      terms_document: raw.eligibility?.terms_document ?? null,
    },
    sanctions: raw.sanctions ?? { active: false, last_365_days: 0 },
    events: raw.events ?? [],
  }
}

function dashboard(raw: TradeDashboard): TradeDashboard {
  return {
    ...raw,
    traders: raw.traders ?? {},
    subscriptions: raw.subscriptions ?? { active: 0, pending: 0, muted: 0 },
    deliveries_today: raw.deliveries_today ?? { recipients: 0, pushed: 0, capped: 0 },
    relay_today: raw.relay_today ?? {},
    relay_health: raw.relay_health ?? [],
    top_traders: raw.top_traders ?? [],
  }
}

const list = <T>(raw: T[] | null) => raw ?? []

export const tradeShareApi = {
  list: async (status: TraderStatus | null, before: string | undefined, limit: number) =>
    list(
      await rpc<TradeSharer[] | null>('trade_share_list', {
        p_status: status,
        p_before: before ?? null,
        p_limit: limit,
      }),
    ).map(sharer),
  detail: async (profile: string) =>
    detail(await rpc<TradeSharerDetail>('trade_share_detail', { p_profile: profile })),
  decide: async (profile: string, decision: Decision, reason: string) =>
    detail(
      await rpc<TradeSharerDetail>('trade_share_decide', {
        p_profile: profile,
        p_decision: decision,
        p_reason: reason.trim() || null,
      }),
    ),
  suspend: async (profile: string, reason: string, until: string | null) =>
    detail(
      await rpc<TradeSharerDetail>('trade_share_suspend', {
        p_profile: profile,
        p_reason: reason.trim(),
        p_until: until,
      }),
    ),
  reinstate: async (profile: string, reason: string) =>
    detail(
      await rpc<TradeSharerDetail>('trade_share_reinstate', { p_profile: profile, p_reason: reason.trim() }),
    ),
  revoke: async (profile: string, reason: string) =>
    detail(
      await rpc<TradeSharerDetail>('trade_share_revoke', { p_profile: profile, p_reason: reason.trim() }),
    ),
  subscribers: async (
    trader: string,
    status: SubscriptionStatus | null,
    before: string | undefined,
    limit: number,
  ) =>
    list(
      await rpc<Subscriber[] | null>('trade_share_subscribers', {
        p_trader: trader,
        p_status: status,
        p_before: before ?? null,
        p_limit: limit,
      }),
    ),
  dashboard: async () => dashboard(await rpc<TradeDashboard>('trade_share_dashboard')),
  flags: async (status: FlagStatus, limit: number) =>
    list(await rpc<TradeFlag[] | null>('trade_share_flags', { p_status: status, p_limit: limit })),
  reviewFlag: async (id: number, note: string) =>
    list(await rpc<TradeFlag[] | null>('trade_share_review_flag', { p_id: id, p_note: note.trim() })),
  exportCsv: (from: string, to: string) => rpc<TradeExport>('trade_share_export', { p_from: from, p_to: to }),
  excludedAccounts: async () => list(await rpc<ExcludedAccount[] | null>('trade_share_excluded_accounts')),
  excludeAccount: async (custId: string, reason: string) =>
    list(
      await rpc<ExcludedAccount[] | null>('trade_share_exclude_account', {
        p_cust_id: custId,
        p_reason: reason.trim(),
      }),
    ),
  unexcludeAccount: async (custId: string, reason: string) =>
    list(
      await rpc<ExcludedAccount[] | null>('trade_share_unexclude_account', {
        p_cust_id: custId,
        p_reason: reason.trim(),
      }),
    ),
  excludedStocks: async () => list(await rpc<ExcludedStock[] | null>('trade_share_excluded_stocks')),
  excludeStock: async (stock: string, reason: string, until: string | null) =>
    list(
      await rpc<ExcludedStock[] | null>('trade_share_exclude_stock', {
        p_stock: stock,
        p_reason: reason.trim(),
        p_until: until,
      }),
    ),
  unexcludeStock: async (stock: string, reason: string) =>
    list(
      await rpc<ExcludedStock[] | null>('trade_share_unexclude_stock', {
        p_stock: stock,
        p_reason: reason.trim(),
      }),
    ),
  pilotInvites: async () => list(await rpc<PilotInvite[] | null>('trade_share_pilot_invites')),
  setPilotInvite: async (profile: string, invited: boolean) =>
    list(
      await rpc<PilotInvite[] | null>('trade_share_set_pilot_invite', {
        p_profile: profile,
        p_invited: invited,
      }),
    ),
  settings: async () => list(await rpc<TradeSetting[] | null>('trade_share_settings')),
  updateSetting: async (key: string, value: Json, reason: string) =>
    list(
      await rpc<TradeSetting[] | null>('trade_share_update_setting', {
        p_key: key,
        p_value: value,
        p_reason: reason.trim(),
      }),
    ),
  findProfiles: async (query: string) =>
    list(await rpc<ProfileMatch[] | null>('trade_share_find_profiles', { p_query: query })).map((match) => ({
      ...match,
      trader_status: match.trader_status ?? null,
      pilot_invited: match.pilot_invited ?? false,
      linked_accounts: match.linked_accounts ?? 0,
    })),
}
