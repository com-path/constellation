import { useEffect, useState } from 'react'
import type { ViewMode } from '../types'
import { useStore } from '../store/store'
import { useSync } from '../sync/SyncContext'

// First-visit tour. It runs over the lived-in example sky so a new user sees
// what the product feels like *filled out* before they build their own.
// Tone rules apply here more than anywhere: this is the product's handshake.

export const TOUR_DONE_KEY = 'constellation-tour-v1'

interface TourCtx {
  setView: (v: ViewMode) => void
  setSelectedId: (id: string | null) => void
  setMirrorOpen: (open: boolean) => void
}

interface Step {
  title: string
  body: string
  apply: (ctx: TourCtx, demoPersonId: string | null) => void
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Constellation',
    body: 'This is a sky of relationships: you at the centre, every star a person, and the closer they orbit, the closer you are. You’re looking at an example sky, already lived-in, so you can feel how it works before building your own.',
    apply: (ctx) => {
      ctx.setView('closeness')
      ctx.setSelectedId(null)
      ctx.setMirrorOpen(false)
    },
  },
  {
    title: 'The rings',
    body: 'Four orbits — Ride or die, Close and deepening, Good friends, Promising acquaintances — plus an outer field for the people at the edges of life. Rings 2 and 4 shimmer because people there are on their way somewhere. When someone seems to be moving, the app quietly asks; you decide. Nobody is ever scored.',
    apply: (ctx) => {
      ctx.setView('closeness')
      ctx.setSelectedId(null)
    },
  },
  {
    title: 'Tap a star',
    body: 'A star opens into a page: how you met, your shared story, the things they love, the hard anniversaries almost nobody remembers, what’s in motion in their life right now. This is the texture that makes the thoughtful letter — and the right question — possible.',
    apply: (ctx, demoPersonId) => {
      ctx.setView('closeness')
      ctx.setSelectedId(demoPersonId)
    },
  },
  {
    title: 'Log a moment',
    body: 'When you’ve seen someone — a call, a coffee, a hard conversation — press “Log a moment” (top right). Two seconds: who, what kind of moment, done. Moments are things you did; they’re what the sky remembers and what makes stars grow.',
    apply: (ctx) => {
      ctx.setSelectedId(null)
    },
  },
  {
    title: 'Same stars, different questions',
    body: 'The lenses along the top change what the sky emphasises. Network shows where everyone entered your life and who knows whom — the gold threads are introductions you made yourself.',
    apply: (ctx) => {
      ctx.setView('network')
    },
  },
  {
    title: 'Attention',
    body: 'Each week, three people you might reach out to — every one with a reason: an anniversary coming, an interview to ask about, a quiet drift. These are noticings, never obligations. There are no red badges here.',
    apply: (ctx) => {
      ctx.setView('attention')
      ctx.setSelectedId(null)
    },
  },
  {
    title: 'Sparks',
    body: 'The sky can spot two people who don’t know each other but obviously should — and tells you exactly why it thinks so. You make the call and the introduction. When it lands, a new thread appears, drawn by you.',
    apply: (ctx) => {
      ctx.setView('sparks')
      ctx.setSelectedId(null)
    },
  },
  {
    title: 'Events',
    body: 'A spare ticket? A free Saturday? Add it under Events and the sky suggests who’d love it, and why. It works backwards too: pick the people you want to see and it finds the thing you’d all enjoy.',
    apply: (ctx) => {
      ctx.setView('events')
      ctx.setSelectedId(null)
    },
  },
  {
    title: 'The effort mirror',
    body: 'Each month is a sky of its own: every act of reaching out becomes a meteor across it. It’s a record of your generosity — a mirror on yourself, not a scoreboard on your friends. No streaks, nothing to break.',
    apply: (ctx) => {
      ctx.setView('closeness')
      ctx.setMirrorOpen(true)
    },
  },
  {
    title: 'Make it yours',
    body: 'Your real sky starts sparse, and that’s right — choosing who belongs in it is part of the point. Start with one person, add the details that matter as they come to you, and let it grow slowly.',
    apply: (ctx) => {
      ctx.setMirrorOpen(false)
      ctx.setView('closeness')
      ctx.setSelectedId(null)
    },
  },
]

export function Tour({
  ctx,
  onFinish,
}: {
  ctx: TourCtx
  /** startFresh: true when the user chose to clear the demo and begin their own sky. */
  onFinish: (startFresh: boolean) => void
}) {
  const { state, dispatch } = useStore()
  const sync = useSync()
  const [step, setStep] = useState(0)

  // A brand-new signed-in device can arrive with an empty sky; the tour needs
  // the example sky to have anything to show.
  const isEmpty = state.people.length === 0
  const demoPersonId = state.people.some((p) => p.id === 'amara')
    ? 'amara'
    : (state.people[0]?.id ?? null)

  const current = STEPS[step]
  const last = step === STEPS.length - 1

  useEffect(() => {
    current.apply(ctx, demoPersonId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (isEmpty) {
    return (
      <div className="tour-card" role="dialog" aria-label="Welcome tour">
        <h3>Welcome to Constellation</h3>
        <p>
          Your sky is empty — would you like to explore a lived-in example first? It shows
          how everything works, and you can start fresh afterwards.
        </p>
        <div className="tour-actions">
          <button className="btn small" onClick={() => dispatch({ type: 'reset_demo' })}>
            Show me the example sky
          </button>
          <button className="btn small ghost" onClick={() => onFinish(false)}>
            Skip — I’ll find my way
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tour-card" role="dialog" aria-label="Welcome tour">
      <div className="tour-progress" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={`tour-dot ${i === step ? 'tour-dot-on' : ''}`} />
        ))}
      </div>
      <h3>{current.title}</h3>
      <p>{current.body}</p>
      {last && sync.status === 'signed_out' && (
        <p className="hint">
          Tip: sign in first (the ☁ link in the footer) so your sky follows you to any
          device, end-to-end encrypted.
        </p>
      )}
      <div className="tour-actions">
        {!last && (
          <>
            <button className="btn small ghost" onClick={() => onFinish(false)}>
              Skip tour
            </button>
            <span className="tour-spacer" />
            {step > 0 && (
              <button className="btn small ghost" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button className="btn small" onClick={() => setStep(step + 1)} autoFocus>
              Next
            </button>
          </>
        )}
        {last && (
          <>
            <button className="btn small ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
            <span className="tour-spacer" />
            <button className="btn small ghost" onClick={() => onFinish(false)}>
              Explore the demo first
            </button>
            <button className="btn small" onClick={() => onFinish(true)} autoFocus>
              Start my own sky
            </button>
          </>
        )}
      </div>
    </div>
  )
}
