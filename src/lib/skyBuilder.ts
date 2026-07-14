// Bulk on-ramps for populating the sky: device contacts, a .vcf file, and the
// brain-dump textarea all stage people here before anything is created.
// The posture matches the note parser (§8.2a): transparent local extraction,
// and the user reviews every staged star before it lands. Imports default to
// the outer field — being in someone's address book is context, not closeness.

import type { Edge, Person, Ring } from '../types'
import { pairKey, uid } from '../types'

export type StageSource = 'contacts' | 'braindump' | 'census'

export interface StagedPerson {
  key: string // local list key, not the eventual person id
  name: string
  context: string
  ring: Ring
  /** One free line — lands under "for next time". */
  note?: string
  /** Something they love, when the brain-dump line said so. */
  loves?: string
  /** MM-DD, from a vCard BDAY or a brain-dump "birthday 03-14". */
  birthday?: string
  source: StageSource
  include: boolean
  /** Name of an existing star with the same name — probably already in the sky. */
  duplicateOf?: string
}

function staged(
  name: string,
  source: StageSource,
  extra: Partial<StagedPerson> = {},
): StagedPerson {
  return {
    key: uid(),
    name: name.trim(),
    context: '',
    ring: 'outer',
    source,
    include: true,
    ...extra,
  }
}

const normalizeName = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ')

/** Mark staged people who look like existing stars (or earlier staged rows) and untick them. */
export function markDuplicates(list: StagedPerson[], existing: Person[]): StagedPerson[] {
  const known = new Map(existing.map((p) => [normalizeName(p.name), p.name]))
  const seenInBatch = new Set<string>()
  return list.map((s) => {
    const key = normalizeName(s.name)
    const dupe = known.get(key) ?? (seenInBatch.has(key) ? s.name : undefined)
    seenInBatch.add(key)
    if (dupe) return { ...s, duplicateOf: dupe, include: false }
    return { ...s, duplicateOf: undefined }
  })
}

// ---------------------------------------------------------------------------
// Brain dump — one person per line, with optional light syntax:
//   Sofia — work, close and deepening, loves ceramics, birthday 12-05
//   Marco & Dena — the supper club
// Everything after the dash is comma-separated; recognised bits are pulled
// out (ring words, "loves …", "birthday MM-DD"), the first leftover names the
// context, the rest becomes a line for next time.
// ---------------------------------------------------------------------------

const RING_WORDS: Array<{ re: RegExp; ring: Ring }> = [
  { re: /\b(ride or die|inner(most)? (circle|ring)|closest)\b/i, ring: 1 },
  { re: /\b(deepening|bringing (them )?in(ward)?|getting close(r)?)\b/i, ring: 2 },
  { re: /\bgood friends?\b/i, ring: 3 },
  { re: /\b(promising|acquaintance|new friend|want to know better)\b/i, ring: 4 },
  { re: /\b(outer( field)?|contextual)\b/i, ring: 'outer' },
  // Bare "close" last, so "closest" and "getting closer" win first.
  { re: /\bclose\b/i, ring: 2 },
]

const BIRTHDAY_RE = /\b(?:birthday|bday|b-day)\s*:?\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\b/i
const LOVES_RE = /^(?:loves?|into|big fan of|obsessed with)\s+(.+)$/i

const pad2 = (n: number) => String(n).padStart(2, '0')

