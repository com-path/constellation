import type { Spark } from '../lib/sparks'
import { useStore } from '../store/store'

// Sparks (§6): two people who don't know each other but obviously should.
// Every spark shows why it fired; the user makes the call.

export function SparksPanel({
  sparks,
  onSelectPerson,
}: {
  sparks: Spark[]
  onSelectPerson: (id: string) => void
}) {
  const { state, dispatch } = useStore()
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? '?'
  const introduced = state.sparkStates.filter((s) => s.status === 'introduced')

  return (
    <div className="side-panel">
      <h3>Sparks</h3>
      <p className="panel-lede">
        Introductions waiting to happen. You'd be the bridge — and when one lands, a new
        thread appears in your sky, drawn by you.
      </p>
      {sparks.length === 0 && introduced.length === 0 && (
        <p className="hint">
          No sparks right now. They appear as you note what people love and what they're
          working toward.
        </p>
      )}
      <ul className="card-list">
        {sparks.map((s) => (
          <li key={s.pairKey} className="card">
            <div className="spark-pair">
              <button className="link" onClick={() => onSelectPerson(s.a)}>
                {name(s.a)}
              </button>
              <span className="spark-glyph">✦</span>
              <button className="link" onClick={() => onSelectPerson(s.b)}>
                {name(s.b)}
              </button>
            </div>
            <ul className="reason-list">
              {s.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <div className="card-actions">
              <button
                className="btn small"
                onClick={() =>
                  dispatch({ type: 'set_spark_status', a: s.a, b: s.b, status: 'introduced' })
                }
              >
                I'll introduce them
              </button>
              <button
                className="btn small ghost"
                onClick={() =>
                  dispatch({ type: 'set_spark_status', a: s.a, b: s.b, status: 'dismissed' })
                }
              >
                Not these two
              </button>
            </div>
          </li>
        ))}
      </ul>

      {introduced.length > 0 && (
        <>
          <h4>In flight</h4>
          <ul className="card-list">
            {introduced.map((s) => {
              const [a, b] = s.pairKey.split('|')
              return (
                <li key={s.pairKey} className="card">
                  <div className="spark-pair">
                    {name(a)} <span className="spark-glyph">✦</span> {name(b)}
                  </div>
                  <p className="hint">You said you'd introduce them. Did it take?</p>
                  <div className="card-actions">
                    <button
                      className="btn small"
                      onClick={() => dispatch({ type: 'set_spark_status', a, b, status: 'landed' })}
                    >
                      It landed — draw the thread
                    </button>
                    <button
                      className="btn small ghost"
                      onClick={() =>
                        dispatch({ type: 'set_spark_status', a, b, status: 'dismissed' })
                      }
                    >
                      It didn't take
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
