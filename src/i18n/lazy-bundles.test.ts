import { describe, expect, it } from 'vitest'

const sources = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/test/**', '!/src/i18n/**'],
  { query: '?raw', import: 'default', eager: true },
)

const bundleStrings = Object.fromEntries(
  Object.entries(import.meta.glob<Record<string, unknown>>('/src/i18n/*/id.ts', { eager: true })).flatMap(
    ([path, module]) => {
      const name = path.split('/').at(-2) ?? ''
      return name in module ? [[name, module[name]]] : []
    },
  ),
)

const bundles = Object.keys(bundleStrings)

const callerChecked = new Set(['/src/lib/error-text.ts'])

const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

function resolve(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = `/src/${spec.slice(2)}`
  else if (spec.startsWith('.')) {
    const parts = from.split('/').slice(0, -1)
    for (const part of spec.split('/')) {
      if (part === '..') parts.pop()
      else if (part !== '.') parts.push(part)
    }
    base = parts.join('/')
  } else return null
  for (const extension of extensions) {
    if (sources[base + extension] !== undefined) return base + extension
  }
  return null
}

function callArguments(source: string, open: number): { args: string[]; end: number } {
  const args: string[] = []
  let depth = 0
  let start = open + 1
  let quote: string | null = null
  for (let i = open; i < source.length; i++) {
    const char = source[i]
    if (quote) {
      if (char === quote && source[i - 1] !== '\\') quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') quote = char
    else if (char === '(' || char === '{' || char === '[') depth++
    else if (char === ')' || char === '}' || char === ']') {
      depth--
      if (depth === 0) {
        args.push(source.slice(start, i))
        return { args, end: i }
      }
    } else if (char === ',' && depth === 1) {
      args.push(source.slice(start, i))
      start = i + 1
    }
  }
  return { args, end: source.length }
}

const literal = (text: string) => /^\s*['"](\w+)['"]\s*$/.exec(text)?.[1]

type Edge = { target: string; bundles: string[] }

function edges(path: string): Edge[] {
  const source = sources[path] ?? ''
  const found: Edge[] = []
  const lazy = new Set<number>()
  for (const match of source.matchAll(/\b(withStrings|loadStrings)\(/g)) {
    const { args, end } = callArguments(source, match.index + match[0].length - 1)
    if (match[1] === 'withStrings') {
      const target = /import\(\s*['"]([^'"]+)['"]\s*\)/.exec(args[0] ?? '')
      const resolved = target ? resolve(path, target[1] ?? '') : null
      if (resolved)
        found.push({ target: resolved, bundles: args.slice(1).flatMap((arg) => literal(arg) ?? []) })
      for (let i = match.index; i < end; i++) lazy.add(i)
      continue
    }
    const route = source.lastIndexOf('createRoute(', match.index)
    const block = route >= 0 ? callArguments(source, route + 'createRoute'.length) : null
    const component = block ? /component:\s*(\w+)\s*,/.exec(block.args.join(',')) : null
    if (!component) continue
    const imported = new RegExp(
      `import\\s*\\{[^}]*\\b${component[1]}\\b[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`,
    ).exec(source)
    const resolved = imported ? resolve(path, imported[1] ?? '') : null
    if (resolved) found.push({ target: resolved, bundles: args.flatMap((arg) => literal(arg) ?? []) })
  }
  const routed = new Set(found.map((edge) => edge.target))
  for (const match of source.matchAll(
    /^\s*(?:import|export)\s+(?!type\s)[^'";]*?\sfrom\s*['"]([^'"]+)['"]/gm,
  )) {
    const target = resolve(path, match[1] ?? '')
    if (target && !routed.has(target)) found.push({ target, bundles: [] })
  }
  for (const match of source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) {
    const target = resolve(path, match[1] ?? '')
    if (target) found.push({ target, bundles: [] })
  }
  for (const match of source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (lazy.has(match.index)) continue
    const target = resolve(path, match[1] ?? '')
    if (target && !routed.has(target)) found.push({ target, bundles: [] })
  }
  return found
}

function inLazyBundle(bundle: string, key: string) {
  let node: unknown = bundleStrings[bundle]
  for (const part of key.split('.').slice(1)) {
    if (!node || typeof node !== 'object' || !(part in node)) return false
    node = (node as Record<string, unknown>)[part]
  }
  return true
}

function lazyKeys(path: string) {
  const source = sources[path] ?? ''
  const pattern = new RegExp(`['"\`]((${bundles.join('|')})\\.[A-Za-z][\\w.]*?)\\.?(?:['"\`]|\\$\\{)`, 'g')
  return [...source.matchAll(pattern)]
    .map((match) => ({ key: match[1] ?? '', bundle: match[2] ?? '' }))
    .filter(({ key, bundle }) => inLazyBundle(bundle, key))
}

function missingStrings() {
  const problems = new Set<string>()
  const seen = new Set<string>()
  const visit = (path: string, loaded: Set<string>, via: string) => {
    const state = `${path}|${[...loaded].sort().join(',')}`
    if (seen.has(state)) return
    seen.add(state)
    if (!callerChecked.has(path)) {
      for (const { key, bundle } of lazyKeys(path)) {
        if (!loaded.has(bundle)) problems.add(`${path} uses ${key} but ${via} does not load "${bundle}"`)
      }
    }
    for (const edge of edges(path)) {
      const next = edge.bundles.length ? new Set([...loaded, ...edge.bundles]) : loaded
      visit(edge.target, next, edge.bundles.length ? edge.target : via)
    }
  }
  visit('/src/main.tsx', new Set(), '/src/main.tsx')
  return [...problems].sort()
}

describe('lazy translation bundles', () => {
  it('finds the app entry, its routes and every lazy bundle', () => {
    expect(sources['/src/main.tsx']).toBeDefined()
    expect(bundles).toEqual(expect.arrayContaining(['system', 'help', 'account', 'moderation']))
    expect(edges('/src/app/router.tsx').filter((edge) => edge.bundles.length).length).toBeGreaterThan(5)
  })

  it('loads every bundle a screen uses before the screen renders', () => {
    expect(missingStrings()).toEqual([])
  })
})
