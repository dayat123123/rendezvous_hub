import type { TFunction } from 'i18next'

import { relayCounterNames, relayDailyMetrics, relayStates, type RelayCounterName } from './relay/types'

export function relayMetricLabel(t: TFunction, metric: string) {
  return (relayDailyMetrics as readonly string[]).includes(metric)
    ? t(`trade.relay.metrics.${metric as (typeof relayDailyMetrics)[number]}`)
    : metric
}

export function relayCounterLabel(t: TFunction, counter: string) {
  return (relayCounterNames as readonly string[]).includes(counter)
    ? t(`trade.relay.counters.${counter as RelayCounterName}`)
    : counter
}

export function relayStateLabel(t: TFunction, state: string) {
  return (relayStates as readonly string[]).includes(state)
    ? t(`trade.relay.states.${state as (typeof relayStates)[number]}`)
    : state
}
