export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const host = previous?.closest('[role="dialog"], [role="alertdialog"]') ?? document.body
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  host.append(area)
  area.focus()
  area.select()
  try {
    if (document.activeElement !== area || !document.execCommand('copy')) {
      throw new Error('Copy to clipboard failed')
    }
  } finally {
    area.remove()
    previous?.focus()
  }
}
