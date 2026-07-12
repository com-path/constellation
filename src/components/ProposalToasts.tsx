import { useStore } from '../store/store'
import type { Proposal } from '../lib/closeness'

// Ring movement, resolved as the hybrid (§2.7c): the app notices, the user decides.
// Never a rebuke — quiet suggestions that can be waved away.

export function ProposalToasts({ proposals }: { proposals: Proposal[] }) {
  const { dispatch } = useStore()
  if (proposals.length === 0) return null
  const p = proposals[0] // one at a time — gentle, never a backlog

  return (
    <div className="proposal-toast">
      <p>{p.reason}</p>
      <div className="card-actions">
        <button
          className="btn small"
          onClick={() => {
            dispatch({ type: 'move_ring', personId: p.personId, ring: p.to })
            dispatch({ type: 'dismiss_proposal', key: p.key })
          }}
        >
          {p.direction === 'inward' ? 'Move them inward' : 'Let them drift'}
        </button>
        <button
          className="btn small ghost"
          onClick={() => dispatch({ type: 'dismiss_proposal', key: p.key })}
        >
          Leave as is
        </button>
      </div>
    </div>
  )
}
