import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const api = process.env.SUPABASE_URL ?? 'http://localhost:8000'
const hubRoot = fileURLToPath(new URL('..', import.meta.url))
const monorepo = resolve(hubRoot, process.env.MONOREPO_DIR ?? '../chat_service_supabase')
const keyFile = join(monorepo, 'docker/secrets/service_role_key')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? readFileSync(keyFile, 'utf8').trim()
const target = fileURLToPath(new URL('../src/types/database.ts', import.meta.url))

const response = await fetch(`${api}/pg/generators/typescript?included_schemas=cs_api`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
if (!response.ok) {
  console.error(`Failed to generate database types: HTTP ${response.status}`)
  process.exit(1)
}
const source = await response.text()
if (!source.includes('export type Database')) {
  console.error('The generator response has no Database type')
  process.exit(1)
}
writeFileSync(target, source)
console.warn(`Database types written to ${target}`)
