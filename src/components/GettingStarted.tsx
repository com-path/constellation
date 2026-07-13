import { useState } from 'react'
import type { AppState } from '../types'
import { useStore } from '../store/store'

// Post-tour nudges: once someone is building their own sky, suggest ONE next
// small step at a time, detected from their data. Invitations, not a checklist —
// dismissible, quiet, and gone entirely once the basics exist (§8.3: setup
// should be light and extendable later; no guilt mechanics, ever).

export const NUDGES_OFF_KEY = 'constellation-nudges-v1'

export interface Nudge {
  id: string
  title: string
  body: string
  actionLabel: string
  action: 'add_person' | 'log_moment' | 'open_person'
}

export function nextNudge(state: AppState): Nudge | null {
  if (state.people.length === 0) {
    return {
      id: 'first-star',
      title: 'Place your first star',
      body: 'Someone you’d call first with big news is a good place to begin.',
      actionLabel: 'New star',
      action: 'add_person',
    }
  }
  if (state.people.length < 4) {
    return {
      id: 'more-stars',
      title: 'Add a few more people',
      body: 'Pick them from different corners of your life — work, family, the old friends. The threads between corners are where it gets interesting.',
      actionLabel: 'New star',
      action: 'add_person',
    }
  }
  if (state.actions.length === 0) {
    return {
      id: 'first-moment',
      title: 'Log your first moment',
      body: 'Anything from today counts — a message is a moment. This is what the sky remembers.',
      actionLabel: 'Log a moment',
      action: 'log_moment',
    }
  }
  if (!state.people.some((p) => p.details.loves.length > 0)) {
    return {
      id: 'first-love',
      title: 'Note one thing someone loves',
      body: 'Open a star and add it under “Things they love” — it’s what powers event matching and sparks.',
      actionLabel: 'Open a star',
      action: 'open_person',
    }
  }
  if (!state.people.some((p) => p.details.dates.length > 0)) {
    return {
      id: 'first-date',
      title: 'Add one important date',
      body: 'A birthday — or one of the hard ones. Being remembered on those days means the most.',
      actionLabel: 'Open a star',
      action: 'open_person',
    }
  }
  if (state.edges.length === 0 && state.people.length >= 2) {
    return {
      id: 'first-thread',
      title: 'Connect two people',
      body: 'On someone’s page, add a thread to a person they already know. Threads are the history of your sky.',
      actionLabel: 'Open a star',
      action: 'open_person',
    }
  }
  return null
}

export function GettingStarted({
  onAddPerson,
  onLogMoment,
  onOpenPerson,
}: {
  onAddPerson: () => void
  onLogMoment: () => void
  onOpenPerson: (id: string) => void
}) {
  const { state } = useStore()
  const [hiddenThisSession, setHiddenThisSession] = useState(
    () => sessionStorage.getItem('constellation-nudge-later') === '1',
  )
  const [off, setOff] = useState(() => localStorage.getItem(NUDGES_OFF_KEY) === 'off')

  // Only for skies being built by hand — never over the demo data.
  const isDemo = state.people.some((p) => p.id === 'amara')
  const nudge = nextNudge(state)
  if (off || hiddenThisSession || isDemo || !nudge) return null

  const act = () => {
    if (nudge.action === 'add_person') onAddPerson()
    else if (nudge.action === 'log_moment') onLogMoment()
    else if (state.people.length > 0) onOpenPerson(state.people[0].id)
  }

  return (
    <div className="nudge-card" role="note" aria-label="Getting started suggestion">
      <button
        className="icon-btn subtle nudge-close"
        aria-label="Don't show these suggestions again"
        title="Don't show these again"
        onClick={() => {
          localStorage.setItem(NUDGES_OFF_KEY, 'off')
          setOff(true)
        }}
      >
        ×
      </button>
      <h4>{nudge.title}</h4>
      <p>{nudge.body}</p>
      <div className="card-actions">
        <button className="btn small" onClick={act}>
          {nudge.actionLabel}
        </button>
        <button
          className="btn small ghost"
          onClick={() => {
            sessionStorage.setItem('constellation-nudge-later', '1')
            setHiddenThisSession(true)
          }}
        >
          Later
        </button>
      </div>
    </div>
  )
}
