import { useState } from 'react'

export function useLockedEdit() {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  return { editing, confirming, setEditing, setConfirming }
}

export type LockedEdit = ReturnType<typeof useLockedEdit>
