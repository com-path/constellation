import { useState } from 'react'
import type { ActionType, Modality } from '../types'
import { ACTION_TYPE_META, ACTION_TYPE_ORDER, MODALITY_NAMES, uid } from '../types'
import { useStore } from '../store/store'
import { dateInputToTs, todayInput } from '../lib/dates'
import { Modal } from './ui'

// Feather-light logging (§8.2a): two seconds, not two minutes.
// Preselect a person when opened from their page; group moments touch many edges.

const MODALITIES: Modality[] = ['message', 'call', 'in_person', 'letter', 'gift', 'introduction']

export function LogActionModal({
  initialPersonIds,
  onClose,
}: {
  initialPersonIds: string[]
  onClose: () => void
}) {
  const { state, dispatch } = useStore()
  const [participants, setParticipants] = useState<string[]>(initialPersonIds)
  const [type, setType] = useState<ActionType>('everyday')
  const [modality, setModality] = useState<Modality>('message')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayInput())

  const toggle = (id: string) =>
    setParticipants((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const save = () => {
    dispatch({
      type: 'log_action',
      action: {
        id: uid(),
        type,
        modality,
        participants,
        // Backdating is first-class: "we met up a few weeks ago" belongs on that day.
        timestamp: date === todayInput() ? Date.now() : dateInputToTs(date),
        note: note.trim(),
      },
    })
    onClose()
  }

  const sorted = state.people.slice().sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Modal title="Log a moment" onClose={onClose}>
      <h4>Who was it with?</h4>
      <div className="chip-row">
        {sorted.map((p) => (
          <button
            key={p.id}
            className={`chip ${participants.includes(p.id) ? 'chip-on' : ''}`}
            onClick={() => toggle(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <h4>What kind of moment?</h4>
      <div className="type-grid">
        {ACTION_TYPE_ORDER.map((t) => (
          <button
            key={t}
            className={`type-card ${type === t ? 'type-on' : ''}`}
            onClick={() => setType(t)}
          >
            <span className="type-dot" style={{ background: ACTION_TYPE_META[t].color }} />
            <strong>{ACTION_TYPE_META[t].name}</strong>
            <span className="hint">{ACTION_TYPE_META[t].hint}</span>
          </button>
        ))}
      </div>

      <h4>How?</h4>
      <div className="chip-row">
        {MODALITIES.map((m) => (
          <button
            key={m}
            className={`chip ${modality === m ? 'chip-on' : ''}`}
            onClick={() => setModality(m)}
          >
            {MODALITY_NAMES[m]}
          </button>
        ))}
      </div>

      <h4>When?</h4>
      <input
        type="date"
        value={date}
        max={todayInput()}
        onChange={(e) => setDate(e.target.value)}
      />

      <h4>A line for the story (optional)</h4>
      <input
        className="wide"
        placeholder="e.g. Long walk — talked properly about her mum"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && participants.length > 0 && save()}
      />

      <div className="modal-footer">
        <button className="btn" onClick={save} disabled={participants.length === 0}>
          Log it
        </button>
      </div>
    </Modal>
  )
}
