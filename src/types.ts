// Core data model — see spec §10.1.
// Guiding principle (§1.3): quantify the action, never the person.

/** Ring 1–4 = the active tending loop; 'outer' = the outer field of contextual people. */
export type Ring = 1 | 2 | 3 | 4 | 'outer'

export const RING_NAMES: Record<string, string> = {
  1: 'Ride or die',
  2: 'Close, and deepening',
  3: 'Good friends',
  4: 'Promising acquaintances',
  outer: 'The outer field',
}

export const RING_DESCRIPTIONS: Record<string, string> = {
  1: 'The most bound. Mutual, load-bearing, unconditional. Maintenance and depth, not growth.',
  2: 'People you are actively bringing inward. A transitional zone.',
  3: 'Real friendships, stable, not necessarily on a trajectory.',
  4: 'People you would like to turn into friends. The other transitional zone.',
  outer: 'Contextual, situational people. Part of the network, not the active tending loop.',
}

/** Rings 2 & 4 are transitional (waiting rooms); 1 & 3 are stable states. */
export const TRANSITIONAL_RINGS: Ring[] = [2, 4]

/** Types of connection — not just counts (§5.3). Grounded in friendship theory (§9). */
export type ActionType =
  | 'shared_experience' // you did a thing together
  | 'sweetness' // a small kindness, a gift, remembering the thing
  | 'everyday' // mundane co-presence, the quiet bedrock of intimacy
  | 'depth' // the hard conversation, the vulnerable one, being there
  | 'bridging' // you connected them to someone

export type Modality =
  | 'message'
  | 'call'
  | 'in_person'
  | 'letter'
  | 'gift'
  | 'introduction'

export interface ImportantDate {
  id: string
  label: string
  /** MM-DD, recurs annually */
  date: string
  /** Hard anniversaries — a parent's death, a diagnosis. Showing up matters most here. */
  hard?: boolean
}

export interface RingChange {
  ring: Ring
  at: number // epoch ms
}

export interface Person {
  id: string
  name: string
  /** Contexts of origin — work, the club, university, family. Drives clusters & nebula tint. */
  contexts: string[]
  ring: Ring
  howMet: string
  location?: string
  occupation?: string
  /** Last local edit (epoch ms) — newest-wins when two devices edited the same star. */
  updatedAt?: number
  details: {
    rituals: string[] // the annual thing, the Sunday call
    loves: string[] // their tea, their band, their bookshop
    toDiscuss: string[] // things for next time
    inJokes: string[] // shared language
    admires: string[] // green flags — what you appreciate, to mirror back
    dates: ImportantDate[] // birthdays, and the hard ones
    dreams: string[] // goals, worries, things in motion
    theirPeople: string[] // partner, kids, the ones they talk about
    giftIdeas: string[] // scratchpad so December isn't a panic
    repairNotes: string[] // ongoing friction, maintenance debt
    eventTags: string[] // kinds of outings that fit them — feeds event matching
  }
  ringHistory: RingChange[]
  createdAt: number
  /** Set by the user: "I want to check in with them soon." Sits at the top of the
   *  Attention view until cleared — or auto-cleared by logging a moment with them. */
  flaggedAt?: number
  /** Personal check-in rhythm in days. undefined = the ring's default; 0 = no reminders. */
  checkinDays?: number
  /** When the friendship began (YYYY-MM-DD, approximate is fine). */
  knownSince?: string
  /** The next time you're scheduled to see them — a concrete plan, not a hope. */
  nextSeeing?: { date: string; note?: string }
}

/** A time-anchored check-in the user scheduled themselves —
 *  "she's back from the vacation in a month; remind me then." */
export interface Reminder {
  id: string
  personId: string
  /** YYYY-MM-DD — when it should surface in Attention */
  date: string
  note: string
  done: boolean
  /** Last local edit (epoch ms) — newest-wins across devices. */
  updatedAt?: number
}

