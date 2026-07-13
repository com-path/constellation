import { useMemo, useState } from 'react'
import type { Person, Ring } from '../types'
import {
  ACTION_TYPE_META,
  MODALITY_NAMES,
  RING_DESCRIPTIONS,
  RING_NAMES,
  uid,
} from '../types'
import { useStore } from '../store/store'
import { actionsFor, daysSinceTouch, pathInward } from '../lib/closeness'
import { EditableList, fmtDateFull } from './ui'

// The person page (§3): tapping a star. All of §3.1 plus the candidate
// additions from §3.2 that survived scrutiny (their people, repair notes,
// gift ideas, the position-over-time sparkline).

const RING_OPTIONS: Ring[] = [1, 2, 3, 4, 'outer']

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

  const history = useMemo(
    () =>
      actionsFor(state.actions, person.id)
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp),
    [state.actions, person.id],
  )

  const observation = pathInward(state, person)
  const days = daysSinceTouch(state.actions, person)

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
    <aside className="profile-drawer">
      <div className="profile-header">
        <button className="icon-btn" onClick={onClose} aria-label="Close profile">
          ×
        </button>
        <h2>{person.name}</h2>
        <p className="muted">
          {[person.occupation, person.location].filter(Boolean).join(' · ')}
        </p>
        <p className="how-met">{person.howMet}</p>
        <p className="muted small">
          {person.contexts.join(' · ')}
          {days > 0 ? ` · last crossed paths ${days} days ago` : ' · crossed paths today'}
        </p>

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

        {person.ringHistory.length > 1 && <JourneySparkline person={person} />}

        {observation && <p className="observation">{observation}</p>}

        <div className="profile-actions">
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
        {person.flaggedAt != null && (
          <p className="hint">
            {person.name} will sit at the top of the Attention view until you log a moment
            with them, or clear the flag.
          </p>
        )}
      </div>

      <div className="profile-sections">
        <section>
          <h3>Shared history</h3>
          {history.length === 0 && (
            <p className="hint">Nothing logged yet — the story starts whenever you do.</p>
          )}
          <ul className="history-list">
            {history.map((a) => (
              <li key={a.id}>
                <span
                  className="type-dot"
                  style={{ background: ACTION_TYPE_META[a.type].color }}
                  title={ACTION_TYPE_META[a.type].name}
                />
                <div>
                  <div className="history-note">{a.note || ACTION_TYPE_META[a.type].name}</div>
                  <div className="muted small">
                    {fmtDateFull(a.timestamp)} · {ACTION_TYPE_META[a.type].name} ·{' '}
                    {MODALITY_NAMES[a.modality]}
                    {a.participants.length > 1 &&
                      ` · with ${a.participants
                        .filter((id) => id !== person.id)
                        .map((id) => state.people.find((p) => p.id === id)?.name)
                        .filter(Boolean)
                        .join(', ')}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Special details</h3>
          <EditableList
            label="Rituals & recurrences"
            hint="The annual thing, the Sunday call, the birthday tradition."
            items={person.details.rituals}
            onChange={(rituals) => update({ rituals })}
          />
          <EditableList
            label="Things they love"
            hint="Their tea, their band, their favourite bookshop."
            items={person.details.loves}
            onChange={(loves) => update({ loves })}
          />
          <EditableList
            label="For next time"
            hint="Things you want to discuss with them."
            items={person.details.toDiscuss}
            onChange={(toDiscuss) => update({ toDiscuss })}
          />
          <EditableList
            label="In-jokes & shared language"
            items={person.details.inJokes}
            onChange={(inJokes) => update({ inJokes })}
          />
        </section>

        <section>
          <h3>Green flags</h3>
          <EditableList
            label="What you admire about them"
            hint="Mirror it back to them sometime — one of the most underrated acts of friendship."
            items={person.details.admires}
            onChange={(admires) => update({ admires })}
          />
        </section>

        <section>
          <h3>Important dates</h3>
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

        <section>
          <h3>In motion</h3>
          <EditableList
            label="Dreams, goals & worries"
            hint="What they're working toward or worried about — fuel for the “how did it go?” check-in."
            items={person.details.dreams}
            onChange={(dreams) => update({ dreams })}
          />
        </section>

        <ThreadsSection person={person} />

        <section>
          <h3>Their people</h3>
          <EditableList
            label="Partner, kids, the ones they talk about"
            hint="Knowing the names matters."
            items={person.details.theirPeople}
            onChange={(theirPeople) => update({ theirPeople })}
          />
        </section>

        <section>
          <h3>Scratchpads</h3>
          <EditableList
            label="Gift ideas & letter fragments"
            hint="Accretes over the year so December isn't a panic."
            items={person.details.giftIdeas}
            onChange={(giftIdeas) => update({ giftIdeas })}
          />
          <EditableList
            label="Repair notes"
            hint="Ongoing friction, an unresolved thing, an apology you owe. Friendships have maintenance debt."
            items={person.details.repairNotes}
            onChange={(repairNotes) => update({ repairNotes })}
          />
        </section>

        <section className="danger-zone">
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
    </aside>
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
    <section>
      <h3>Threads</h3>
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
