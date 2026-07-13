import type { AppState, EventItem, Person } from '../types'
import { pairKey } from '../types'
import { actionsFor, daysSinceTouch, overdueRatio } from './closeness'

// Event matching (§4): a thing comes up — who from the constellation fits?
// Scoring is deliberately simple and every candidate carries its reasons.

export interface EventCandidate {
  personId: string
  score: number
  reasons: string[]
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

function tagMatches(tags: string[], list: string[]): string[] {
  const out: string[] = []
  for (const tag of tags) {
    const nt = norm(tag)
    for (const item of list) {
      const ni = norm(item)
      if (!nt || !ni) continue
      if (
        nt === ni ||
        nt.includes(ni) ||
        ni.includes(nt) ||
        nt.split(' ').some((w) => w.length > 3 && ni.includes(w))
      ) {
        out.push(item)
        break
      }
    }
  }
  return [...new Set(out)]
}

export function eventCandidates(state: AppState, event: EventItem): EventCandidate[] {
  const out: EventCandidate[] = []
  for (const p of state.people) {
    const reasons: string[] = []
    let score = 0

    // Your own judgement first — event types you've marked as right for them
    const marked = tagMatches(event.tags, p.details.eventTags)
    if (marked.length > 0) {
      score += marked.length * 4
      reasons.push(`You've marked them for ${marked.slice(0, 2).join(', ').toLowerCase()}`)
    }

    // Fit — flagged interests (§3.1c)
    const fits = tagMatches(event.tags, p.details.loves)
    if (fits.length > 0) {
      score += fits.length * 3
      reasons.push(`Loves ${fits.slice(0, 2).join(', ').toLowerCase()}`)
    }

    // Timing — overdue relative to their check-in rhythm (personal override or ring default)
    const ratio = overdueRatio(state.actions, p)
    if (ratio > 1) {
      score += Math.min(3, ratio)
      reasons.push(`You haven't crossed paths in ${daysSinceTouch(state.actions, p)} days`)
    }

    // Context — you've done this kind of thing together before
    const past = actionsFor(state.actions, p.id).filter(
      (a) => tagMatches(event.tags, [a.note]).length > 0 && a.type === 'shared_experience',
    )
    if (past.length > 0) {
      score += 2
      reasons.push(`You've done this kind of thing together before`)
    }

    // One-to-one events are the deepening mechanism — favour transitional rings (§4.3)
    if (event.kind === 'one_to_one' && (p.ring === 2 || p.ring === 4)) {
      score += 1.5
      reasons.push(`One-to-one time is exactly what deepens this friendship`)
    }

    if (score > 0) out.push({ personId: p.id, score, reasons })
  }

  const ranked = out.sort((a, b) => b.score - a.score)

  // Combination — for gatherings, note pairs who'd enjoy each other (§4.1)
  if (event.kind !== 'one_to_one') {
    const top = ranked.slice(0, 6)
    const connected = new Set(state.edges.map((e) => pairKey(e.a, e.b)))
    for (const c of top) {
      const friendsAmongTop = top.filter(
        (o) => o !== c && connected.has(pairKey(c.personId, o.personId)),
      )
      if (friendsAmongTop.length > 0) {
        const names = friendsAmongTop
          .map((f) => state.people.find((p) => p.id === f.personId)?.name)
          .filter(Boolean)
        c.reasons.push(`Already knows ${names.join(' and ')} — easy chemistry`)
        c.score += 0.5
      }
    }
  }

  return ranked.slice(0, 8)
}

/** The reverse direction (§4.2): pick people, get what you might do together. */
export function reverseSuggestions(state: AppState, personIds: string[]): string[] {
  const people = personIds
    .map((id) => state.people.find((p) => p.id === id))
    .filter((p): p is Person => !!p)
  if (people.length === 0) return []

  const suggestions: string[] = []
  // Event types you've marked for everyone selected — your own curation wins
  let sharedTags = people[0].details.eventTags
  for (const p of people.slice(1)) {
    sharedTags = sharedTags.filter((t) => tagMatches([t], p.details.eventTags).length > 0)
  }
  for (const t of sharedTags) {
    suggestions.push(
      people.length === 1
        ? `${t[0].toUpperCase() + t.slice(1)} — you've marked them for it`
        : `${t[0].toUpperCase() + t.slice(1)} — you've marked all of them for it`,
    )
  }
  // Shared loves across everyone selected
  let shared = people[0].details.loves
  for (const p of people.slice(1)) {
    shared = shared.filter((l) => tagMatches([l], p.details.loves).length > 0)
  }
  for (const s of shared) {
    suggestions.push(`Something around ${s.toLowerCase()} — it's a shared love`)
  }
  // Union of strong individual interests as gentler options
  if (suggestions.length < 3) {
    const union = [...new Set(people.flatMap((p) => p.details.loves))].slice(0, 4)
    for (const u of union) {
      const who = people.filter((p) => tagMatches([u], p.details.loves).length > 0)
      if (who.length === people.length) continue // already covered above
      suggestions.push(
        `${u} — ${who.map((w) => w.name).join(' and ')} would light up, the others get a new world`,
      )
      if (suggestions.length >= 5) break
    }
  }
  if (people.length === 1) {
    suggestions.push('A long dinner or a walk — one-to-one is the deepening mechanism')
  }
  return suggestions.slice(0, 5)
}
