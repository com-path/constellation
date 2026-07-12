import { useMemo } from 'react'
import { useStore } from '../store/store'
import { attentionItems, weeklySuggestions } from '../lib/closeness'

// Attention view (§2.6): who's been on your mind. Plus the Monday kickoff (§8.2b):
// three people, chosen with reasons, not just recency. Gentle by design — no red
// badges, no guilt. These are noticings, not obligations.

export function AttentionPanel({
  onSelectPerson,
  onLogWith,
}: {
  onSelectPerson: (id: string) => void
  onLogWith: (id: string) => void
}) {
  const { state } = useStore()
  const weekly = useMemo(() => weeklySuggestions(state), [state])
  const items = useMemo(() => attentionItems(state), [state])
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? '?'

  return (
    <div className="side-panel">
      <h3>This week</h3>
      <p className="panel-lede">Three people you might reach out to — with reasons.</p>
      <ul className="card-list">
        {weekly.map((w) => (
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
        {weekly.length === 0 && <p className="hint">All quiet. Nothing needs you this week.</p>}
      </ul>

      <h4>On your mind</h4>
      <ul className="card-list">
        {items.map((it) => (
          <li key={it.personId + it.kind} className="card slim">
            <button className="link" onClick={() => onSelectPerson(it.personId)}>
              {name(it.personId)}
            </button>
            <span className="muted small">{it.note}</span>
          </li>
        ))}
        {items.length === 0 && (
          <p className="hint">Nobody's drifting. Your sky is well-tended.</p>
        )}
      </ul>
    </div>
  )
}
