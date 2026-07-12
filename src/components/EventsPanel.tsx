import { useMemo, useState } from 'react'
import type { EventItem, EventKind } from '../types'
import { EVENT_KIND_NAMES, uid } from '../types'
import { useStore } from '../store/store'
import { eventCandidates, reverseSuggestions } from '../lib/events'

// The events view (§4) — the original spark for the whole product.
// Forward: here's a thing, who'd love it? Reverse: here are people, what's the thing?

const KIND_HINTS: Record<EventKind, string> = {
  one_to_one: 'The deepening mechanism',
  small_gathering: 'The community-weaving mechanism',
  large_event: 'The low-intensity keeping-in-touch mechanism',
}

export function EventsPanel({
  selectedEventId,
  onSelectEvent,
  onHighlight,
  onSelectPerson,
}: {
  selectedEventId: string | null
  onSelectEvent: (id: string | null) => void
  onHighlight: (ids: Set<string> | null) => void
  onSelectPerson: (id: string) => void
}) {
  const { state, dispatch } = useStore()
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward')
  const [what, setWhat] = useState('')
  const [when, setWhen] = useState('')
  const [tags, setTags] = useState('')
  const [kind, setKind] = useState<EventKind>('small_gathering')
  const [reversePeople, setReversePeople] = useState<string[]>([])

  const event = state.events.find((e) => e.id === selectedEventId) ?? null
  const candidates = useMemo(
    () => (event ? eventCandidates(state, event) : []),
    [state, event],
  )

  const ideas = useMemo(
    () => (mode === 'reverse' ? reverseSuggestions(state, reversePeople) : []),
    [state, mode, reversePeople],
  )

  const addEvent = () => {
    const e: EventItem = {
      id: uid(),
      what: what.trim(),
      when: when.trim() || 'Sometime soon',
      kind,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    dispatch({ type: 'add_event', event: e })
    onSelectEvent(e.id)
    setWhat('')
    setWhen('')
    setTags('')
  }

  const selectEvent = (e: EventItem) => {
    onSelectEvent(e.id)
    onHighlight(new Set(eventCandidates(state, e).map((c) => c.personId)))
  }

  return (
    <div className="side-panel">
      <h3>Events</h3>
      <div className="chip-row">
        <button
          className={`chip ${mode === 'forward' ? 'chip-on' : ''}`}
          onClick={() => setMode('forward')}
        >
          I have a thing — who'd love it?
        </button>
        <button
          className={`chip ${mode === 'reverse' ? 'chip-on' : ''}`}
          onClick={() => {
            setMode('reverse')
            onSelectEvent(null)
            onHighlight(null)
          }}
        >
          I have people — what's the thing?
        </button>
      </div>

      {mode === 'forward' && (
        <>
          <ul className="card-list">
            {state.events.map((e) => (
              <li
                key={e.id}
                className={`card clickable ${e.id === selectedEventId ? 'card-on' : ''}`}
                onClick={() => selectEvent(e)}
              >
                <strong>{e.what}</strong>
                <div className="muted small">
                  {e.when} · {EVENT_KIND_NAMES[e.kind]}
                  {e.tags.length > 0 && ` · ${e.tags.join(', ')}`}
                </div>
                {e.id === selectedEventId && (
                  <button
                    className="btn small ghost"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      dispatch({ type: 'remove_event', eventId: e.id })
                      onSelectEvent(null)
                      onHighlight(null)
                    }}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>

          {event && (
            <>
              <h4>Who fits</h4>
              {candidates.length === 0 && (
                <p className="hint">
                  Nobody jumps out yet — try adding tags that match what people love.
                </p>
              )}
              <ul className="card-list">
                {candidates.map((c) => {
                  const p = state.people.find((x) => x.id === c.personId)
                  if (!p) return null
                  return (
                    <li key={c.personId} className="card">
                      <button className="link" onClick={() => onSelectPerson(p.id)}>
                        {p.name}
                      </button>
                      <ul className="reason-list">
                        {c.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <h4>Something's come up</h4>
          <input
            className="wide"
            placeholder="What is it? (a gig, a spare ticket, a free Saturday)"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
          />
          <input
            className="wide"
            placeholder="When?"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
          <input
            className="wide"
            placeholder="Tags, comma-separated (live music, hiking…)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <div className="kind-row">
            {(Object.keys(EVENT_KIND_NAMES) as EventKind[]).map((k) => (
              <button
                key={k}
                className={`chip ${kind === k ? 'chip-on' : ''}`}
                title={KIND_HINTS[k]}
                onClick={() => setKind(k)}
              >
                {EVENT_KIND_NAMES[k]}
              </button>
            ))}
          </div>
          <button className="btn small" onClick={addEvent} disabled={!what.trim()}>
            Add event
          </button>
        </>
      )}

      {mode === 'reverse' && (
        <>
          <p className="panel-lede">Pick the people you want to see.</p>
          <div className="chip-row">
            {state.people
              .filter((p) => p.ring !== 'outer')
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <button
                  key={p.id}
                  className={`chip ${reversePeople.includes(p.id) ? 'chip-on' : ''}`}
                  onClick={() => {
                    const next = reversePeople.includes(p.id)
                      ? reversePeople.filter((x) => x !== p.id)
                      : [...reversePeople, p.id]
                    setReversePeople(next)
                    onHighlight(next.length > 0 ? new Set(next) : null)
                  }}
                >
                  {p.name}
                </button>
              ))}
          </div>
          {ideas.length > 0 && (
            <>
              <h4>What you might do</h4>
              <ul className="reason-list ideas">
                {ideas.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
