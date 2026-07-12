import type { ActionLog, AppState, Person, Ring } from '../types'
import { RING_NAMES, TRANSITIONAL_RINGS } from '../types'

// The signal layer (§10.2): computed, always explainable.
// Rules of the house: the app notices, the user decides (§2.7c).
// Drift is never a rebuke; outward drift exists only in the transitional rings 2 & 4.

const DAY = 24 * 60 * 60 * 1000

/** Weights per action type for bond strength. Depth counts most — closeness is not
 *  a function of time (§7.1); social penetration theory says disclosure deepens. */
const TYPE_WEIGHT: Record<string, number> = {
  everyday: 1,
  sweetness: 1.4,
  shared_experience: 2,
  bridging: 2,
  depth: 3,
}

/** Baseline mass per ring, so an inner star is weighty even in a quiet month. */
const RING_BASE: Record<string, number> = { 1: 5.5, 2: 4, 3: 3, 4: 2, outer: 1.2 }

/** Expected contact cadence per ring, in days — answers open question 9.
 *  Inner rings expect a faster rhythm; ring 4 is tighter than ring 3 because
 *  transitional momentum matters (a promising acquaintance goes cold quickly). */
export const RING_CADENCE: Record<string, number | null> = {
  1: 18,
  2: 24,
  3: 50,
  4: 35,
  outer: null, // the outer field is not part of the tending loop
}

/** Dunbar-informed soft capacities (§9). Never a block — only a gentle observation. */
export const RING_CAPACITY: Record<string, number | null> = {
  1: 5,
  2: 10,
  3: 35,
  4: null,
  outer: null,
}

export function actionsFor(actions: ActionLog[], personId: string): ActionLog[] {
  return actions.filter((a) => a.participants.includes(personId))
}

export function lastTouch(actions: ActionLog[], person: Person): number {
  const mine = actionsFor(actions, person.id)
  if (mine.length === 0) return person.createdAt
  return Math.max(...mine.map((a) => a.timestamp))
}

export function daysSinceTouch(actions: ActionLog[], person: Person, now = Date.now()): number {
  return Math.floor((now - lastTouch(actions, person)) / DAY)
}

/** Bond strength drives star mass (§2.5): depth of bond, never popularity.
 *  Ring baseline + recent action weights with a 90-day half-life. */
export function bondStrength(actions: ActionLog[], person: Person, now = Date.now()): number {
  const base = RING_BASE[String(person.ring)] ?? 1
  let acc = 0
  for (const a of actionsFor(actions, person.id)) {
    const ageDays = (now - a.timestamp) / DAY
    const decay = Math.pow(0.5, ageDays / 90)
    acc += (TYPE_WEIGHT[a.type] ?? 1) * decay
  }
  return Math.min(10, base + Math.min(4.5, acc * 0.45))
}

/** How overdue relative to the ring's cadence. 1.0 = right at cadence. */
export function overdueRatio(actions: ActionLog[], person: Person, now = Date.now()): number {
  const cadence = RING_CADENCE[String(person.ring)]
  if (cadence == null) return 0
  return daysSinceTouch(actions, person, now) / cadence
}

export interface RecentCounts {
  total: number
  oneToOne: number // in-person, just the two of you — the deepening mechanism (§4.3)
  depth: number
  sharedExperience: number
  windowDays: number
}

export function recentCounts(
  actions: ActionLog[],
  personId: string,
  windowDays: number,
  now = Date.now(),
): RecentCounts {
  const cutoff = now - windowDays * DAY
  const recent = actionsFor(actions, personId).filter((a) => a.timestamp >= cutoff)
  return {
    total: recent.length,
    oneToOne: recent.filter((a) => a.modality === 'in_person' && a.participants.length === 1)
      .length,
    depth: recent.filter((a) => a.type === 'depth').length,
    sharedExperience: recent.filter((a) => a.type === 'shared_experience').length,
    windowDays,
  }
}

export function everHadDepth(actions: ActionLog[], personId: string): boolean {
  return actionsFor(actions, personId).some((a) => a.type === 'depth')
}

export interface Proposal {
  key: string
  personId: string
  from: Ring
  to: Ring
  direction: 'inward' | 'outward'
  /** Always legible — why the app noticed. */
  reason: string
}

/**
 * Experiential thresholds (§7.2). Not points — kinds of shared experience.
 * Inward movement needs the right kind of moments, not just enough of them.
 * Grounded loosely in Hall's time-to-friendship bands and social penetration
 * theory (depth of disclosure gates intimacy).
 */
