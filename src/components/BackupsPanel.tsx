import { useRef, useState } from 'react'
import { useStore } from '../store/store'
import {
  REASON_LABELS,
  exportStateToFile,
  isDemoSky,
  listBackups,
  parseStateFile,
  takeSnapshot,
  type Backup,
} from '../lib/backups'
import { Modal, fmtDateFull } from './ui'

// Every destructive moment (demo, start fresh, a cloud copy loading) leaves a
// snapshot behind; this panel is where those snapshots become recoverable.
// It's also where the sky leaves the browser on the user's own terms: a plain
// JSON file they can keep, and load back in whenever they like.

function describe(b: Backup): string {
  const people = b.state.people.length
  const moments = b.state.actions.length
  return `${people} ${people === 1 ? 'person' : 'people'}, ${moments} ${moments === 1 ? 'moment' : 'moments'}`
}

export function BackupsPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const [backups, setBackups] = useState(listBackups)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => setBackups(listBackups())

  const saveNow = () => {
    takeSnapshot(state, 'manual')
    refresh()
    setNotice('Saved a snapshot of your current sky.')
  }

  const restore = (b: Backup) => {
    const ok = window.confirm(
      `Restore the sky from ${fmtDateFull(b.at)} (${describe(b)})? ` +
        'Your current sky will be kept as a backup too.',
    )
    if (!ok) return
    dispatch({ type: 'load_state', state: b.state })
    refresh()
    setNotice('Restored. Your previous sky was backed up as well.')
  }

  const importFile = async (file: File) => {
    try {
      const imported = await parseStateFile(file)
      dispatch({ type: 'load_state', state: imported })
      refresh()
      setNotice('Loaded the sky from your file. The previous sky was backed up.')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Modal title="Backups & export" onClose={onClose}>
      <p className="hint">
        Before anything replaces your sky — opening the example, starting fresh, another copy
        loading — a snapshot is kept here automatically. You can restore any of them, or keep
        your own copy as a file.
      </p>

      <div className="modal-footer" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn small" onClick={() => exportStateToFile(state)}>
          Download my sky
        </button>
        <button className="btn small ghost" onClick={() => fileRef.current?.click()}>
          Load a sky from file
        </button>
        <button className="btn small ghost" onClick={saveNow}>
          Snapshot now
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importFile(f)
            e.target.value = ''
          }}
        />
      </div>

      {notice && <p className="hint">{notice}</p>}

      <h4>Snapshots</h4>
      {backups.length === 0 ? (
        <p className="hint">
          None yet. One will appear the moment anything would replace your sky.
        </p>
      ) : (
        <ul className="legend-list">
          {backups.map((b) => (
            <li key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>
                {fmtDateFull(b.at)}{' '}
                {new Date(b.at).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                <span className="muted">
                  {' '}
                  · {REASON_LABELS[b.reason]} · {describe(b)}
                  {isDemoSky(b.state) ? ' · example sky' : ''}
                </span>
              </span>
              <span style={{ marginLeft: 'auto' }}>
                <button className="btn small ghost" onClick={() => restore(b)}>
                  Restore
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
