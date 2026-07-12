import type { AppState, Person } from '../types'
import { pairKey } from '../types'

// Sparks (§6): notice two people who don't know each other but obviously should.
// Explicit instruction from the spec: dumb-but-transparent beats clever black box.
// Every spark shows exactly why it fired.

export interface Spark {
  pairKey: string
  a: string
  b: string
  reasons: string[]
  score: number
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

/** Loose overlap between two string lists — exact or word-level containment. */
function overlaps(as: string[], bs: string[]): string[] {
  const found: string[] = []
  for (const a of as) {
    const na = norm(a)
    if (!na) continue
    for (const b of bs) {
      const nb = norm(b)
      if (!nb) continue
      if (na === nb || na.includes(nb) || nb.includes(na)) {
        found.push(a)
        break
      }
      const aw = new Set(na.split(' ').filter((w) => w.length > 3))
      if (nb.split(' ').some((w) => w.length > 3 && aw.has(w))) {
        found.push(a)
        break
      }
    }
  }
  return [...new Set(found)]
}

/** Complementary situations: both new to the city, both new parents, etc. */
function sharedSituations(a: Person, b: Person): string[] {
  const situations = [
    { needle: 'new to the city', label: 'both new to the city' },
    { needle: 'new parent', label: 'both new parents' },
    { needle: 'leave', label: 'both plotting a change of work' },
    { needle: 'freelance', label: 'both weighing going independent' },
  ]
  const out: string[] = []
  for (const s of situations) {
    const inA = a.details.dreams.some((d) => norm(d).includes(s.needle))
    const inB = b.details.dreams.some((d) => norm(d).includes(s.needle))
    if (inA && inB) out.push(s.label)
  }
  return out
}

export function computeSparks(state: AppState): Spark[] {
  const connected = new Set(state.edges.map((e) => pairKey(e.a, e.b)))
  const statusByPair = new Map(state.sparkStates.map((s) => [s.pairKey, s.status]))
  const sparks: Spark[] = []

  const candidates = state.people.filter((p) => p.ring !== 'outer')
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]
      const b = candidates[j]
      const key = pairKey(a.id, b.id)
      if (connected.has(key)) continue
      const status = statusByPair.get(key)
      if (status && status !== 'suggested') continue

      const reasons: string[] = []
      const loves = overlaps(a.details.loves, b.details.loves)
      if (loves.length > 0) reasons.push(`Both love ${loves.slice(0, 2).join(' and ').toLowerCase()}`)
      const situations = sharedSituations(a, b)
      reasons.push(...situations.map((s) => s[0].toUpperCase() + s.slice(1)))
      const sharedContexts = a.contexts.filter((c) => b.contexts.includes(c))
      if (sharedContexts.length > 0 && reasons.length > 0) {
        reasons.push(`Already orbit the same world (${sharedContexts[0].toLowerCase()}) without having met`)
      }

      if (reasons.length === 0) continue
      const score = loves.length * 2 + situations.length * 3 + sharedContexts.length
      sparks.push({ pairKey: key, a: a.id, b: b.id, reasons, score })
    }
  }

  return sparks.sort((x, y) => y.score - x.score).slice(0, 8)
}
