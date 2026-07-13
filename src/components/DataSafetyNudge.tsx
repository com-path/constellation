import { useState } from 'react'
import { useStore } from '../store/store'
import { useSync } from '../sync/SyncContext'
import { exportStateToFile, isDemoSky } from '../lib/backups'

// Once a sky holds real people, quietly point out that it lives only in this
// browser and offer the two durable exits: the encrypted cloud copy (when the
// deployment has sync) or a file of their own. Dismissable, and it stays
// dismissed for a fortnight — a nudge, not a nag.

const DISMISS_KEY = 'constellation-safety-nudge-v1'
const REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000
const MIN_PEOPLE = 3

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return raw != null && Date.now() - Number(raw) < REMIND_AFTER_MS
  } catch {
    return false
  }
}

export function DataSafetyNudge({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { state } = useStore()
  const sync = useSync()
  const [dismissed, setDismissed] = useState(recentlyDismissed)

  const unsynced = sync.status === 'disabled' || sync.status === 'signed_out'
  if (dismissed || !unsynced || state.people.length < MIN_PEOPLE || isDemoSky(state)) {
    return null
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // still dismiss for this session
    }
    setDismissed(true)
  }

  return (
    <p className="capacity-note" role="status">
      Your sky lives only in this browser so far.{' '}
      {sync.status === 'signed_out' ? (
        <>
          <button className="link small" onClick={onOpenAccount}>
            Sign in
          </button>{' '}
          to keep an encrypted copy that survives this device, or{' '}
        </>
      ) : (
        <>To be safe, </>
      )}
      <button className="link small" onClick={() => exportStateToFile(state)}>
        download a copy
      </button>{' '}
      you keep yourself.{' '}
      <button className="link small" onClick={dismiss} aria-label="Dismiss for two weeks">
        dismiss
      </button>
    </p>
  )
}
