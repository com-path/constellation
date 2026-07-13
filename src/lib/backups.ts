import type { AppState } from '../types'

// Safety net for the sky. Before any action that replaces the whole state —
// opening the demo, clearing, a cloud copy loading over local — the current
// sky is snapshotted into a small ring buffer so nothing is ever one click
// away from gone. Users can also export/import their sky as a plain file.

const BACKUPS_KEY = 'constellation-backups-v1'
const MAX_BACKUPS = 10

export type BackupReason = 'demo' | 'clear' | 'replaced' | 'import' | 'manual'

export interface Backup {
  id: string
  at: number
  reason: BackupReason
  state: AppState
}

export const REASON_LABELS: Record<BackupReason, string> = {
  demo: 'Before opening the example sky',
  clear: 'Before starting fresh',
  replaced: 'Before another copy loaded',
  import: 'Before loading a file',
  manual: 'Saved by you',
}

function readAll(): Backup[] {
  try {
    const raw = localStorage.getItem(BACKUPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Backup[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(backups: Backup[]): boolean {
  // Oldest-first in storage; drop from the front if the quota pushes back.
  let list = backups
  while (list.length > 0) {
    try {
      localStorage.setItem(BACKUPS_KEY, JSON.stringify(list))
      return true
    } catch {
      list = list.slice(1)
    }
  }
  console.warn('[Backups] Could not persist any backups — storage is full')
  return false
}

/** Is this sky the built-in example? (Seed people carry fixed ids.) */
export function isDemoSky(state: AppState): boolean {
  return state.people.some((p) => p.id === 'amara' || p.id === 'ben')
}

/**
 * Snapshot the given state. Skips empty skies (nothing to protect) and exact
 * duplicates of the most recent backup (so repeated loads don't churn the ring).
 */
export function takeSnapshot(state: AppState, reason: BackupReason): void {
  if (state.people.length === 0) return
  const existing = readAll()
  const serialized = JSON.stringify(state)
  const newest = existing[existing.length - 1]
  if (newest && JSON.stringify(newest.state) === serialized) return
  const backup: Backup = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    reason,
    state,
  }
  writeAll([...existing, backup].slice(-MAX_BACKUPS))
}

/** All backups, newest first. */
export function listBackups(): Backup[] {
  return readAll().slice().reverse()
}

export function deleteBackup(id: string): void {
  writeAll(readAll().filter((b) => b.id !== id))
}

/** Download the sky as a JSON file the user keeps wherever they like. */
export function exportStateToFile(state: AppState): void {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `constellation-sky-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Parse an exported sky file. Throws with a readable message if it isn't one. */
export async function parseStateFile(file: File): Promise<AppState> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  const candidate = parsed as AppState
  if (!candidate || !Array.isArray(candidate.people)) {
    throw new Error("That file doesn't look like an exported sky.")
  }
  return candidate
}