export function inwardProposal(state: AppState, person: Person, now = Date.now()): Proposal | null {
  const a = state.actions
  if (person.ring === 'outer') {
    const c = recentCounts(a, person.id, 90, now)
    if (c.total >= 2) {
      return proposal(person, 'outer', 4, 'inward',
        `You've connected ${c.total} times these past three months — ${person.name} seems to be drifting in from the outer field.`)
    }
    return null
  }
  if (person.ring === 4) {
    const c = recentCounts(a, person.id, 90, now)
    if (c.total >= 3 && (c.oneToOne >= 1 || c.sharedExperience >= 2)) {
      return proposal(person, 4, 3, 'inward',
        `${person.name} has drifted toward your good friends — ${c.total} moments in three months, including real time together.`)
    }
    return null
  }
  if (person.ring === 3) {
    const c = recentCounts(a, person.id, 120, now)
    if (c.total >= 4 && c.oneToOne >= 1 && (c.depth >= 1 || c.sharedExperience >= 2)) {
      return proposal(person, 3, 2, 'inward',
        `Things are deepening with ${person.name} — regular time together lately, some of it one-to-one. Shall I move them inward?`)
    }
    return null
  }
  if (person.ring === 2) {
    const c = recentCounts(a, person.id, 150, now)
    if (c.total >= 5 && c.oneToOne >= 2 && everHadDepth(a, person.id)) {
      return proposal(person, 2, 1, 'inward',
        `${person.name} has become load-bearing — steady time together, and you've been there for the hard conversations.`)
    }
    return null
  }
  return null
}

/**
 * Outward drift — only ever in the transitional rings 2 & 4 (§2.7).
 * A twenty-year friendship in ring 1 or 3 survives a busy quarter untouched.
 * Copy is a gentle noticing, never a verdict.
 */
export function outwardProposal(state: AppState, person: Person, now = Date.now()): Proposal | null {
  if (!TRANSITIONAL_RINGS.includes(person.ring)) return null
  const days = daysSinceTouch(state.actions, person, now)
  if (person.ring === 2 && days > 75) {
    return proposal(person, 2, 3, 'outward',
      `You haven't crossed paths with ${person.name} in a while. They may have settled among your good friends — which is a fine place to be.`)
  }
  if (person.ring === 4 && days > 60) {
    return proposal(person, 4, 'outer', 'outward',
      `The moment with ${person.name} hasn't come yet. Move them to the outer field for now? They'll stay in your constellation.`)
  }
  return null
}

function proposal(person: Person, from: Ring, to: Ring, direction: 'inward' | 'outward', reason: string): Proposal {
  return { key: `${person.id}:${from}->${to}`, personId: person.id, from, to, direction, reason }
}

const DISMISS_QUIET_DAYS = 30

export function activeProposals(state: AppState, now = Date.now()): Proposal[] {
  const dismissed = new Map(state.dismissedProposals.map((d) => [d.key, d.at]))
  const out: Proposal[] = []
  for (const person of state.people) {
    for (const p of [inwardProposal(state, person, now), outwardProposal(state, person, now)]) {
      if (!p) continue
      const at = dismissed.get(p.key)
      if (at && now - at < DISMISS_QUIET_DAYS * DAY) continue
      out.push(p)
    }
  }
  return out.slice(0, 3) // gentle, never a backlog
}

/**
 * "What would deepen this" — the observation for the person page (§7.2).
 * Framed as reflection, never as an unlockable. Returns null for ring 1
 * (focus there is maintenance and depth, not growth).
 */
export function pathInward(state: AppState, person: Person, now = Date.now()): string | null {
  const a = state.actions
  if (person.ring === 1) return null
  if (person.ring === 'outer' || person.ring === 4) {
    const c = recentCounts(a, person.id, 90, now)
    if (c.oneToOne === 0) {
      return `You've mostly seen ${person.name} in groups. Friendships tend to turn real one-to-one — a coffee or a walk would change the register.`
    }
    return `Momentum matters here — small, regular moments count for more than grand gestures.`
  }
  const c = recentCounts(a, person.id, 180, now)
  const parts: string[] = []
  if (c.oneToOne === 0) parts.push(`you've shared plenty of group time, but rarely one-to-one`)
  if (!everHadDepth(a, person.id)) parts.push(`you've never really talked about anything hard`)
  if (parts.length === 0) {
    return `This friendship has the right ingredients — the kinds of moments that deepen things are already happening.`
  }
  return `Worth noticing: ${parts.join(', and ')}. That's usually what moves a friendship like this.`
}

