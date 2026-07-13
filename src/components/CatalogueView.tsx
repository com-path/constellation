import { useMemo, useState } from 'react'
import type { Person } from '../types'
import { RING_NAMES } from '../types'
import { useStore } from '../store/store'
import { actionsFor, cadenceFor, daysSinceTouch, daysUntilDate } from '../lib/closeness'
import { friendshipDuration, relativeDay } from '../lib/dates'

// The catalogue: every star in rows — search, filter, sort. Columns are facts
// and dates, never scores (§1.3): the table organises, it does not rank people.

type SortKey = 'name' | 'ring' | 'since' | 'last' | 'seeing' | 'next' | 'moments'

const RING_ORDER: Record<string, number> = { 1: 1, 2: 2, 3: 3, 4: 4, outer: 5 }

interface Row {
  person: Person
  ringOrder: number
  sinceTs: number | null
  lastDays: number
  hasMoments: boolean
  nextDate: { label: string; days: number } | null
  moments: number
  seeing: { date: string; note?: string } | null
  cadence: number | null
  flagged: boolean
  hasReminder: boolean
}

const COLUMNS: Array<{ key: SortKey | null; label: string; title?: string }> = [
  { key: 'name', label: 'Star' },
  { key: 'ring', label: 'Orbit' },
  { key: null, label: 'Where from' },
  { key: 'since', label: 'Friends for' },
  { key: 'last', label: 'Last crossed paths' },
  { key: null, label: 'Rhythm', title: 'Check-in rhythm (ring default or personal)' },
  { key: 'seeing', label: 'Seeing next', title: 'Your next scheduled plan together' },
  { key: 'next', label: 'Next date' },
  { key: 'moments', label: 'Moments' },
]

export function CatalogueView({ onSelectPerson }: { onSelectPerson: (id: string) => void }) {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [ringFilter, setRingFilter] = useState<string>('all')
  const [contextFilter, setContextFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('ring')
  const [asc, setAsc] = useState(true)

  const contexts = useMemo(
    () => [...new Set(state.people.flatMap((p) => p.contexts))].sort(),
    [state.people],
  )

  const rows = useMemo<Row[]>(
    () =>
      state.people.map((person) => {
        const upcoming = person.details.dates
          .map((d) => ({ label: d.label, days: daysUntilDate(d.date) }))
          .sort((a, b) => a.days - b.days)[0]
        const moments = actionsFor(state.actions, person.id).length
        return {
          person,
          ringOrder: RING_ORDER[String(person.ring)] ?? 9,
          sinceTs: person.knownSince ? Date.parse(person.knownSince) : null,
          lastDays: daysSinceTouch(state.actions, person),
          hasMoments: moments > 0,
          nextDate: upcoming ?? null,
          moments,
          seeing: person.nextSeeing ?? null,
          cadence: cadenceFor(person),
          flagged: !!person.flaggedAt,
          hasReminder: state.reminders.some((r) => r.personId === person.id && !r.done),
        }
      }),
    [state],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = rows.filter((r) => {
      if (ringFilter !== 'all' && String(r.person.ring) !== ringFilter) return false
      if (contextFilter !== 'all' && !r.person.contexts.includes(contextFilter)) return false
      if (!q) return true
      const hay = [
        r.person.name,
        r.person.occupation ?? '',
        r.person.location ?? '',
        r.person.howMet,
        ...r.person.contexts,
        ...r.person.details.loves,
        ...r.person.details.eventTags,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    const dir = asc ? 1 : -1
    const cmp: Record<SortKey, (a: Row, b: Row) => number> = {
      name: (a, b) => a.person.name.localeCompare(b.person.name),
      ring: (a, b) => a.ringOrder - b.ringOrder || a.person.name.localeCompare(b.person.name),
      since: (a, b) => (a.sinceTs ?? Infinity) - (b.sinceTs ?? Infinity),
      last: (a, b) => a.lastDays - b.lastDays,
      seeing: (a, b) => (a.seeing?.date ?? '9999').localeCompare(b.seeing?.date ?? '9999'),
      next: (a, b) => (a.nextDate?.days ?? Infinity) - (b.nextDate?.days ?? Infinity),
      moments: (a, b) => a.moments - b.moments,
    }
    return filtered.sort((a, b) => dir * cmp[sortKey](a, b))
  }, [rows, query, ringFilter, contextFilter, sortKey, asc])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc)
    else {
      setSortKey(key)
      setAsc(true)
    }
  }

  return (
    <div className="catalogue">
      <div className="catalogue-controls">
        <input
          className="catalogue-search"
          placeholder="Search names, contexts, loves…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={ringFilter} onChange={(e) => setRingFilter(e.target.value)}>
          <option value="all">All orbits</option>
          {(['1', '2', '3', '4', 'outer'] as const).map((r) => (
            <option key={r} value={r}>
              {RING_NAMES[r]}
            </option>
          ))}
        </select>
        <select value={contextFilter} onChange={(e) => setContextFilter(e.target.value)}>
          <option value="all">All contexts</option>
          {contexts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="muted small">
          {visible.length} of {state.people.length} people
        </span>
      </div>

      <div className="catalogue-scroll">
        <table className="catalogue-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.label} title={c.title}>
                  {c.key ? (
                    <button className="th-sort" onClick={() => toggleSort(c.key!)}>
                      {c.label}
                      {sortKey === c.key && <span className="sort-arrow">{asc ? '▲' : '▼'}</span>}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.person.id} onClick={() => onSelectPerson(r.person.id)}>
                <td className="cat-name">
                  {r.person.name}
                  {r.flagged && (
                    <span className="muted" title="Flagged for attention">
                      {' '}
                      ⚑
                    </span>
                  )}
                  {r.hasReminder && (
                    <span className="muted" title="Has an upcoming reminder">
                      {' '}
                      ◷
                    </span>
                  )}
                </td>
                <td>{RING_NAMES[String(r.person.ring)]}</td>
                <td className="muted">{r.person.contexts.join(', ')}</td>
                <td className="muted">
                  {r.person.knownSince ? friendshipDuration(r.person.knownSince) : '—'}
                </td>
                <td className="muted">
                  {r.hasMoments
                    ? r.lastDays === 0
                      ? 'today'
                      : `${r.lastDays} days ago`
                    : 'nothing logged yet'}
                </td>
                <td className="muted">{r.cadence != null ? `~${r.cadence}d` : '—'}</td>
                <td className={r.seeing ? 'cat-seeing' : 'muted'}>
                  {r.seeing
                    ? `${relativeDay(r.seeing.date)}${r.seeing.note ? ` · ${r.seeing.note}` : ''}`
                    : '—'}
                </td>
                <td className="muted">
                  {r.nextDate
                    ? `${r.nextDate.label} · ${
                        r.nextDate.days === 0 ? 'today' : `in ${r.nextDate.days}d`
                      }`
                    : '—'}
                </td>
                <td className="muted">{r.moments}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="hint">
                  Nobody matches — try clearing the search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
