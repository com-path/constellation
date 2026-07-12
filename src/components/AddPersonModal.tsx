import { useState } from 'react'
import type { Person, Ring } from '../types'
import { RING_DESCRIPTIONS, RING_NAMES, uid } from '../types'
import { useStore } from '../store/store'
import { Modal } from './ui'

// Onboarding a new friend (§8.3): short, warm, under a minute, extendable later.
// Deliberate hand-placement, not bulk import — sparseness is a feature.

const RING_OPTIONS: Ring[] = [4, 3, 2, 1, 'outer']

export function AddPersonModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [howMet, setHowMet] = useState('')
  const [context, setContext] = useState('')
  const [ring, setRing] = useState<Ring>(4)
  const [knows, setKnows] = useState<string[]>([])
  const [remember, setRemember] = useState('')

  const existingContexts = [...new Set(state.people.flatMap((p) => p.contexts))].sort()

  const toggleKnows = (id: string) =>
    setKnows((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const save = () => {
    const person: Person = {
      id: uid(),
      name: name.trim(),
      contexts: context.trim() ? [context.trim()] : ['Elsewhere'],
      ring,
      howMet: howMet.trim(),
      details: {
        rituals: [],
        loves: [],
        toDiscuss: remember.trim() ? [remember.trim()] : [],
        inJokes: [],
        admires: [],
        dates: [],
        dreams: [],
        theirPeople: [],
        giftIdeas: [],
        repairNotes: [],
      },
      ringHistory: [{ ring, at: Date.now() }],
      createdAt: Date.now(),
    }
    dispatch({
      type: 'add_person',
      person,
      knows: knows.map((otherId) => ({
        otherId,
        context: context.trim() || 'Know each other',
      })),
    })
    onClose()
  }

  const sorted = state.people.slice().sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Modal title="A new star" onClose={onClose}>
      <h4>Who are they?</h4>
      <input
        className="wide"
        placeholder="Their name"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />

      <h4>How did you meet?</h4>
      <input
        className="wide"
        placeholder="e.g. The Tuesday climbing crew"
        value={howMet}
        onChange={(e) => setHowMet(e.target.value)}
      />

      <h4>Context</h4>
      <input
        className="wide"
        placeholder="Work, the supper club, university…"
        value={context}
        list="contexts"
        onChange={(e) => setContext(e.target.value)}
      />
      <datalist id="contexts">
        {existingContexts.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <h4>Where do they orbit, for now?</h4>
      <div className="ring-options">
        {RING_OPTIONS.map((r) => (
          <button
            key={String(r)}
            className={`ring-option ${ring === r ? 'ring-on' : ''}`}
            onClick={() => setRing(r)}
          >
            <strong>{RING_NAMES[String(r)]}</strong>
            <span className="hint">{RING_DESCRIPTIONS[String(r)]}</span>
          </button>
        ))}
      </div>

      <h4>Who else do you both know?</h4>
      <p className="hint">This wires them into the constellation.</p>
      <div className="chip-row">
        {sorted.map((p) => (
          <button
            key={p.id}
            className={`chip ${knows.includes(p.id) ? 'chip-on' : ''}`}
            onClick={() => toggleKnows(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <h4>Anything to remember? (optional)</h4>
      <input
        className="wide"
        placeholder="e.g. New to the city, loves analogue photography"
        value={remember}
        onChange={(e) => setRemember(e.target.value)}
      />

      <div className="modal-footer">
        <button className="btn" onClick={save} disabled={!name.trim()}>
          Place them in the sky
        </button>
      </div>
    </Modal>
  )
}
