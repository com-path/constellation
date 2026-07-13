/**
 * Demo C — "The Index"
 * Route: /demos/c-index
 *
 * Tokens (scoped in cindex.module.css):
 *   --ix-paper #EFEBE4   cream
 *   --ix-rule  #1A1A1A   hairline rules and body text
 *   --ix-red   #C8442F   the ONE red: duotone screen, accents, annotation
 *   --ix-grey  #8C8C8C   metadata and numbering
 *
 * The one decision that makes it distinct: the page IS an index. An enormous
 * cropped Didone masthead, then a museum-catalogue accordion — every entry a
 * full-width rule with number, title and metadata, expanding in place.
 * Opening an entry is answered entirely by the hand: a red tick draws in the
 * margin and a red arrow sketches toward the revealed text. The single
 * figure is screened into the red (stipple halftone, mis-registered 2px).
 */
import React from 'react'
import s from './cindex.module.css'
import { brand, nav, hero, features, about, footer } from './content'
import {
  Grain,
  Starburst,
  TerminalMark,
  HandCircle,
  HandUnderline,
  HandTick,
  HandArrow,
} from '../components/marks'

/* FIG. 1 — the hero mark screened into the duotone red: a stipple halftone
 * disc (tone built from dots, not a fill), offset 2–3px from the line work
 * as if the red pass slipped in the press */
function DuotoneFigure() {
  return (
    <div className={s.figPlate}>
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <pattern id="ixStipple" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.05" fill="var(--ix-red)" />
          </pattern>
        </defs>
        <g transform="translate(3 2.5)" opacity="0.5">
          <circle cx="150" cy="150" r="118" fill="url(#ixStipple)" />
        </g>
      </svg>
      <Starburst className={`${s.figBurst} ${s.spinSlow}`} strokeWidth={1} />
    </div>
  )
}

type Entry = { no: string; title: string; meta: string; body: string }

function IndexEntry({ e, open, onToggle }: { e: Entry; open: boolean; onToggle: () => void }) {
  return (
    <div className={s.entry}>
      <button
        type="button"
        className={`${s.entryBtn} ${s.annotated} ${open ? s.drawn : ''}`}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={s.entryNo}>{e.no}</span>
        <span className={s.entryTitle}>{e.title}</span>
        <span className={s.entryMeta}>{e.meta}</span>
        <HandTick className={`${s.hand} ${s.handDraw} ${s.entryTick}`} />
      </button>
      {open && (
        <div className={s.entryBody}>
          <HandArrow className={`${s.entryArrow} ${s.drawOnMount}`} />
          <p className={s.entryText}>{e.body}</p>
        </div>
      )}
    </div>
  )
}

export default function CIndex() {
  const [open, setOpen] = React.useState<Set<number>>(() => new Set([0]))
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const entries: Entry[] = [
    ...features.map((f, i) => ({
      no: `0${i + 1}`,
      title: f.title,
      meta: 'feature',
      body: f.body,
    })),
    { no: '04', title: about.title, meta: 'principle', body: about.body },
  ]

  return (
    <div className={s.page}>
      <Grain opacity={0.05} />

      <div className={s.content}>
        <div className={s.wrap}>
          <header className={s.masthead}>
            <a className={s.mastLink} href="/demos">
              {brand}
              <span className={s.mastSuffix}> — index of the sky</span>
            </a>
            <nav style={{ display: 'flex', gap: 26 }}>
              {nav.map((n) => (
                <a key={n} className={`${s.mastLink} ${s.annotated}`} href="#">
                  {n}
                  <HandUnderline className={`${s.hand} ${s.handDraw} ${s.underMark}`} />
                </a>
              ))}
            </nav>
            <span className={s.plateVoice}>pl. C — MMXXVI</span>
          </header>
        </div>
        <hr className={s.rule} />

        {/* the display voice — permitted to crop off the edge of the viewport */}
        <div className={s.displayClip}>
          <h1 className={s.displayWord} aria-label={brand}>
            {brand}
          </h1>
        </div>

        <div className={s.wrap}>
          <section className={s.heroRow}>
            <div>
              <span className={`${s.plateVoice} ${s.heroKicker}`}>
                <TerminalMark size={18} />
                no. 00 — {hero.kicker}
              </span>
              <p className={s.headline}>{hero.headline}</p>
              <p className={s.subhead}>{hero.subhead}</p>
              <div className={s.ctaRow}>
                <a className={`${s.ctaPrimary} ${s.annotated}`} href="#" style={{ position: 'relative' }}>
                  {hero.cta}
                  <HandCircle className={`${s.hand} ${s.ctaCircle}`} />
                </a>
                <a className={`${s.ctaSecondary} ${s.annotated}`} href="#" style={{ position: 'relative' }}>
                  {hero.ctaSecondary}
                  <HandUnderline className={`${s.hand} ${s.handDraw} ${s.underMark}`} />
                </a>
              </div>
            </div>
            <figure className={s.figure} style={{ margin: 0 }}>
              <span className={s.plateVoice}>fig. 1 — the sky, screened</span>
              <DuotoneFigure />
              <figcaption className={`${s.plateVoice} ${s.figCaption}`}>
                <span>radiating burst, one ink</span>
                <span>scale 1:1</span>
              </figcaption>
            </figure>
          </section>
        </div>

        <div className={s.wrap}>
          <div className={s.indexHead}>
            <span className={s.plateVoice}>the index — expand in place</span>
            <span className={s.plateVoice}>entries 01–04</span>
          </div>
          {entries.map((e, i) => (
            <IndexEntry key={e.no} e={e} open={open.has(i)} onToggle={() => toggle(i)} />
          ))}
          <hr className={s.rule} />
        </div>

        <div className={s.wrap}>
          <footer className={s.footer}>
            <span className={s.footerLine}>
              {brand} — {footer.line}
            </span>
            <nav className={s.footerLinks}>
              {footer.links.map((l) => (
                <a key={l.href} className={s.footerLink} href={l.href}>
                  <TerminalMark size={18} />
                  {l.label}
                </a>
              ))}
            </nav>
          </footer>
        </div>
      </div>
    </div>
  )
}
