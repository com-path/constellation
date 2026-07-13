import { useMemo } from 'react'
import { useStore } from '../store/store'
import { attentionItems, weeklySuggestions } from '../lib/closeness'

// Attention view (§2.6): who needs or holds your attention right now.
// Three tiers: people you flagged yourself, people quietly overdue, and
// everything waiting under "for next time". Gentle by design — noticings,
// not obligations; no red badges, no guilt.

export function AttentionPanel({
  onSelectPerson,
  onLogWith,
}: {
  onSelectPerson: (id: string) => void
  onLogWith: (id: string) => void
}) {
  const { state, dispatch } = useStore()
  const weekly = useMemo(() => weeklySuggestions(state), [state])
  const items = useMemo(() => attentionItems(state), [state])
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? '?'

  const reminders = items.filter((i) => i.kind === 'reminder' || i.kind === 'plan')
  const flagged = items.filter((i) => i.kind === 'flagged')
  const rest = items.filter(
    (i) => i.kind !== 'flagged' && i.kind !== 'reminder' && i.kind !== 'plan',
  )
  const topIds = new Set([...reminders, ...flagged].map((i) => i.personId))
  // People already shown in the sections above — don't repeat them in This week.
  const weeklyRest = weekly.filter((w) => !topIds.has(w.personId))

  const clearFlag = (personId: string) => {
    const person = state.people.find((p) => p.id === personId)
    if (person) dispatch({ type: 'update_person', person: { ...person, flaggedAt: undefined } })
  }

  return (
    <div className="side-panel">
      {reminders.length > 0 && (
        <>
          <h3>Coming up</h3>
          <ul className="card-list">
            {reminders.map((it) => (
              <li key={it.reminderId ?? `plan-${it.personId}`} className="card flagged-card">
                <button className="link" onClick={() => onSelectPerson(it.personId)}>
                  {it.kind === 'plan' ? '◑' : '◷'} {name(it.personId)}
                </button>
                <p className="reason">{it.note}</p>
                <div className="card-actions">
                  {it.kind === 'plan' ? (
                    <>
                      <button className="btn small" onClick={() => onLogWith(it.personId)}>
                        Log it
                      </button>
                      <button
                        className="btn small ghost"
                        title="Clear the plan — e.g. it moved or fell through"
                        onClick={() => {
                          const person = state.people.find((p) => p.id === it.personId)
                          if (person)
                            dispatch({
                              type: 'update_person',
                              person: { ...person, nextSeeing: undefined },
                            })
                        }}
                      >
                        Clear plan
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn small" onClick={() => onLogWith(it.personId)}>
                        I reached out
                      </button>
                      <button
                        className="btn small ghost"
                        onClick={() =>
                          it.reminderId &&
                          dispatch({
                            type: 'set_reminder_done',
                            reminderId: it.reminderId,
                            done: true,
                          })
                        }
                      >
                        Done
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {flagged.length > 0 && (
        <>
          <h3>Flagged by you</h3>
          <ul className="card-list">
            {flagged.map((it) => (
              <li key={it.personId} className="card flagged-card">
                <button className="link" onClick={() => onSelectPerson(it.personId)}>
                  ⚑ {name(it.personId)}
                </button>
                <p className="reason">{it.note}</p>
                <div className="card-actions">
                  <button className="btn small" onClick={() => onLogWith(it.personId)}>
                    I reached out
                  </button>
                  <button className="btn small ghost" onClick={() => clearFlag(it.personId)}>
                    Clear flag
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>This week</h3>
      <p className="panel-lede">People you might reach out to — with reasons.</p>
      <ul className="card-list">
        {weeklyRest.map((w) => (
          <li key={w.personId} className="card">
            <button className="link" onClick={() => onSelectPerson(w.personId)}>
              {name(w.personId)}
            </button>
            <p className="reason">{w.reason}</p>
            <div className="card-actions">
              <button className="btn small" onClick={() => onLogWith(w.personId)}>
                I reached out
              </button>
            </div>
          </li>
        ))}
        {weeklyRest.length === 0 && (
          <p className="hint">All quiet. Nothing needs you this week.</p>
        )}
      </ul>

      <h4>On your mind</h4>
      <ul className="card-list">
        {rest.map((it) => (
          <li key={it.personId + it.kind} className="card slim">
            <button className="link" onClick={() => onSelectPerson(it.personId)}>
              {name(it.personId)}
            </button>
            <span className="muted small">{it.note}</span>
          </li>
        ))}
        {rest.length === 0 && (
          <p className="hint">Nobody's drifting. Your sky is well-tended.</p>
        )}
      </ul>

      <p className="hint">
        To pin someone here yourself, open their star and press “⚑ Flag for attention” — or
        schedule a dated check-in under “Coming up” on their page (“back from the trip”,
        “after the interview”). Notes under “For next time” show up here too.
      </p>
    </div>
  )
}
