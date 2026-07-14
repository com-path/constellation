import { useState } from 'react'
import type { AppState } from '../types'
import { useStore } from '../store/store'
import { remainingCensusPrompts } from '../lib/census'

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
  action: 'add_person' | 'log_moment' | 'open_person' | 'open_setup' | 'open_census'
}

export function nextNudge(state: AppState): Nudge | null {
  if (state.people.length === 0) {
    return {
      id: 'first-star',
      title: 'Populate your sky',
      body: 'Bring in names from your contacts or a quick brain-dump — you review everything before it lands. Or simply place one star: someone you’d call first with big news.',
      actionLabel: 'Set up my sky',
      action: 'open_setup',
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
  // The basics exist — from here, the census keeps offering one creative
  // question at a time until the deck runs dry. Skippable like everything else.
  if (remainingCensusPrompts().length > 0) {
    return {
      id: 'census',
      title: 'A question about your sky',
      body: 'The sky census asks about your communities and the memories you love — a meal you’ll never forget, the hardest you’ve laughed. Each answer adds warmth to a star.',
      actionLabel: 'Draw a card',
      action: 'open_census',
    }
  }
  return null
}

export function GettingStarted({
  onAddPerson,
  onLogMoment,
  onOpenPerson,
  onOpenSetup,
  onOpenCensus,
}: {
  onAddPerson: () => void
  onLogMoment: () => void
  onOpenPerson: (id: string) => void
  onOpenSetup: () => void
  onOpenCensus: () => void
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
    else if (nudge.action === 'open_setup') onOpenSetup()
    else if (nudge.action === 'open_census') onOpenCensus()
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
