// Two-device reconciliation. The old sync was whole-blob last-write-wins: a
// stale device's next save silently erased everything the other device had
// done. This module replaces that with a real merge:
//
//   - Every collection is merged by id (edges by pairKey).
//   - A record present on both sides: the newer edit wins (per-record
//     updatedAt, with sensible fallbacks for records written before the
//     field existed).
//   - A record present on one side only: kept — unless a tombstone says it
//     was deleted more recently than it was last touched.
//   - Moments (ActionLog) are append-only in the app, so they simply union.
//
// The merge is deterministic (output sorted by id) and idempotent:
// merge(a, merge(a, b)) === merge(a, b). Both devices converge.

import type {
  ActionLog,
  AppState,
  DismissedProposal,
  Edge,
  EventItem,
  Person,
  Reminder,
  SparkState,
  Tombstones,
} from '../types'
import { emptyTombstones, pairKey } from '../types'

/** Tombstones older than this are dropped — six months is long enough for
 *  every device a person realistically owns to have synced the deletion. */
const TOMBSTONE_TTL_MS = 183 * 24 * 60 * 60 * 1000

/** The demo sky is a guided tour, not user data — it must never be uploaded
 *  or merged into a real sky. Seed people have fixed, human-readable ids. */
export function isDemoState(s: AppState): boolean {
  return s.people.some((p) => p.id === 'amara')
}

const personTime = (p: Person): number =>
  p.updatedAt ?? Math.max(p.createdAt, p.ringHistory[p.ringHistory.length - 1]?.at ?? 0)

const edgeTime = (e: Edge): number => e.createdAt ?? 0
const eventTime = (e: EventItem): number => e.updatedAt ?? 0
const reminderTime = (r: Reminder): number => r.updatedAt ?? 0

function mergeById<T>(
  a: T[],
  b: T[],
  idOf: (t: T) => string,
  timeOf: (t: T) => number,
  tombs: Record<string, number>,
  pick: (x: T, y: T) => T = (x, y) => (timeOf(x) >= timeOf(y) ? x : y),
): T[] {
  const out = new Map<string, T>()
  for (const item of a) out.set(idOf(item), item)
  for (const item of b) {
    const id = idOf(item)
    const existing = out.get(id)
    out.set(id, existing ? pick(existing, item) : item)
  }
  for (const [id, deletedAt] of Object.entries(tombs)) {
    const item = out.get(id)
    // The deletion wins unless the record was touched after it was deleted
    // (re-added, or edited on a device that hadn't seen the deletion yet —
    // an edit is a stronger signal of intent than an old removal).
    if (item && deletedAt >= timeOf(item)) out.delete(id)
  }
  return [...out.values()].sort((x, y) => idOf(x).localeCompare(idOf(y)))
}

function mergeTombstones(a: Tombstones, b: Tombstones, now: number): Tombstones {
  const out = emptyTombstones()
  for (const kind of ['people', 'edges', 'events', 'reminders'] as const) {
    for (const src of [a[kind], b[kind]]) {
      for (const [id, at] of Object.entries(src)) {
        if (now - at > TOMBSTONE_TTL_MS) continue
        out[kind][id] = Math.max(out[kind][id] ?? 0, at)
      }
    }
  }
  return out
}

export function mergeStates(a: AppState, b: AppState, now = Date.now()): AppState {
  const tombstones = mergeTombstones(a.tombstones, b.tombstones, now)

  const people = mergeById(a.people, b.people, (p) => p.id, personTime, tombstones.people)
  const alive = new Set(people.map((p) => p.id))

  const edges = mergeById(
    a.edges,
    b.edges,
    (e) => pairKey(e.a, e.b),
    edgeTime,
    tombstones.edges,
    // Same thread from both sides: a gold introducedByUser thread is history
    // that must survive; otherwise the newer record wins.
    (x, y) => (x.introducedByUser !== y.introducedByUser ? (x.introducedByUser ? x : y) : edgeTime(x) >= edgeTime(y) ? x : y),
  ).filter((e) => alive.has(e.a) && alive.has(e.b))

  // Moments are append-only: union by id, then drop participants whose star
  // was deleted (mirroring what remove_person does on a single device).
  const actionsById = new Map<string, ActionLog>()
  for (const list of [a.actions, b.actions]) {
    for (const act of list) if (!actionsById.has(act.id)) actionsById.set(act.id, act)
  }
  const actions = [...actionsById.values()]
    .map((act) => ({ ...act, participants: act.participants.filter((id) => alive.has(id)) }))
    .filter((act) => act.participants.length > 0)
    .sort((x, y) => x.timestamp - y.timestamp || x.id.localeCompare(y.id))

  const events = mergeById(a.events, b.events, (e) => e.id, eventTime, tombstones.events).map(
    (e) => ({ ...e, invited: e.invited.filter((id) => alive.has(id)) }),
  )

  const reminders = mergeById(
    a.reminders,
    b.reminders,
    (r) => r.id,
    reminderTime,
    tombstones.reminders,
    // Equal-time tie: a completed check-in stays completed.
    (x, y) => (reminderTime(x) === reminderTime(y) ? (x.done ? x : y) : reminderTime(x) > reminderTime(y) ? x : y),
  ).filter((r) => alive.has(r.personId))

  const mergeByKey = <T extends { at: number }>(xs: T[], ys: T[], keyOf: (t: T) => string): T[] => {
    const out = new Map<string, T>()
    for (const list of [xs, ys]) {
      for (const item of list) {
        const k = keyOf(item)
        const cur = out.get(k)
        if (!cur || item.at > cur.at) out.set(k, item)
      }
    }
    return [...out.values()].sort((x, y) => keyOf(x).localeCompare(keyOf(y)))
  }

  const sparkStates = mergeByKey<SparkState>(a.sparkStates, b.sparkStates, (s) => s.pairKey).filter(
    (s) => s.pairKey.split('|').every((id) => alive.has(id)),
  )
  const dismissedProposals = mergeByKey<DismissedProposal>(
    a.dismissedProposals,
    b.dismissedProposals,
    (d) => d.key,
  )

  return { people, edges, actions, events, sparkStates, dismissedProposals, reminders, tombstones }
}

/** Order-insensitive, key-sorted serialisation — used to answer "are these
 *  two skies the same content?" without being fooled by key/array order. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}
