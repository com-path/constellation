import { useMemo } from 'react'

// The front door. A first-time visitor should leave this page knowing what
// Constellation believes, what it does, and wanting to step inside. The tour
// takes over from there, on the lived-in example sky.

export const LANDING_DONE_KEY = 'constellation-landing-v1'

interface Star {
  left: number
  top: number
  size: number
  delay: number
  duration: number
}

export function Landing({ onEnter }: { onEnter: () => void }) {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 90 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 6,
        duration: 2.5 + Math.random() * 4,
      })),
    [],
  )

  return (
    <div className="landing" role="dialog" aria-label="About Constellation">
      <div className="landing-stars" aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            className="landing-star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="landing-inner">
        <header className="landing-hero">
          <h1>Constellation</h1>
          <p className="landing-tagline">The people in your life, as a sky worth tending.</p>
          <p className="landing-lede">
            A personal constellation of your friendships — showing not just who you know, but
            how close they are, how they're connected to each other, and what you might do
            next to tend those bonds. You sit at the centre. Everyone else orbits at the
            distance of intimacy, joined by threads of shared history.
          </p>
          <button className="btn landing-cta" onClick={onEnter}>
            ✦ Step into the sky
          </button>
          <p className="hint">
            You'll land in a lived-in example first — explore it, then start your own.
          </p>
        </header>

        <section className="landing-section">
          <h2>What this is — and isn't</h2>
          <p>
            Most tools that promise to help with relationships treat friendship as a pipeline:
            contacts, follow-up dates, last-touched timestamps. Functionally useful,
            emotionally repellent. They make you feel like a salesperson working a book of
            leads. Constellation is built on a different commitment:
          </p>
          <div className="landing-principles">
            <div className="landing-principle">
              <h3>The action, never the person</h3>
              <p>
                Nobody here gets a score. No "relationship health: 62%", no wilting avatars,
                no red badges, no streaks to break. What the sky reflects is your own
                reaching-out — a mirror on your generosity, never a report card on your
                friends.
              </p>
            </div>
            <div className="landing-principle">
              <h3>Rings are closeness. Threads are history.</h3>
              <p>
                People move between orbits as friendships deepen or drift — that part is
                alive. But how you met, who introduced whom, which worlds overlap: that's
                history, and it never decays. The sky holds both truths at once.
              </p>
            </div>
            <div className="landing-principle">
              <h3>The app notices. You decide.</h3>
              <p>
                Constellation might observe that someone seems to be drifting inward, or that
                two of your friends would clearly adore each other. It suggests, with its
                reasons shown. Every decision — every movement, every introduction — is
                yours.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <h2>What it does</h2>
          <ul className="landing-features">
            <li>
              <strong>Holds the texture.</strong> Each star opens into a page for what makes
              thoughtfulness possible: their rituals, the things they love, the hard
              anniversaries almost nobody remembers, what's in motion in their life — so you
              can write the good letter and ask the right question.
            </li>
            <li>
              <strong>Keeps a gentle rhythm.</strong> A quiet weekly nudge with reasons, not
              guilt. Timed reminders — "she's back from the trip in a month". Plans and
              events in one place, and a monthly <em>effort mirror</em>: every act of
              reaching out becomes a meteor across that month's sky.
            </li>
            <li>
              <strong>Builds community, not just contact.</strong> It spots two people who
              don't know each other but obviously should. When your introduction lands, a
              new thread appears between two stars — and you drew it.
            </li>
            <li>
              <strong>Stays yours alone.</strong> Everything lives in your browser. If you
              sign in to sync, your sky is encrypted on your device with a passphrase only
              you know — the server only ever sees ciphertext. Grief anniversaries and
              repair notes are nobody's business but yours.
            </li>
          </ul>
        </section>

        <section className="landing-section landing-final">
          <h2>Sparseness is a feature</h2>
          <p>
            You won't dump 400 contacts into orbit. Bring names in however suits you — pick
            them from your device, brain-dump them in a few lines, or answer the sky census's
            questions about your communities and favourite memories — but nothing lands
            without your say-so, and choosing who belongs is part of the point. Start with
            the person you'd call first with big news, and let the sky grow the way real
            friendship does.
          </p>
          <button className="btn landing-cta" onClick={onEnter}>
            ✦ Begin
          </button>
        </section>

        <p className="landing-foot muted small">
          No account needed to try it. Care is not a KPI.
        </p>
      </div>
    </div>
  )
}
