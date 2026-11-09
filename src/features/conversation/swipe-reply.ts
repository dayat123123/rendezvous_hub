import { useRef, useState, type PointerEvent } from 'react'

export const SWIPE_TRIGGER = 56
const SLOP = 10

type Gesture = { id: number; x: number; y: number; locked: boolean; armed: boolean }

function vibrate() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(10)
}

export function useSwipeReply(onReply: (() => void) | undefined) {
  const [offset, setOffset] = useState(0)
  const gesture = useRef<Gesture | null>(null)

  const reset = () => {
    gesture.current = null
    setOffset(0)
  }

  if (!onReply) return { offset: 0, handlers: {} }

  return {
    offset,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType === 'mouse' || !event.isPrimary) return
        gesture.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          locked: false,
          armed: false,
        }
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const current = gesture.current
        if (!current || current.id !== event.pointerId) return
        const dx = event.clientX - current.x
        const dy = event.clientY - current.y
        if (!current.locked) {
          if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) {
            gesture.current = null
            return
          }
          if (dx <= SLOP || dx < Math.abs(dy)) return
          current.locked = true
          event.currentTarget.setPointerCapture?.(event.pointerId)
        }
        const raw = Math.max(0, dx)
        const next = Math.min(
          raw > SWIPE_TRIGGER ? SWIPE_TRIGGER + (raw - SWIPE_TRIGGER) * 0.3 : raw,
          SWIPE_TRIGGER * 1.6,
        )
        const armed = next >= SWIPE_TRIGGER
        if (armed && !current.armed) vibrate()
        current.armed = armed
        setOffset(next)
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const current = gesture.current
        if (!current || current.id !== event.pointerId) return
        const armed = current.armed
        reset()
        if (armed) onReply()
      },
      onPointerCancel: reset,
    },
  }
}
