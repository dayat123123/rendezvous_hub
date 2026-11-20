import { createHmac } from 'node:crypto'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function decodeBase32(secret: string) {
  const bits = [...secret.replace(/=+$/, '').toUpperCase()]
    .map((char) => {
      const value = alphabet.indexOf(char)
      if (value < 0) throw new Error('TOTP secret is not base32')
      return value.toString(2).padStart(5, '0')
    })
    .join('')
  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8)
    bytes.push(parseInt(bits.slice(index, index + 8), 2))
  return Buffer.from(bytes)
}

export function totp(secret: string, at = Date.now()) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)))
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(code).padStart(6, '0')
}
