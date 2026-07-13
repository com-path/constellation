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

  const flagged = items.filter((i) => i.kind === 'flagged')
  const rest = items.filter((i) => i.kind !== 'flagged')
  const flaggedIds = new Set(flagged.map((i) => i.personId))
  // Flagged people already have their own section above — don't repeat them here.
  const weeklyRest = weekly.filter((w) => !flaggedIds.has(w.personId))

  const clearFlag = (personId: string) => {
    const person = state.people.find((p) => p.id === personId)
    if (person) dispatch({ type: 'update_person', person: { ...person, flaggedAt: undefined } })
  }

  return (
    <div className="side-panel">
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
        To pin someone here yourself, open their star and press “⚑ Flag for attention”.
        Notes under “For next time” show up here too.
      </p>
    </div>
  )
}