/** Dunbar-informed soft observation when a ring is unusually full. Never a block. */
export function capacityNote(state: AppState, ring: Ring): string | null {
  const cap = RING_CAPACITY[String(ring)]
  if (cap == null) return null
  const count = state.people.filter((p) => p.ring === ring).length
  if (count <= cap) return null
  return `${RING_NAMES[String(ring)]} holds ${count} people — most people can genuinely sustain about ${cap} at this closeness. Worth a look, not a rule.`
}

export interface WeeklySuggestion {
  personId: string
  reason: string
}

/** Days until the next occurrence of an MM-DD date. */
export function daysUntilDate(mmdd: string, now = Date.now()): number {
  const [m, d] = mmdd.split('-').map(Number)
  const nowD = new Date(now)
  let next = new Date(nowD.getFullYear(), m - 1, d)
  if (next.getTime() < now - DAY) next = new Date(nowD.getFullYear() + 1, m - 1, d)
  return Math.round((next.getTime() - now) / DAY)
}

/**
 * Monday kickoff (§8.2b): three people you might reach out to, with reasons —
 * chosen for meaning, not just recency.
 */
export function weeklySuggestions(state: AppState, now = Date.now()): WeeklySuggestion[] {
  const out: WeeklySuggestion[] = []
  const used = new Set<string>()

  // 1. An important date coming up — especially the hard ones (§3.1e).
  const dated = state.people
    .flatMap((p) =>
      p.details.dates.map((d) => ({ p, d, days: daysUntilDate(d.date, now) })),
    )
    .filter((x) => x.days >= 0 && x.days <= 14)
    .sort((a, b) => Number(b.d.hard) - Number(a.d.hard) || a.days - b.days)
  if (dated.length > 0) {
    const { p, d, days } = dated[0]
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
    out.push({
      personId: p.id,
      reason: d.hard
        ? `${d.label} is ${when}. Being remembered on that day means more than almost anything.`
        : `${p.name}'s ${d.label.toLowerCase()} is ${when}.`,
    })
    used.add(p.id)
  }

  // 2. Something in motion to follow up on — the highest-leverage check-in (§3.1f).
  const inMotion = state.people
    .filter((p) => !used.has(p.id) && p.details.dreams.length > 0 && p.ring !== 'outer')
    .sort((a, b) => daysSinceTouch(state.actions, b, now) - daysSinceTouch(state.actions, a, now))
  if (inMotion.length > 0) {
    const p = inMotion[0]
    out.push({
      personId: p.id,
      reason: `${p.name} has something in motion — “${p.details.dreams[0]}”. Asking how it's going is the whole game.`,
    })
    used.add(p.id)
  }

  // 3. The most quietly overdue, weighted by ring cadence.
  const overdue = state.people
    .filter((p) => !used.has(p.id) && p.ring !== 'outer')
    .map((p) => ({ p, ratio: overdueRatio(state.actions, p, now) }))
    .filter((x) => x.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
  if (overdue.length > 0) {
    const { p } = overdue[0]
    out.push({
      personId: p.id,
      reason: `You haven't crossed paths with ${p.name} in ${daysSinceTouch(state.actions, p, now)} days. No obligation — just a noticing.`,
    })
    used.add(p.id)
  }

  return out.slice(0, 3)
}

export interface AttentionItem {
  personId: string
  kind: 'overdue' | 'on_your_mind'
  note: string
}

/** Attention view (§2.6): overdue and drifting people, plus thought-about-but-not-contacted. */
export function attentionItems(state: AppState, now = Date.now()): AttentionItem[] {
  const items: AttentionItem[] = []
  for (const p of state.people) {
    if (p.ring === 'outer') continue
    const ratio = overdueRatio(state.actions, p, now)
    const days = daysSinceTouch(state.actions, p, now)
    if (ratio > 1) {
      items.push({
        personId: p.id,
        kind: 'overdue',
        note: `${days} days since you crossed paths`,
      })
    } else if (p.details.toDiscuss.length > 0 && days > 10) {
      items.push({
        personId: p.id,
        kind: 'on_your_mind',
        note: `On your mind: “${p.details.toDiscuss[0]}”`,
      })
    }
  }
  return items.sort((a, b) => (a.kind === 'overdue' ? 0 : 1) - (b.kind === 'overdue' ? 0 : 1))
}