export function parseBrainDump(text: string): StagedPerson[] {
  const out: StagedPerson[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim().replace(/^[-*•]\s+/, '')
    if (!line) continue

    // Name — rest. Accept em/en dashes, " - ", or a colon.
    const m = line.match(/^(.*?)(?:\s+[—–-]\s+|—|–|:)(.*)$/)
    const namePart = (m ? m[1] : line).trim()
    const rest = m ? m[2].trim() : ''
    if (!namePart) continue

    let ring: Ring = 'outer'
    let context = ''
    let loves: string | undefined
    let birthday: string | undefined
    const noteBits: string[] = []

    for (const rawToken of rest.split(',')) {
      let token = rawToken.trim()
      if (!token) continue

      const bday = token.match(BIRTHDAY_RE)
      if (bday) {
        birthday = `${pad2(Number(bday[1]))}-${pad2(Number(bday[2]))}`
        token = token.replace(BIRTHDAY_RE, '').trim()
        if (!token) continue
      }
      const lovesMatch = token.match(LOVES_RE)
      if (lovesMatch) {
        loves = lovesMatch[1].trim()
        continue
      }
      const ringWord = RING_WORDS.find((r) => r.re.test(token))
      if (ringWord && token.length <= 30) {
        ring = ringWord.ring
        continue
      }
      if (!context) context = token
      else noteBits.push(token)
    }

    // "Marco & Dena" / "Marco and Dena" — two people sharing the same line.
    const names = namePart
      .split(/\s*&\s*|\s+and\s+/i)
      .map((n) => n.trim())
      .filter(Boolean)
    for (const name of names) {
      out.push(
        staged(name, 'braindump', {
          context,
          ring,
          loves,
          birthday,
          note: noteBits.join(', ') || undefined,
        }),
      )
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// vCard (.vcf) files — the export format of Apple/Google/Outlook contacts.
// Parsed entirely in the browser; only names and birthdays are read.
// ---------------------------------------------------------------------------

export function parseVcf(text: string): StagedPerson[] {
  // Unfold continued lines (RFC 6350 §3.2), then walk card by card.
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const out: StagedPerson[] = []
  let name = ''
  let fallbackName = ''
  let birthday: string | undefined

  for (const line of lines) {
    const sep = line.indexOf(':')
    if (sep < 0) continue
    // "item1.BDAY;VALUE=date" → "BDAY"
    const prop = line
      .slice(0, sep)
      .replace(/^item\d+\./i, '')
      .split(';')[0]
      .trim()
      .toUpperCase()
    const value = line.slice(sep + 1).trim()

    if (prop === 'BEGIN') {
      name = ''
      fallbackName = ''
      birthday = undefined
    } else if (prop === 'FN') {
      name = value
    } else if (prop === 'N' && !fallbackName) {
      // Family;Given;Middle;Prefix;Suffix
      const [family = '', given = ''] = value.split(';')
      fallbackName = [given, family].filter(Boolean).join(' ').trim()
    } else if (prop === 'BDAY') {
      // 19870314 · 1987-03-14 · --0314 · --03-14 — keep only MM-DD.
      const digits = value.replace(/\D/g, '')
      if (digits.length >= 8) birthday = `${digits.slice(4, 6)}-${digits.slice(6, 8)}`
      else if (digits.length === 4) birthday = `${digits.slice(0, 2)}-${digits.slice(2, 4)}`
    } else if (prop === 'END') {
      const finalName = (name || fallbackName).trim()
      if (finalName) out.push(staged(finalName, 'contacts', { birthday }))
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Contact Picker API — mobile Chrome and friends. The browser shows its own
// picker; the page receives only the fields asked for (names, here) and only
// for the contacts the user multi-selected. Nothing leaves the device.
// ---------------------------------------------------------------------------

interface ContactsManagerLike {
  select(props: string[], opts?: { multiple?: boolean }): Promise<Array<{ name?: string[] }>>
}

function contactsManager(): ContactsManagerLike | null {
  const nav = navigator as unknown as { contacts?: ContactsManagerLike }
  return nav.contacts && typeof nav.contacts.select === 'function' ? nav.contacts : null
}

export function contactPickerAvailable(): boolean {
  return contactsManager() != null
}

export async function pickContacts(): Promise<StagedPerson[]> {
  const contacts = contactsManager()
  if (!contacts) return []
  try {
    const picked = await contacts.select(['name'], { multiple: true })
    return picked
      .map((c) => (c.name?.[0] ?? '').trim())
      .filter(Boolean)
      .map((n) => staged(n, 'contacts'))
  } catch {
    // The user dismissed the picker, or the browser refused — either way, nothing staged.
    return []
  }
}

// ---------------------------------------------------------------------------
// Committing a staged batch: build real Person records plus, for any context
// the user chose to thread, the pairwise edges that wire the group together.
// ---------------------------------------------------------------------------

/** A minimal, well-formed star — the shared shape for every flow that creates people. */
export function blankPerson(name: string, context: string, ring: Ring): Person {
  return {
    id: uid(),
    name: name.trim(),
    contexts: [context.trim() || 'Elsewhere'],
    ring,
    howMet: '',
    details: {
      rituals: [],
      loves: [],
      toDiscuss: [],
      inJokes: [],
      admires: [],
      dates: [],
      dreams: [],
      theirPeople: [],
      giftIdeas: [],
      repairNotes: [],
      eventTags: [],
    },
    ringHistory: [{ ring, at: Date.now() }],
    createdAt: Date.now(),
  }
}

export function stagedToPerson(s: StagedPerson): Person {
  const p = blankPerson(s.name, s.context, s.ring)
  if (s.loves) p.details.loves.push(s.loves)
  if (s.note) p.details.toDiscuss.push(s.note)
  if (s.birthday) p.details.dates.push({ id: uid(), label: 'Birthday', date: s.birthday })
  return p
}

export function buildBatch(
  stagedList: StagedPerson[],
  existing: Person[],
  threadContexts: Set<string>,
): { people: Person[]; edges: Edge[] } {
  const people = stagedList
    .filter((s) => s.include && s.name.trim())
    .map(stagedToPerson)

  const edges: Edge[] = []
  const seen = new Set<string>()
  for (const context of threadContexts) {
    const newcomers = people.filter((p) => p.contexts.includes(context))
    const already = existing.filter((p) => p.contexts.includes(context))
    // Thread every pair that involves at least one newcomer — existing pairs
    // are the user's history to draw, not the importer's.
    for (let i = 0; i < newcomers.length; i++) {
      for (let j = i + 1; j < newcomers.length; j++) {
        edges.push({ a: newcomers[i].id, b: newcomers[j].id, context, introducedByUser: false })
      }
      for (const old of already) {
        const key = pairKey(newcomers[i].id, old.id)
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ a: newcomers[i].id, b: old.id, context, introducedByUser: false })
      }
    }
  }
  return { people, edges }
}
