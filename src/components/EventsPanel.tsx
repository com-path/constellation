import { useEffect, useMemo, useState } from 'react'
import type { EventItem, EventKind } from '../types'
import { EVENT_KIND_NAMES, PRESET_EVENT_TAGS, uid } from '../types'
import { useStore } from '../store/store'
import { eventCandidates, reverseSuggestions } from '../lib/events'
import { relativeDay } from '../lib/dates'

// The events view (§4) — the original spark for the whole product.
// Composing an event lights up the people who'd fit, live, as tags are chosen;
// clicking a lit star invites them. An invitation is a scheduled engagement:
// it shows on their page, settles their flags, and appears in the catalogue.

const KIND_HINTS: Record<EventKind, string> = {
  one_to_one: 'The deepening mechanism',
  small_gathering: 'The community-weaving mechanism',
  large_event: 'The low-intensity keeping-in-touch mechanism',
}

export function EventsPanel({
  selectedEventId,
  onSelectEvent,
  onHighlight,
  onInvitedChange,
  registerStarHandler,
  onSelectPerson,
}: {
  selectedEventId: string | null
  onSelectEvent: (id: string | null) => void
  onHighlight: (ids: Set<string> | null) => void
  onInvitedChange: (ids: Set<string> | null) => void
  /** Lets the sky hand star-clicks to this panel; return true to consume the click. */
  registerStarHandler: (fn: ((personId: string) => boolean) | null) => void
  onSelectPerson: (id: string) => void
}) {
  const { state, dispatch } = useStore()
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward')
  const [what, setWhat] = useState('')
  const [date, setDate] = useState('')
  const [tags, setTags] = useState('')
  const [kind, setKind] = useState<EventKind>('small_gathering')
  const [draftInvited, setDraftInvited] = useState<string[]>([])
  const [reversePeople, setReversePeople] = useState<string[]>([])

  const event = state.events.find((e) => e.id === selectedEventId) ?? null
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? '?'

  const parsedTags = useMemo(
    () =>
      tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tags],
  )

  const draftActive = !event && (parsedTags.length > 0 || draftInvited.length > 0)

  const draftEvent = useMemo<EventItem>(
    () => ({
      id: '__draft',
      what: what.trim() || 'New event',
      when: '',
      date: date || undefined,
      kind,
      tags: parsedTags,
      invited: draftInvited,
    }),
    [what, date, kind, parsedTags, draftInvited],
  )

  const candidates = useMemo(() => {
    if (event) return eventCandidates(state, event)
    if (draftActive) return eventCandidates(state, draftEvent)
    return []
  }, [state, event, draftActive, draftEvent])

  // Live emphasis on the sky: matching people light up, invited people get rings.
  useEffect(() => {
    if (mode !== 'forward') return
    const invited = event ? event.invited : draftActive ? draftInvited : null
    if (event || draftActive) {
      onHighlight(new Set([...candidates.map((c) => c.personId), ...(invited ?? [])]))
      onInvitedChange(new Set(invited ?? []))
    } else {
      onHighlight(null)
      onInvitedChange(null)
    }
  }, [mode, event, draftActive, candidates, draftInvited, onHighlight, onInvitedChange])

  // Star-clicks in the sky toggle invitations while an event (or draft) is live.
  useEffect(() => {
    registerStarHandler((personId: string) => {
      if (mode !== 'forward') return false
      if (event) {
        dispatch({ type: 'toggle_event_invite', eventId: event.id, personId })
        return true
      }
      if (draftActive || what.trim() || parsedTags.length > 0) {
        setDraftInvited((cur) =>
          cur.includes(personId) ? cur.filter((x) => x !== personId) : [...cur, personId],
        )
        return true
      }
      return false
    })
    return () => registerStarHandler(null)
  }, [mode, event, draftActive, what, parsedTags, dispatch, registerStarHandler])

  // Leaving the panel clears all sky emphasis.
  useEffect(
    () => () => {
      onHighlight(null)
      onInvitedChange(null)
    },
    [onHighlight, onInvitedChange],
  )

  const knownTags = useMemo(() => {
    const set = new Map<string, string>()
    for (const t of PRESET_EVENT_TAGS) set.set(t.toLowerCase(), t)
    for (const p of state.people)
      for (const t of p.details.eventTags) set.set(t.toLowerCase(), t)
    return [...set.values()].sort()
  }, [state.people])

  const ideas = useMemo(
    () => (mode === 'reverse' ? reverseSuggestions(state, reversePeople) : []),
    [state, mode, reversePeople],
  )

  const addEvent = () => {
    const e: EventItem = {
      id: uid(),
      what: what.trim(),
      when: date ? '' : 'Sometime soon',
      date: date || undefined,
      kind,
      tags: parsedTags,
      invited: draftInvited,
    }
    dispatch({ type: 'add_event', event: e })
    onSelectEvent(e.id)
    setWhat('')
    setDate('')
    setTags('')
    setDraftInvited([])
  }

  const toggleInvite = (personId: string) => {
    if (event) dispatch({ type: 'toggle_event_invite', eventId: event.id, personId })
    else
      setDraftInvited((cur) =>
        cur.includes(personId) ? cur.filter((x) => x !== personId) : [...cur, personId],
      )
  }

  const invitedList = event ? event.invited : draftInvited

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
            onInvitedChange(null)
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
                onClick={() => onSelectEvent(e.id === selectedEventId ? null : e.id)}
              >
                <strong>{e.what}</strong>
                <div className="muted small">
                  {e.date ? relativeDay(e.date) : e.when} · {EVENT_KIND_NAMES[e.kind]}
                  {e.tags.length > 0 && ` · ${e.tags.join(', ')}`}
                  {e.invited.length > 0 &&
                    ` · ${e.invited.length} invited`}
                </div>
                {e.id === selectedEventId && (
                  <button
                    className="btn small ghost"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      dispatch({ type: 'remove_event', eventId: e.id })
                      onSelectEvent(null)
                    }}
                  >
                    Remove event
                  </button>
                )}
              </li>
            ))}
          </ul>

          {!event && (
            <>
              <h4>Something's come up</h4>
              <input
                className="wide"
                placeholder="What is it? (a gig, a spare ticket, a dinner)"
                value={what}
                onChange={(e) => setWhat(e.target.value)}
              />
              <input type="date" className="wide" value={date} onChange={(e) => setDate(e.target.value)} />
              <input
                className="wide"
                placeholder="Tags, comma-separated (live music, hiking…)"
                value={tags}
                list="event-tag-list"
                onChange={(e) => setTags(e.target.value)}
              />
              <datalist id="event-tag-list">
                {knownTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              {knownTags.length > 0 && (
                <div className="chip-row">
                  {knownTags.slice(0, 8).map((t) => (
                    <button
                      key={t}
                      className={`chip ${parsedTags.some((x) => x.toLowerCase() === t.toLowerCase()) ? 'chip-on' : ''}`}
                      title="Toggle tag — the sky lights up matching people"
                      onClick={() =>
                        setTags(() => {
                          const cur = parsedTags.filter(
                            (x) => x.toLowerCase() !== t.toLowerCase(),
                          )
                          if (cur.length === parsedTags.length) cur.push(t)
                          return cur.join(', ')
                        })
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
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
              {draftActive && (
                <p className="hint">
                  The sky is lit with people who'd fit — click a star to invite them.
                </p>
              )}
            </>
          )}

          {(event || draftActive) && (
            <>
              <h4>Invited{invitedList.length > 0 ? ` · ${invitedList.length}` : ''}</h4>
              {invitedList.length === 0 && (
                <p className="hint">
                  Nobody yet — click a lit star in the sky, or use “Invite” below.
                </p>
              )}
              {invitedList.length > 0 && (
                <div className="chip-row">
                  {invitedList.map((id) => (
                    <span key={id} className="chip chip-on chip-static">
                      {name(id)}
                      <button
                        className="chip-x"
                        aria-label={`Uninvite ${name(id)}`}
                        onClick={() => toggleInvite(id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <h4>Who fits</h4>
              {candidates.length === 0 && (
                <p className="hint">
                  Nobody jumps out yet — add tags that match what people love or the events
                  you've marked them for.
                </p>
              )}
              <ul className="card-list">
                {candidates.map((c) => {
                  const p = state.people.find((x) => x.id === c.personId)
                  if (!p) return null
                  const isInvited = invitedList.includes(p.id)
                  return (
                    <li key={c.personId} className="card">
                      <div className="spark-pair">
                        <button className="link" onClick={() => onSelectPerson(p.id)}>
                          {p.name}
                        </button>
                        <span className="tour-spacer" />
                        <button
                          className={`btn small ${isInvited ? '' : 'ghost'}`}
                          onClick={() => toggleInvite(p.id)}
                        >
                          {isInvited ? 'Invited ✓' : 'Invite'}
                        </button>
                      </div>
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

          {!event && (
            <button className="btn small" onClick={addEvent} disabled={!what.trim()}>
              Add event{draftInvited.length > 0 ? ` with ${draftInvited.length} invited` : ''}
            </button>
          )}
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
