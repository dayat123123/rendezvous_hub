import { afterEach, describe, expect, it, vi } from 'vitest'

import { sha256Hex } from './hash'

const encode = (text: string) => new TextEncoder().encode(text)

const vectors: [string, string][] = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  ],
  ['a'.repeat(1000), '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3'],
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sha256Hex', () => {
  it.each(vectors)('hashes %j with Web Crypto', async (input, expected) => {
    expect(await sha256Hex(encode(input))).toBe(expected)
  })

  it.each(vectors)('hashes %j without Web Crypto on a plain-HTTP LAN origin', async (input, expected) => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    expect(await sha256Hex(encode(input))).toBe(expected)
  })
})
