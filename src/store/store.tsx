import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type {
  ActionLog,
  AppState,
  Edge,
  EventItem,
  Person,
  Reminder,
  Ring,
  SparkStatus,
} from '../types'
import { pairKey } from '../types'
import { buildSeedState } from '../data/seed'

// Local-first (§10.3): the whole state lives in this browser, nowhere else.
// This data — grief anniversaries, worries, repair notes — never leaves the device.

const STORAGE_KEY = 'constellation-state-v1'

export type Action =
  | { type: 'add_person'; person: Person; knows: Array<{ otherId: string; context: string }> }
  | { type: 'update_person'; person: Person }
  | { type: 'remove_person'; personId: string }
  | { type: 'move_ring'; personId: string; ring: Ring }
  | { type: 'log_action'; action: ActionLog }
  | { type: 'add_event'; event: EventItem }
  | { type: 'remove_event'; eventId: string }
  | { type: 'toggle_event_invite'; eventId: string; personId: string }
  | { type: 'set_spark_status'; a: string; b: string; status: SparkStatus; context?: string }
  | { type: 'dismiss_proposal'; key: string }
  | { type: 'add_edge'; edge: Edge }
  | { type: 'remove_edge'; a: string; b: string }
  | { type: 'add_reminder'; reminder: Reminder }
  | { type: 'set_reminder_done'; reminderId: string; done: boolean }
  | { type: 'remove_reminder'; reminderId: string }
  | { type: 'reset_demo' }
  | { type: 'clear_all' }
  | { type: 'load_state'; state: AppState }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add_person': {
      const edges: Edge[] = action.knows.map((k) => ({
        a: action.person.id,
        b: k.otherId,
        context: k.context || 'Know each other',
        introducedByUser: false,
      }))
      return { ...state, people: [...state.people, action.person], edges: [...state.edges, ...edges] }
    }
    case 'update_person':
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.person.id ? action.person : p)),
      }
    case 'remove_person':
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.personId),
        edges: state.edges.filter((e) => e.a !== action.personId && e.b !== action.personId),
        actions: state.actions
          .map((a) => ({
            ...a,
            participants: a.participants.filter((id) => id !== action.personId),
          }))
          .filter((a) => a.participants.length > 0),
        reminders: state.reminders.filter((r) => r.personId !== action.personId),
      }
    case 'move_ring':
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.personId && p.ring !== action.ring
            ? {
                ...p,
                ring: action.ring,
                ringHistory: [...p.ringHistory, { ring: action.ring, at: Date.now() }],
              }
            : p,
        ),
      }
    case 'log_action':
      return {
        ...state,
        actions: [...state.actions, action.action],
        // Reaching out answers the flag — clear it for everyone involved.
        people: state.people.map((p) =>
          p.flaggedAt && action.action.participants.includes(p.id)
            ? { ...p, flaggedAt: undefined }
            : p,
        ),
      }
    case 'add_event':
      return { ...state, events: [...state.events, action.event] }
    case 'remove_event':
      return { ...state, events: state.events.filter((e) => e.id !== action.eventId) }
    case 'toggle_event_invite':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.eventId
            ? {
                ...e,
                invited: e.invited.includes(action.personId)
                  ? e.invited.filter((id) => id !== action.personId)
                  : [...e.invited, action.personId],
              }
            : e,
        ),
      }
    case 'set_spark_status': {
      const key = pairKey(action.a, action.b)
      const rest = state.sparkStates.filter((s) => s.pairKey !== key)
      let edges = state.edges
      // The payoff of the whole product (§6.3): the introduction lands and a new
      // line appears between two stars — and you drew it.
      if (action.status === 'landed' && !edges.some((e) => pairKey(e.a, e.b) === key)) {
        edges = [
          ...edges,
          { a: action.a, b: action.b, context: action.context || 'You introduced them', introducedByUser: true },
        ]
      }
      return {
        ...state,
        edges,
        sparkStates: [...rest, { pairKey: key, status: action.status, at: Date.now() }],
      }
    }
    case 'add_edge': {
      const key = pairKey(action.edge.a, action.edge.b)
      if (action.edge.a === action.edge.b) return state
      if (state.edges.some((e) => pairKey(e.a, e.b) === key)) return state
      return { ...state, edges: [...state.edges, action.edge] }
    }
    case 'remove_edge': {
      const key = pairKey(action.a, action.b)
      return { ...state, edges: state.edges.filter((e) => pairKey(e.a, e.b) !== key) }
    }
    case 'add_reminder':
      return { ...state, reminders: [...state.reminders, action.reminder] }
    case 'set_reminder_done':
      return {
        ...state,
        reminders: state.reminders.map((r) =>
          r.id === action.reminderId ? { ...r, done: action.done } : r,
        ),
      }
    case 'remove_reminder':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.reminderId) }
    case 'dismiss_proposal':
      return {
        ...state,
        dismissedProposals: [
          ...state.dismissedProposals.filter((d) => d.key !== action.key),
          { key: action.key, at: Date.now() },
        ],
      }
    case 'reset_demo':
      return buildSeedState()
    case 'clear_all':
      return { people: [], edges: [], actions: [], events: [], sparkStates: [], dismissedProposals: [], reminders: [] }
    case 'load_state':
      // Wholesale replacement — used when a decrypted sky arrives from sync.
      return normalizeState(action.state)
    default:
      return state
  }
}

/** Fill fields added after a state was saved, so old local/cloud skies keep working. */
function normalizeState(s: AppState): AppState {
  return {
    people: (s.people ?? []).map((p) => ({
      ...p,
      details: {
        rituals: p.details?.rituals ?? [],
        loves: p.details?.loves ?? [],
        toDiscuss: p.details?.toDiscuss ?? [],
        inJokes: p.details?.inJokes ?? [],
        admires: p.details?.admires ?? [],
        dates: p.details?.dates ?? [],
        dreams: p.details?.dreams ?? [],
        theirPeople: p.details?.theirPeople ?? [],
        giftIdeas: p.details?.giftIdeas ?? [],
        repairNotes: p.details?.repairNotes ?? [],
        eventTags: p.details?.eventTags ?? [],
      },
    })),
    edges: s.edges ?? [],
    actions: s.actions ?? [],
    events: (s.events ?? []).map((e) => ({ ...e, invited: e.invited ?? [] })),
    sparkStates: s.sparkStates ?? [],
    dismissedProposals: s.dismissedProposals ?? [],
    reminders: s.reminders ?? [],
  }
}

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (Array.isArray(parsed.people)) return normalizeState(parsed)
    }
  } catch {
    // fall through to seed
  }
  return buildSeedState()
}

const StoreContext = createContext<{ state: AppState; dispatch: (a: Action) => void } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full or unavailable — the session still works in memory
    }
  }, [state])
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside provider')
  return ctx
}
