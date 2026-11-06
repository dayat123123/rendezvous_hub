export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.focus()
  area.select()
  try {
    if (!document.execCommand('copy')) throw new Error('Copy to clipboard failed')
  } finally {
    area.remove()
  }
}
