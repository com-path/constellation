import { useEffect, useMemo, useState } from 'react'
import type { ActionLog, Person, Ring } from '../types'
import {
  ACTION_TYPE_META,
  MODALITY_NAMES,
  PRESET_EVENT_TAGS,
  RING_DESCRIPTIONS,
  RING_NAMES,
  uid,
} from '../types'
import { useStore } from '../store/store'
import { actionsFor, cadenceFor, daysSinceTouch, pathInward, RING_CADENCE } from '../lib/closeness'
import { dateInputToTs, friendshipDuration, relativeDay, todayInput } from '../lib/dates'
import { EditableList, fmtDateFull } from './ui'

// The person page (§3): tapping a star. On desktop it opens as a broad page —
// the story, the texture, and the practical side by side — because being able
// to take a friend in at a glance is the whole point of keeping this.

const RING_OPTIONS: Ring[] = [1, 2, 3, 4, 'outer']

const RHYTHM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '7', label: 'Weekly' },
  { value: '14', label: 'Every two weeks' },
  { value: '30', label: 'Monthly' },
  { value: '60', label: 'Every two months' },
  { value: '90', label: 'Quarterly' },
  { value: '0', label: 'No reminders' },
]

export function PersonProfile({
  person,
  onClose,
  onLogAction,
  onQuickNote,
}: {
  person: Person
  onClose: () => void
  onLogAction: () => void
  onQuickNote: () => void
}) {
  const { state, dispatch } = useStore()
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Escape closes the page — every edit is already saved the moment it's made.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const history = useMemo(
    () =>
      actionsFor(state.actions, person.id)
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp),
    [state.actions, person.id],
  )

  const observation = pathInward(state, person)
  const days = daysSinceTouch(state.actions, person)
  const ringDefault = RING_CADENCE[String(person.ring)]
  const cadence = cadenceFor(person)

  const update = (partial: Partial<Person['details']>) =>
    dispatch({
      type: 'update_person',
      person: { ...person, details: { ...person.details, ...partial } },
    })

  const [dateLabel, setDateLabel] = useState('')
  const [dateVal, setDateVal] = useState('')
  const [dateHard, setDateHard] = useState(false)

  const addDate = () => {
    if (!dateLabel.trim() || !/^\d{2}-\d{2}$/.test(dateVal)) return
    update({
      dates: [
        ...person.details.dates,
        { id: uid(), label: dateLabel.trim(), date: dateVal, hard: dateHard },
      ],
    })
    setDateLabel('')
    setDateVal('')
    setDateHard(false)
  }

  return (
    <div className="person-scrim" onClick={onClose}>
      <aside className="person-page" onClick={(e) => e.stopPropagation()}>
        <header className="person-head">
          <div className="person-id">
            <h2>{person.name}</h2>
            <p className="muted">
              {[person.occupation, person.location].filter(Boolean).join(' · ')}
            </p>
            <p className="how-met">{person.howMet}</p>
            <p className="muted small">
              {person.contexts.join(' · ')}
              {days > 0 ? ` · last crossed paths ${days} days ago` : ' · crossed paths today'}
            </p>
            <p className="muted small known-since">
              {person.knownSince
                ? `✦ ${friendshipDuration(person.knownSince)} of friendship · since`
                : 'When did this friendship begin?'}{' '}
              <input
                type="date"
                value={person.knownSince ?? ''}
                max={todayInput()}
                aria-label="Friends since"
                onChange={(e) =>
                  dispatch({
                    type: 'update_person',
                    person: { ...person, knownSince: e.target.value || undefined },
                  })
                }
              />
            </p>
            {person.nextSeeing && (
              <p className="muted small">
                ◑ Seeing them {relativeDay(person.nextSeeing.date)}
                {person.nextSeeing.note && ` — ${person.nextSeeing.note}`}
              </p>
            )}
            {observation && <p className="observation">{observation}</p>}
          </div>

          <div className="person-side">
            <button className="icon-btn person-close" onClick={onClose} aria-label="Close">
              ×
            </button>
            <div className="person-actions">
              <button className="btn" onClick={onLogAction}>
                Log a moment
              </button>
              <button className="btn ghost" onClick={onQuickNote}>
                Quick note
              </button>
              <button
                className={`btn ghost ${person.flaggedAt ? 'flag-on' : ''}`}
                title={
                  person.flaggedAt
                    ? 'Flagged for attention — click to clear'
                    : 'Pin them to the Attention view until you next reach out'
                }
                onClick={() =>
                  dispatch({
                    type: 'update_person',
                    person: { ...person, flaggedAt: person.flaggedAt ? undefined : Date.now() },
                  })
                }
              >
                {person.flaggedAt ? '⚑ Flagged' : '⚑ Flag for attention'}
              </button>
            </div>

            <label className="ring-select">
              <span>Orbit</span>
              <select
                value={String(person.ring)}
                onChange={(e) => {
                  const v = e.target.value
                  dispatch({
                    type: 'move_ring',
                    personId: person.id,
                    ring: v === 'outer' ? 'outer' : (Number(v) as Ring),
                  })
                }}
              >
                {RING_OPTIONS.map((r) => (
                  <option key={String(r)} value={String(r)}>
                    {RING_NAMES[String(r)]}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">{RING_DESCRIPTIONS[String(person.ring)]}</p>

            <label className="ring-select">
              <span>Check-in rhythm</span>
              <select
                value={person.checkinDays != null ? String(person.checkinDays) : ''}
                onChange={(e) =>
                  dispatch({
                    type: 'update_person',
                    person: {
                      ...person,
                      checkinDays:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
              >
                <option value="">
                  {ringDefault != null
                    ? `Ring default (~${ringDefault} days)`
                    : 'Ring default (no reminders)'}
                </option>
                {RHYTHM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              {cadence == null
                ? 'They won’t appear as overdue in the Attention view.'
                : `Attention will gently surface them after ~${cadence} days of silence.`}
            </p>

            {person.ringHistory.length > 1 && <JourneySparkline person={person} />}
          </div>
        </header>

        <div className="person-columns">
          {/* ——— The story: reminders ahead, then the timeline back to the beginning ——— */}
          <div className="pcol">
            <h3 className="pcol-title">The story</h3>
            <SeeingNext person={person} />
            <ComingUp person={person} />
            <Timeline person={person} history={history} />
          </div>

          {/* ——— The texture ——— */}
          <div className="pcol">
            <h3 className="pcol-title">The texture</h3>
            <section className="psec">
              <EditableList
                label="Rituals & recurrences"
                hint="The annual thing, the Sunday call, the birthday tradition."
                items={person.details.rituals}
                onChange={(rituals) => update({ rituals })}
              />
            </section>
            <section className="psec">
              <EditableList
                label="Things they love"
                hint="Their tea, their band, their favourite bookshop."
                items={person.details.loves}
                onChange={(loves) => update({ loves })}
              />
            </section>
            <section className="psec">
              <EditableList
                label="For next time"
                hint="Things you want to discuss with them. These show in Attention."
                items={person.details.toDiscuss}
                onChange={(toDiscuss) => update({ toDiscuss })}
              />
            </section>
            <section className="psec">
              <EditableList
                label="Green flags — what you admire"
                hint="Mirror it back to them sometime; it's one of the most underrated acts of friendship."
                items={person.details.admires}
                onChange={(admires) => update({ admires })}
              />
            </section>
            <section className="psec">
              <EditableList
                label="In-jokes & shared language"
                items={person.details.inJokes}
                onChange={(inJokes) => update({ inJokes })}
              />
            </section>
          </div>

          {/* ——— The practical ——— */}
          <div className="pcol">
            <h3 className="pcol-title">The practical</h3>

            <section className="psec">
              <h4>Good events for them</h4>
              <p className="hint">
                What kind of outing fits {person.name}? The Events view uses these to match.
              </p>
              <EventTagsEditor person={person} onChange={(eventTags) => update({ eventTags })} />
            </section>

            <section className="psec">
              <h4>Important dates</h4>
              <ul className="dates-list">
                {person.details.dates.map((d) => (
                  <li key={d.id} className={d.hard ? 'hard-date' : ''}>
                    <span>
                      {d.label} — {d.date}
                      {d.hard && <em> · a hard one; showing up matters</em>}
                    </span>
                    <button
                      className="icon-btn subtle"
                      aria-label={`Remove ${d.label}`}
                      onClick={() =>
                        update({ dates: person.details.dates.filter((x) => x.id !== d.id) })
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className="add-row">
                <input
                  placeholder="Label (e.g. Birthday)"
                  value={dateLabel}
                  onChange={(e) => setDateLabel(e.target.value)}
                />
                <input
                  placeholder="MM-DD"
                  value={dateVal}
                  style={{ maxWidth: '5.5rem' }}
                  onChange={(e) => setDateVal(e.target.value)}
                />
                <label className="checkbox small">
                  <input
                    type="checkbox"
                    checked={dateHard}
                    onChange={(e) => setDateHard(e.target.checked)}
                  />
                  a hard one
                </label>
                <button
                  className="btn small"
                  onClick={addDate}
                  disabled={!dateLabel.trim() || !/^\d{2}-\d{2}$/.test(dateVal)}
                >
                  Add
                </button>
              </div>
            </section>

            <section className="psec">
              <EditableList
                label="In motion — dreams, goals & worries"
                hint="What they're working toward or worried about — fuel for the “how did it go?” check-in."
                items={person.details.dreams}
                onChange={(dreams) => update({ dreams })}
              />
            </section>

            <section className="psec">
              <EditableList
                label="Their people"
                hint="Partner, kids, the ones they talk about. Knowing the names matters."
                items={person.details.theirPeople}
                onChange={(theirPeople) => update({ theirPeople })}
              />
            </section>

            <ThreadsSection person={person} />

            <section className="psec">
              <EditableList
                label="Gift ideas & letter fragments"
                hint="Accretes over the year so December isn't a panic."
                items={person.details.giftIdeas}
                onChange={(giftIdeas) => update({ giftIdeas })}
              />
            </section>
            <section className="psec">
              <EditableList
                label="Repair notes"
                hint="Ongoing friction, an unresolved thing, an apology you owe."
                items={person.details.repairNotes}
                onChange={(repairNotes) => update({ repairNotes })}
              />
            </section>

            <section className="psec danger-zone">
              {confirmRemove ? (
                <div className="confirm-row">
                  <span className="muted small">Remove {person.name} and their history?</span>
                  <button
                    className="btn small danger"
                    onClick={() => {
                      dispatch({ type: 'remove_person', personId: person.id })
                      onClose()
                    }}
                  >
                    Remove
                  </button>
                  <button className="btn small ghost" onClick={() => setConfirmRemove(false)}>
                    Keep
                  </button>
                </div>
              ) : (
                <button className="btn small ghost muted" onClick={() => setConfirmRemove(true)}>
                  Remove from constellation
                </button>
              )}
            </section>
          </div>
        </div>

        <button className="btn person-done" onClick={onClose} title="Everything saves as you type — this just returns to the sky (Esc works too)">
          ✓ Done — changes saved
        </button>
      </aside>
    </div>
  )
}

/** The next concrete plan with this person — a date in the diary, not a hope. */
function SeeingNext({ person }: { person: Person }) {
  const { dispatch } = useStore()
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const plan = person.nextSeeing

  const set = () => {
    if (!date) return
    dispatch({
      type: 'update_person',
      person: { ...person, nextSeeing: { date, note: note.trim() || undefined } },
    })
    setDate('')
    setNote('')
  }

  return (
    <section className="psec">
      <h4>Seeing them next</h4>
      {plan ? (
        <ul className="dates-list">
          <li>
            <span>
              ◑ {relativeDay(plan.date)}
              {plan.note && <span className="muted small"> — {plan.note}</span>}
            </span>
            <button
              className="icon-btn subtle"
              aria-label="Clear the plan"
              title="Clear — e.g. it moved or fell through"
              onClick={() =>
                dispatch({ type: 'update_person', person: { ...person, nextSeeing: undefined } })
              }
            >
              ×
            </button>
          </li>
        </ul>
      ) : (
        <div className="add-row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input
            placeholder="What's the plan? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && set()}
          />
          <button className="btn small" onClick={set} disabled={!date}>
            Set
          </button>
        </div>
      )}
    </section>
  )
}

/** Scheduled check-ins for this person — "she's back from the trip in a month". */
function ComingUp({ person }: { person: Person }) {
  const { state, dispatch } = useStore()
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')

  const reminders = state.reminders
    .filter((r) => r.personId === person.id && !r.done)
    .sort((a, b) => a.date.localeCompare(b.date))

  const add = () => {
    if (!date || !note.trim()) return
    dispatch({
      type: 'add_reminder',
      reminder: { id: uid(), personId: person.id, date, note: note.trim(), done: false },
    })
    setDate('')
    setNote('')
  }

  return (
    <section className="psec">
      <h4>Coming up</h4>
      {reminders.length === 0 && (
        <p className="hint">
          Set a check-in for later — “back from the trip”, “after the interview”. It will
          surface in Attention when the day comes.
        </p>
      )}
      <ul className="dates-list">
        {reminders.map((r) => (
          <li key={r.id}>
            <span>
              {r.note}
              <span className="muted small"> — {relativeDay(r.date)}</span>
            </span>
            <button
              className="icon-btn subtle"
              aria-label={`Remove reminder: ${r.note}`}
              onClick={() => dispatch({ type: 'remove_reminder', reminderId: r.id })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="add-row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          placeholder="Remind me to…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn small" onClick={add} disabled={!date || !note.trim()}>
          Add
        </button>
      </div>
    </section>
  )
}

/** The friendship in time order: moments, movements between rings, and where it began.
 *  Log past moments via “Log a moment” — the date field goes back as far as needed. */
function Timeline({ person, history }: { person: Person; history: ActionLog[] }) {
  const { state } = useStore()

  type Entry =
    | { key: string; ts: number; kind: 'action'; action: ActionLog }
    | { key: string; ts: number; kind: 'ring'; ring: Ring }

  const entries: Entry[] = [
    ...history.map((a) => ({ key: a.id, ts: a.timestamp, kind: 'action' as const, action: a })),
    ...person.ringHistory
      .slice(1)
      .map((h, i) => ({ key: `ring-${i}`, ts: h.at, kind: 'ring' as const, ring: h.ring })),
  ].sort((a, b) => b.ts - a.ts)

  const beginTs = person.knownSince ? dateInputToTs(person.knownSince) : person.createdAt

  return (
    <section className="psec timeline">
      {entries.length === 0 && (
        <p className="hint">
          Nothing logged yet — the story starts whenever you do. “Log a moment” accepts past
          dates, so memories can go in retroactively.
        </p>
      )}
      <ul className="history-list">
        {entries.map((e) =>
          e.kind === 'action' ? (
            <li key={e.key}>
              <span
                className="type-dot"
                style={{ background: ACTION_TYPE_META[e.action.type].color }}
                title={ACTION_TYPE_META[e.action.type].name}
              />
              <div>
                <div className="history-note">
                  {e.action.note || ACTION_TYPE_META[e.action.type].name}
                </div>
                <div className="muted small">
                  {fmtDateFull(e.action.timestamp)} · {ACTION_TYPE_META[e.action.type].name} ·{' '}
                  {MODALITY_NAMES[e.action.modality]}
                  {e.action.participants.length > 1 &&
                    ` · with ${e.action.participants
                      .filter((id) => id !== person.id)
                      .map((id) => state.people.find((p) => p.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}`}
                </div>
              </div>
            </li>
          ) : (
            <li key={e.key} className="timeline-ring">
              <span className="type-dot ring-dot" />
              <div>
                <div className="history-note muted">
                  <em>Moved to {RING_NAMES[String(e.ring)]}</em>
                </div>
                <div className="muted small">{fmtDateFull(e.ts)}</div>
              </div>
            </li>
          ),
        )}
        <li className="timeline-start">
          <span className="type-dot start-dot" />
          <div>
            <div className="history-note">
              <em>{person.knownSince ? 'Where it began' : 'Added to your sky'}</em>
            </div>
            <div className="muted small">
              {fmtDateFull(beginTs)}
              {person.knownSince && ` · ${friendshipDuration(person.knownSince)} ago`}
            </div>
          </div>
        </li>
      </ul>
    </section>
  )
}

/** Tag editor for the kinds of events that suit this person. */
function EventTagsEditor({
  person,
  onChange,
}: {
  person: Person
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const tags = person.details.eventTags
  const presets = PRESET_EVENT_TAGS.filter(
    (p) => !tags.some((t) => t.toLowerCase() === p.toLowerCase()),
  )
  const add = (tag: string) => {
    const v = tag.trim()
    if (!v || tags.some((t) => t.toLowerCase() === v.toLowerCase())) return
    onChange([...tags, v])
    setDraft('')
  }
  return (
    <div>
      {tags.length > 0 && (
        <div className="chip-row">
          {tags.map((t) => (
            <span key={t} className="chip chip-on chip-static">
              {t}
              <button
                className="chip-x"
                aria-label={`Remove ${t}`}
                onClick={() => onChange(tags.filter((x) => x !== t))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {presets.length > 0 && (
        <div className="chip-row">
          {presets.map((p) => (
            <button key={p} className="chip" title="Add" onClick={() => add(p)}>
              + {p}
            </button>
          ))}
        </div>
      )}
      <div className="add-row">
        <input
          value={draft}
          placeholder="Or your own — “bouldering”, “board games night”…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add(draft)}
        />
        <button className="btn small" onClick={() => add(draft)} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  )
}

/** Threads: who this person knows in your sky, and how. Fixed history (§2.3),
 *  but you can record a thread you forgot to draw when adding them. */
function ThreadsSection({ person }: { person: Person }) {
  const { state, dispatch } = useStore()
  const [otherId, setOtherId] = useState('')
  const [context, setContext] = useState('')

  const threads = state.edges
    .filter((e) => e.a === person.id || e.b === person.id)
    .map((e) => ({
      edge: e,
      other: state.people.find((p) => p.id === (e.a === person.id ? e.b : e.a)),
    }))
    .filter((t) => t.other)

  const connectedIds = new Set(threads.map((t) => t.other!.id))
  const candidates = state.people
    .filter((p) => p.id !== person.id && !connectedIds.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <section className="psec">
      <h4>Threads</h4>
      {threads.length === 0 && (
        <p className="hint">Nobody in your sky is linked to {person.name} yet.</p>
      )}
      <ul className="dates-list">
        {threads.map(({ edge, other }) => (
          <li key={other!.id}>
            <span>
              {other!.name}
              <span className="muted small"> — {edge.context}</span>
              {edge.introducedByUser && <em className="muted small"> · you drew this</em>}
            </span>
            <button
              className="icon-btn subtle"
              aria-label={`Remove thread to ${other!.name}`}
              onClick={() => dispatch({ type: 'remove_edge', a: edge.a, b: edge.b })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {candidates.length > 0 && (
        <div className="add-row">
          <select value={otherId} onChange={(e) => setOtherId(e.target.value)}>
            <option value="">Knows…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            placeholder="How? (e.g. university)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <button
            className="btn small"
            disabled={!otherId}
            onClick={() => {
              dispatch({
                type: 'add_edge',
                edge: {
                  a: person.id,
                  b: otherId,
                  context: context.trim() || 'Know each other',
                  introducedByUser: false,
                },
              })
              setOtherId('')
              setContext('')
            }}
          >
            Add
          </button>
        </div>
      )}
    </section>
  )
}

/** A quiet little memory of the friendship's arc (§3.2). */
function JourneySparkline({ person }: { person: Person }) {
  const W = 140
  const H = 30
  const hist = person.ringHistory
  const t0 = hist[0].at
  const t1 = Date.now()
  const ringY = (r: Ring) => {
    const idx = r === 'outer' ? 4 : r - 1
    return 4 + (idx / 4) * (H - 8)
  }
  const pts: string[] = []
  hist.forEach((h, i) => {
    const x = 4 + ((h.at - t0) / Math.max(1, t1 - t0)) * (W - 8)
    if (i > 0) pts.push(`${x},${ringY(hist[i - 1].ring)}`) // step, not slope
    pts.push(`${x},${ringY(h.ring)}`)
  })
  pts.push(`${W - 4},${ringY(hist[hist.length - 1].ring)}`)
  return (
    <div className="sparkline" title="Their journey through your constellation — top is inward">
      <svg width={W} height={H} role="img" aria-label="Journey through the rings over time">
        <polyline points={pts.join(' ')} fill="none" stroke="#c9b078" strokeWidth="1.5" />
      </svg>
      <span className="muted small">their journey</span>
    </div>
  )
}
