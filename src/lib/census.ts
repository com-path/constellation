// The sky census — a small deck of questions about communities, memories, and
// the people behind them. Not a form: each card is a creative prompt, and each
// answer becomes real structure (stars, threads, moments, details). The deck
// is available during onboarding and stays reachable afterwards through the
// getting-started nudges — the sky is meant to fill in flow, over time.

import type { ActionType, Ring } from '../types'

export type CensusKind = 'people' | 'moment' | 'detail' | 'date'

export interface CensusPrompt {
  id: string
  kind: CensusKind
  question: string
  hint: string
  /** people: ask for a group name and thread everyone in it together. */
  askGroup?: boolean
  /** people: a context filled in ahead of time (e.g. Work). */
  presetContext?: string
  /** people: where the named people land (default: the outer field). */
  suggestedRing?: Ring
  /** moment: the kind of moment this memory logs. */
  actionType?: ActionType
  /** moment: label over the one-line story input. */
  noteLabel?: string
  /** detail: which part of the person page the answer lands on. */
  field?: 'loves' | 'dreams' | 'inJokes' | 'admires' | 'toDiscuss'
  /** detail/date: label over the answer input. */
  detailLabel?: string
}

export const CENSUS_DECK: CensusPrompt[] = [
  {
    id: 'big-news',
    kind: 'people',
    question: 'Who would you call first with big news?',
    hint: 'The ones who get the late-night phone call. There are rarely more than a handful.',
    suggestedRing: 1,
  },
  {
    id: 'communities',
    kind: 'people',
    question: 'Which group of people makes you feel most yourself?',
    hint: 'The climbing crew, the book club, the group chat that actually makes you laugh. Name the group, then name them.',
    askGroup: true,
  },
  {
    id: 'work-miss',
    kind: 'people',
    question: 'If you left your work tomorrow, who would you genuinely miss?',
    hint: 'Not the whole floor — the ones you would cross the street to greet in ten years.',
    presetContext: 'Work',
  },
  {
    id: 'old-guard',
    kind: 'people',
    question: 'Who knew you before you became who you are now?',
    hint: 'School, university, the old neighbourhood — the ones who remember the earlier drafts of you.',
    askGroup: true,
  },
  {
    id: 'meal',
    kind: 'moment',
    actionType: 'shared_experience',
    question: 'Think of a meal you will never forget. Who was around the table?',
    hint: 'The memory becomes a moment in your sky, on roughly the day it happened.',
    noteLabel: 'What made it unforgettable?',
  },
  {
    id: 'laugh',
    kind: 'moment',
    actionType: 'shared_experience',
    question: 'What is the hardest you have laughed this year — and who was there?',
    hint: 'Approximate dates are fine. The laughing is the point.',
    noteLabel: 'What set you off?',
  },
  {
    id: 'showed-up',
    kind: 'moment',
    actionType: 'depth',
    question: 'Who showed up for you when things were heavy?',
    hint: 'Being there is the deepest kind of moment this sky knows.',
    noteLabel: 'One line for the story — it stays on this device.',
  },
  {
    id: 'obsession',
    kind: 'detail',
    field: 'loves',
    question: 'Who has an obsession you find delightful?',
    hint: 'The sourdough, the modular synths, the birds. It lands under "things they love".',
    detailLabel: 'What is the obsession?',
  },
  {
    id: 'in-joke',
    kind: 'detail',
    field: 'inJokes',
    question: 'Which inside joke still makes you smile?',
    hint: 'A few words is enough — you will know what it means.',
    detailLabel: 'The joke, in shorthand',
  },
  {
    id: 'teacher',
    kind: 'detail',
    field: 'admires',
    question: 'Who taught you something you still use?',
    hint: 'It lands under green flags — the things you appreciate, to mirror back some day.',
    detailLabel: 'What did they teach you?',
  },
  {
    id: 'in-motion',
    kind: 'detail',
    field: 'dreams',
    question: 'Who is chasing something big right now?',
    hint: 'A move, a career change, a first marathon — the thing to ask about next time.',
    detailLabel: 'What are they chasing?',
  },
  {
    id: 'birthday',
    kind: 'date',
    question: 'Whose birthday do you never want to miss?',
    hint: 'It will surface in Attention when the day comes near.',
    detailLabel: 'Their birthday',
  },
]

export const CENSUS_KEY = 'constellation-census-v1'

export function answeredCensusIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CENSUS_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    // unreadable state — treat the deck as fresh
  }
  return new Set()
}

export function markCensusAnswered(id: string): void {
  const done = answeredCensusIds()
  done.add(id)
  try {
    localStorage.setItem(CENSUS_KEY, JSON.stringify([...done]))
  } catch {
    // storage unavailable — the deck just won't remember across sessions
  }
}

export function remainingCensusPrompts(): CensusPrompt[] {
  const done = answeredCensusIds()
  return CENSUS_DECK.filter((p) => !done.has(p.id))
}
