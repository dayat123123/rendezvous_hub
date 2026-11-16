import type { NodeTone } from '../../map-logic'

export const toneFill: Record<NodeTone, string> = {
  ok: 'bg-signal-success',
  warn: 'bg-signal-warning',
  bad: 'bg-signal-danger',
  off: 'bg-signal-neutral',
  done: 'bg-chart-neutral',
}

export const toneText: Record<NodeTone, string> = {
  ok: 'text-success',
  warn: 'text-warning',
  bad: 'text-destructive',
  off: 'text-muted-foreground',
  done: 'text-muted-foreground',
}

export const toneStroke: Record<NodeTone, string> = {
  ok: 'stroke-signal-success',
  warn: 'stroke-signal-warning',
  bad: 'stroke-signal-danger',
  off: 'stroke-signal-neutral',
  done: 'stroke-signal-neutral',
}

export const toneGlow: Record<NodeTone, string> = {
  ok: 'map-glow-ok',
  warn: 'map-glow-warn',
  bad: 'map-glow-bad',
  off: '',
  done: '',
}

export const toneBorder: Record<NodeTone, string> = {
  ok: 'border-success/30',
  warn: 'border-warning/40',
  bad: 'border-destructive/40',
  off: 'border-border',
  done: 'border-border',
}