/** Starting points for "good events for them" — free text is equally welcome. */
export const PRESET_EVENT_TAGS = [
  'coffee',
  'a walk',
  'long dinner',
  'dinner party',
  'live music',
  'exhibition',
  'outdoors',
  'cinema',
  'big party',
]

/** Person ↔ Person thread. Fixed history — it doesn't change with closeness. */
export interface Edge {
  a: string
  b: string
  context: string // how they know each other
  introducedByUser: boolean // the payoff of Sparks
  /** When the thread was drawn (epoch ms) — lets a re-drawn thread outlive an old deletion. */
  createdAt?: number
}

export interface ActionLog {
  id: string
  type: ActionType
  modality: Modality
  participants: string[] // group events touch many edges at once
  timestamp: number
  note: string
}

export type EventKind = 'one_to_one' | 'small_gathering' | 'large_event'

export const EVENT_KIND_NAMES: Record<EventKind, string> = {
  one_to_one: 'One-to-one',
  small_gathering: 'Small gathering',
  large_event: 'Large event',
}

export interface EventItem {
  id: string
  what: string
  when: string
  /** YYYY-MM-DD — set when the event has an actual date; drives scheduling. */
  date?: string
  where?: string
  kind: EventKind
  tags: string[]
  /** People you've added to this event — a scheduled engagement for each of them. */
  invited: string[]
  /** Last local edit (epoch ms) — newest-wins across devices. */
  updatedAt?: number
}

export type SparkStatus = 'suggested' | 'dismissed' | 'introduced' | 'landed'

/** Persisted status for a computed spark, keyed by the pair. */
export interface SparkState {
  pairKey: string // `${aId}|${bId}` sorted
  status: SparkStatus
  at: number
}

export interface DismissedProposal {
  key: string // `${personId}:${from}->${to}`
  at: number
}

/** Deletions, remembered. Without these, a two-device merge would resurrect
 *  everything one device removed. Keyed by entity id (edges by pairKey),
 *  value = when it was deleted (epoch ms). Pruned after ~6 months. */
export interface Tombstones {
  people: Record<string, number>
  edges: Record<string, number>
  events: Record<string, number>
  reminders: Record<string, number>
}

export function emptyTombstones(): Tombstones {
  return { people: {}, edges: {}, events: {}, reminders: {} }
}

export interface AppState {
  people: Person[]
  edges: Edge[]
  actions: ActionLog[]
  events: EventItem[]
  sparkStates: SparkState[]
  dismissedProposals: DismissedProposal[]
  reminders: Reminder[]
  tombstones: Tombstones
}

export type ViewMode = 'closeness' | 'network' | 'events' | 'attention' | 'sparks' | 'catalogue'

export const ACTION_TYPE_META: Record<
  ActionType,
  { name: string; hint: string; color: string }
> = {
  // Categorical palette validated for the dark surface (CVD-safe in this fixed order).
  shared_experience: {
    name: 'Shared experience',
    hint: 'You did a thing together',
    color: '#c08428',
  },
  everyday: {
    name: 'Everyday simplicity',
    hint: 'Mundane, unremarkable co-presence',
    color: '#3d7fd4',
  },
  sweetness: {
    name: 'Sweetness',
    hint: 'A small kindness, a gift, remembering the thing',
    color: '#c74e6e',
  },
  depth: {
    name: 'Growth / depth',
    hint: 'The hard conversation, being there',
    color: '#8763d6',
  },
  bridging: {
    name: 'Introduction / bridging',
    hint: 'You connected them to someone',
    color: '#1f9a6e',
  },
}

export const ACTION_TYPE_ORDER: ActionType[] = [
  'shared_experience',
  'everyday',
  'sweetness',
  'depth',
  'bridging',
]

export const MODALITY_NAMES: Record<Modality, string> = {
  message: 'Message',
  call: 'Call',
  in_person: 'In person',
  letter: 'Letter',
  gift: 'Gift',
  introduction: 'Introduction',
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
